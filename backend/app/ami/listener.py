"""
backend/app/ami/listener.py
───────────────────────────
Asterisk AMI event listener — panoramisk tabanlı.

Dinlenen event'ler
──────────────────
  Newchannel        → kanal açıldı, aktif çağrı state'e eklendi
  Hangup            → kanal kapandı, CDR yazıldı
  Bridge            → iki kanal köprülendi (çağrı cevaplandı)
  QueueCallerJoin   → arayan kuyruğa girdi
  QueueCallerLeave  → arayan kuyruktan ayrıldı
  AgentCalled       → ajan zili çalıyor
  AgentConnect      → ajan çağrıyı yanıtladı
  AgentComplete     → ajan çağrıyı bitirdi
  QueueMemberStatus → Asterisk DeviceState tabanlı üye durum değişikliği

Mimari notlar
─────────────
- _active_calls: asyncio single-thread'de çalıştığından dict thread-safe
- _ext_cache   : dahili_no → UUID önbelleği, uygulama ömrü boyunca tutulur
- panoramisk Manager.connect() asenkron DEĞİL; arka planda asyncio Task
  oluşturur ve bağlantıyı/auth'u event loop üzerinden yönetir.
  Bağlantı kesilirse Manager otomatik yeniden bağlanır (reconnect_timeout).
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from panoramisk import Manager
from sqlalchemy import select, update

from app.core.config import settings
from app.db.async_session import AsyncSessionLocal
from app.models.cdr import CDR
from app.models.user import User

try:
    from app.api.queue import broadcast_event
except ImportError:
    broadcast_event = None

logger = logging.getLogger(__name__)

# ─── Enum değer eşlemeleri ───────────────────────────────────────────────────
# DB'deki durum_personel enum: 'aktif' | 'mola' | 'mesgul' | 'offline'
# Listener bazı iç durumlar üretir (konusmada, zil_caliyor, musait) — bunları
# geçerli enum değerlerine çevir.
_DURUM_PERSONEL: dict[str, str] = {
    "aktif":       "aktif",
    "konusmada":   "aktif",    # çağrıdayken aktif sayılır
    "zil_caliyor": "aktif",    # zil çalarken de aktif
    "mesgul":      "mesgul",
    "mola":        "mola",
    "musait":      "offline",  # müsait/boşta → offline (enum'da 'musait' yok)
    "offline":     "offline",
}

# DB'deki durum_cagri enum: 'cevaplandi' | 'aktarildi' | 'cevaplanmadi'
#                           | 'mesgul' | 'baglaniyor' | 'devam_ediyor'
_DURUM_CAGRI: dict[str, str] = {
    "cevaplandi":   "cevaplandi",
    "cevaplanmadi": "cevaplanmadi",
    "mesgul":       "mesgul",
    "aktarildi":    "aktarildi",
    "baglaniyor":   "baglaniyor",
    "devam_ediyor": "devam_ediyor",
}

# ─── Uygulama geneli paylaşılan state ────────────────────────────────────────

# channel adı → çağrı metadata
_active_calls: dict[str, dict] = {}

# dahili_no → user UUID (None = veritabanında yok)
_ext_cache: dict[str, Optional[uuid.UUID]] = {}

# dahili_no → son bilinen durum (veritabanına yazılmayı bekleyen)
_pending_status_updates: dict[str, str] = {}

_manager: Optional[Manager] = None
_status_writer_task: Optional[asyncio.Task] = None


def get_active_calls() -> dict:
    """
    Anlık aktif çağrıların bir kopyasını döner.
    WebSocket endpoint'leri veya /queue API bu fonksiyonu kullanabilir.
    """
    return dict(_active_calls)


def get_manager() -> Optional[Manager]:
    """Panoramisk Manager nesnesini döner (test / dış entegrasyon için)."""
    return _manager


# ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

def _parse_extension(channel: str) -> str:
    """
    Asterisk kanal adından dahili numarayı çıkart.

    Örnekler:
        'SIP/1001-0000001a'               → '1001'
        'PJSIP/1002-ab12ef'               → '1002'
        'Local/1001@from-internal-xfer;1' → '1001'
    """
    if not channel:
        return ""
    try:
        _, rest = channel.split("/", 1)
        ext = rest.split("-")[0].split("@")[0].split(";")[0].strip()
        # DAHDI trunk gibi kanallar geri kalanında '/' içerir → dahili no değil
        return "" if "/" in ext else ext
    except ValueError:
        return ""


async def _resolve_user_id(extension: str) -> Optional[uuid.UUID]:
    """
    Dahili numarasından kullanıcı UUID'sini çöz (in-memory önbellekli).
    Veritabanında karşılık yoksa None döner ve None önbelleğe alınır.
    """
    if not extension:
        return None
    if extension in _ext_cache:
        return _ext_cache[extension]
    try:
        async with AsyncSessionLocal() as db:
            uid: Optional[uuid.UUID] = await db.scalar(
                select(User.id).where(User.dahili_no == extension).limit(1)
            )
            _ext_cache[extension] = uid
            return uid
    except Exception as exc:
        logger.warning("Extension %s → user_id çözümlenemedi: %s", extension, exc)
        return None


def _update_agent_status(extension: str, durum: str) -> None:
    """
    Kullanıcının durumunu veritabanına yazmak üzere sıraya alır.
    Doğrudan veritabanı işlemi yapmaz, sadece in-memory sözlüğü günceller.
    Bu fonksiyon artık `async` DEĞİLDİR ve `await` edilmez.
    """
    if not extension:
        return
    # İç durumu DB enum'ına çevir; bilinmeyen değer → 'offline'
    db_durum = _DURUM_PERSONEL.get(durum, "offline")
    _pending_status_updates[extension] = db_durum


async def _status_writer_loop() -> None:
    """
    Bekleyen durum güncellemelerini periyodik olarak veritabanına yazar.
    Bu coroutine, uygulama başladığında bir arka plan task'ı olarak çalışır.
    """
    while True:
        await asyncio.sleep(2)  # Her 2 saniyede bir yazmayı dene
        if not _pending_status_updates:
            continue

        # O anki bekleyen güncellemelerin bir kopyasını al ve orijinalini temizle
        updates_to_process = dict(_pending_status_updates)
        _pending_status_updates.clear()

        try:
            async with AsyncSessionLocal() as db:
                # Tek bir oturum içinde tüm güncellemeleri yap
                for extension, durum in updates_to_process.items():
                    await db.execute(
                        update(User)
                        .where(User.dahili_no == extension)
                        .values(anlik_durum=durum)
                    )
                await db.commit()
                logger.info("%d adet bekleyen durum güncellemesi yazıldı.", len(updates_to_process))
        except Exception as exc:
            logger.error("Durum güncellemeleri toplu yazılamadı: %s", exc)
            # Başarısız olanları bir sonraki döngüde denemek için geri ekle
            # (Basit bir strateji, daha gelişmiş bir mekanizma kurulabilir)
            _pending_status_updates.update(updates_to_process)


async def _write_cdr(data: dict) -> None:
    """Tamamlanan çağrı için 'cagri_kayitlari' tablosuna satır yaz."""
    start    = data.get("start_time") or datetime.now(timezone.utc)
    end      = data.get("end_time")   or datetime.now(timezone.utc)
    answered = data.get("answer_time")

    if answered:
        konusma   = max(0, int((end - answered).total_seconds()))
        bekleme   = max(0, int((answered - start).total_seconds()))
        raw_durum = "cevaplandi"
    else:
        konusma   = 0
        bekleme   = max(0, int((end - start).total_seconds()))
        cause     = (data.get("cause_txt") or "").lower()
        raw_durum = "mesgul" if "busy" in cause else "cevaplanmadi"

    # DB enum'ına çevir (güvenli fallback: cevaplanmadi)
    yon_db   = data.get("direction", "gelen")
    durum_db = _DURUM_CAGRI.get(raw_durum, "cevaplanmadi")

    cdr = CDR(
        id               = uuid.uuid4(),
        asterisk_id      = data.get("uniqueid", ""),
        user_id          = data.get("user_id"),   # uuid.UUID veya None
        yon              = yon_db,
        durum            = durum_db,
        kategori         = None,   # NULL — boş string CHECK kısıtını ihlal eder
        baslangic_zamani = start,
        bitis_zamani     = end,
        konusma_suresi   = konusma,
        bekleme_suresi   = bekleme,
        ses_kaydi_url    = None,   # "" yerine NULL — güvenli
        ivr_yolu         = None,
    )
    try:
        async with AsyncSessionLocal() as db:
            # asterisk_id UNIQUE kısıtı: aynı çağrı iki kez gelirse sessizce atla
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(CDR.__table__).values(
                id               = cdr.id,
                asterisk_id      = cdr.asterisk_id,
                user_id          = cdr.user_id,
                yon              = cdr.yon,
                durum            = cdr.durum,
                kategori         = cdr.kategori,
                baslangic_zamani = cdr.baslangic_zamani,
                bitis_zamani     = cdr.bitis_zamani,
                konusma_suresi   = cdr.konusma_suresi,
                bekleme_suresi   = cdr.bekleme_suresi,
                ses_kaydi_url    = cdr.ses_kaydi_url,
                ivr_yolu         = cdr.ivr_yolu,
            ).on_conflict_do_nothing(index_elements=["asterisk_id"])
            await db.execute(stmt)
            await db.commit()
        logger.info(
            "CDR ✓  asterisk_id=%-24s yon=%-5s durum=%-14s konuşma=%ds",
            cdr.asterisk_id, cdr.yon, cdr.durum, cdr.konusma_suresi,
        )
    except Exception as exc:
        logger.error("CDR yazılamadı: %s", exc, exc_info=True)


# ─── AMI Event Handler'ları ──────────────────────────────────────────────────
# Panoramisk dispatch() coroutine'leri asyncio.ensure_future() ile sarmalar,
# bu yüzden tüm handler'lar 'async def' olarak tanımlanabilir.

async def on_newchannel(manager, event) -> None:
    logger.warning("RAW Newchannel: ch=%s caller=%s exten=%s ctx=%s",
                   event.get("Channel", ""), event.get("CallerIDNum", ""),
                   event.get("Exten", ""), event.get("Context", ""))

    channel  = event.get("Channel", "")
    uniqueid = event.get("Uniqueid", "")
    caller   = event.get("CallerIDNum", "")
    exten    = event.get("Exten", "")
    context  = event.get("Context", "")

    if not channel or not uniqueid:
        logger.warning("Newchannel atlandı: channel=%r uniqueid=%r", channel, uniqueid)
        return

    _OUTBOUND_CONTEXTS = {"from-internal", "from-internal-xfer", "default"}
    direction = "giden" if context in _OUTBOUND_CONTEXTS else "gelen"

    # Dış hat çağrılarında veya TELSAM gibi operatör kanallarında extension atanmaz.
    # Aksi takdirde split mantığıyla kanaldan (örn: PJSIP/1001) dahili ayıklanır.
    if context == "from-pstn" or "TELSAM" in channel:
        extension = ""
    else:
        extension = _parse_extension(channel)

    user_id = await _resolve_user_id(extension)

    _active_calls[channel] = {
        "uniqueid":    uniqueid,
        "channel":     channel,
        "caller":      caller,
        "exten":       exten,
        "direction":   direction,
        "extension":   extension,
        "start_time":  datetime.now(timezone.utc),
        "answer_time": None,
        "end_time":    None,
        "user_id":     user_id,
        "queue":       None,
        "cause_txt":   "",
    }
    logger.warning("↗ Newchannel  ch=%-28s caller=%-12s exten=%-8s ctx=%s",
                 channel, caller, exten, context)
    if extension:
        _update_agent_status(extension, "aktif")


async def on_hangup(manager, event) -> None:
    channel   = event.get("Channel", "")
    # Asterisk header: "Cause-txt" (tire ile) veya "CauseTxt" (panoramisk normalise)
    cause_txt = event.get("Cause-txt", "") or event.get("CauseTxt", "")

    data = _active_calls.pop(channel, None)
    if data is None:
        try:
            event_dump = {k: str(v) for k, v in event.items()} if hasattr(event, "items") else str(event)
        except Exception:
            event_dump = str(event)
            
        logger.warning(
            "Hayalet Çağrı (Hangup): Kapatılmak istenen kanal aktif çağrılar listesinde bulunamadı! channel=%r, event_dump=%s",
            channel,
            event_dump
        )
        return

    data["end_time"]  = datetime.now(timezone.utc)
    data["cause_txt"] = cause_txt

    logger.warning("↙ Hangup     ch=%-28s cause=%s", channel, cause_txt)
    await _write_cdr(data)

    ext = data.get("extension", "")
    if ext:
        _update_agent_status(ext, "musait")


async def on_bridge(manager, event) -> None:
    """İki kanal köprülendiğinde çağrı cevaplandı sayılır."""
    ch1 = event.get("Channel1", "")
    ch2 = event.get("Channel2", "")
    now = datetime.now(timezone.utc)

    for ch in (ch1, ch2):
        if ch in _active_calls and _active_calls[ch]["answer_time"] is None:
            _active_calls[ch]["answer_time"] = now
            ext = _active_calls[ch].get("extension", "")
            if ext:
                _update_agent_status(ext, "konusmada")
    logger.debug("⇌ Bridge     ch1=%-22s ch2=%s", ch1, ch2)


async def on_queue_caller_join(manager, event) -> None:
    channel = event.get("Channel", "")
    queue   = event.get("Queue", "")
    if channel in _active_calls:
        _active_calls[channel]["queue"] = queue
    logger.debug("→ QCJoin    ch=%-28s queue=%s", channel, queue)


async def on_queue_caller_leave(manager, event) -> None:
    channel = event.get("Channel", "")
    queue   = event.get("Queue", "")
    logger.debug("← QCLeave   ch=%-28s queue=%s", channel, queue)


async def on_agent_called(manager, event) -> None:
    """Kuyruktan bir ajana çağrı yönlendiriliyor."""
    agent_ch = event.get("AgentCalled", "") or event.get("Channel", "")
    ext      = _parse_extension(agent_ch)
    logger.debug("📞 AgentCalled  ext=%s  ch=%s", ext, agent_ch)
    if ext:
        _update_agent_status(ext, "zil_caliyor")


async def on_agent_connect(manager, message) -> None:
    """Ajan çağrıyı yanıtladı."""
    if hasattr(message, "headers"):
        event = dict(message.headers)
    elif isinstance(message, dict):
        event = message
    else:
        try:
            event = dict(message)
        except Exception:
            event = {k: getattr(message, k) for k in dir(message) if not k.startswith("_")}
            
    # Güvenli JSON serileştirmesi için değerleri string formata çeviriyoruz
    event = {k: str(v) for k, v in event.items()}

    channel = event.get("Channel", "")
    ext     = _parse_extension(channel)
    now     = datetime.now(timezone.utc)

    if channel in _active_calls and _active_calls[channel]["answer_time"] is None:
        _active_calls[channel]["answer_time"] = now

    logger.debug("✅ AgentConnect  ext=%s  ch=%s", ext, channel)
    if ext:
        _update_agent_status(ext, "konusmada")

    # Front-end'e WebSocket üzerinden gerçek zamanlı AgentConnect bildirimi gönder
    if broadcast_event and channel in _active_calls:
        call_info = _active_calls[channel]
        broadcast_event({
            "event": "AgentConnect",
            "extension": ext,
            "callerid": call_info.get("caller", ""),
            "callerName": call_info.get("callerName", "Bilinmeyen"),
            "uniqueid": call_info.get("uniqueid", ""),
            "queueName": call_info.get("queue", "Kuyruk"),
            "raw": {k: str(v) for k, v in event.items()},
        })


async def on_agent_complete(manager, event) -> None:
    """Ajan kuyruk çağrısını tamamladı."""
    channel = event.get("Channel", "") or event.get("AgentChannel", "")
    ext     = _parse_extension(channel)
    logger.debug("🔚 AgentComplete ext=%s  ch=%s", ext, channel)
    if ext:
        _update_agent_status(ext, "musait")

async def on_new_state(manager, event) -> None:
    # 'Up' durumu çağrının açıldığını (yanıtlandığını) ifade eder
    if event.get('ChannelStateDesc') == 'Up':
        print(f"🚀 ÇAĞRI YANITLANDI! Event Data: {dict(event)}")
        
        # Frontend'e göndermek için event verisi oluştur
        broadcast_data = {
            "event": "AgentConnect",
            "callerid": event.get('CallerIDNum') or event.get('CallerID', ''),
            "extension": event.get('ConnectedLineNum') or _parse_extension(event.get('Channel', '')),
            "uniqueid": event.get('Uniqueid', '')
        }
        
        if broadcast_event:
            broadcast_event(broadcast_data)


async def on_queue_member_status(manager, event) -> None:
    """
    Asterisk DeviceState tabanlı kuyruk üyesi durum bildirimi.
    Kaynak: https://wiki.asterisk.org/wiki/display/AST/Asterisk+12+AMI+Events
    """
    interface = event.get("Interface", "")
    try:
        status = int(event.get("Status", 0))
    except (ValueError, TypeError):
        return

    # Asterisk queue member status kodları → durum_personel enum değerleri
    STATUS_MAP: dict[int, str] = {
        0: "offline",   # Unknown
        1: "offline",   # Not in use  (müsait → offline, enum'da 'musait' yok)
        2: "aktif",     # In use
        3: "mesgul",    # Busy
        4: "offline",   # Invalid
        5: "offline",   # Unavailable
        6: "aktif",     # Ringing     (zil çalıyor → aktif)
        7: "aktif",     # Ring+InUse
        8: "mola",      # On hold
    }
    ext   = _parse_extension(interface)
    durum = STATUS_MAP.get(status, "offline")
    logger.debug("👥 QMStatus  ext=%-12s durum=%-14s (status=%d)", ext, durum, status)
    if ext:
        _update_agent_status(ext, durum)


# ─── Başlatma / Durdurma ─────────────────────────────────────────────────────

async def start_ami_listener() -> None:
    global _manager, _status_writer_task

    ami_host = (settings.AMI_HOST or "").strip()
    ami_user = (settings.AMI_USER or "").strip()

    if not ami_host or not ami_user:
        logger.info("AMI_HOST veya AMI_USER boş — AMI devre dışı.")
        return

    try:
        loop = asyncio.get_running_loop()
        _status_writer_task = loop.create_task(_status_writer_loop())

        _manager = Manager(
            host=settings.AMI_HOST,
            port=settings.AMI_PORT,
            username=settings.AMI_USER,
            secret=settings.AMI_SECRET,
            ssl=False,
            encoding="utf-8",
            loop=loop,
            ping_delay=10,
            ping_interval=10,
            reconnect_timeout=5,
        )

        _manager.register_event("Newchannel", on_newchannel)
        _manager.register_event("Hangup", on_hangup)
        _manager.register_event("Bridge", on_bridge)
        _manager.register_event("QueueCallerJoin", on_queue_caller_join)
        _manager.register_event("QueueCallerLeave", on_queue_caller_leave)
        _manager.register_event("AgentCalled", on_agent_called)
        _manager.register_event("AgentConnect", on_agent_connect)
        _manager.register_event("AgentComplete", on_agent_complete)
        _manager.register_event("QueueMemberStatus", on_queue_member_status)

        _manager.connect()

        # Bağlantının kurulması için bekle
        await asyncio.sleep(3)

        # Ping ile doğrula
        try:
            response = await _manager.send_action({"Action": "Ping"})
            logger.info("AMI Ping başarılı: %s", response)
        except Exception as e:
            logger.warning("AMI Ping başarısız: %s", e)

        logger.info("AMI bağlantısı başlatıldı → %s:%d (kullanıcı: %s)",
                    settings.AMI_HOST, settings.AMI_PORT, settings.AMI_USER)

    except Exception as exc:
        logger.warning("AMI başlatılamadı: %s", exc)
        _manager = None


async def stop_ami_listener() -> None:
    """Uygulama kapatılırken AMI bağlantısını ve arka plan görevlerini düzgünce sonlandır."""
    global _manager, _status_writer_task
    if _status_writer_task:
        _status_writer_task.cancel()
        try:
            await _status_writer_task
        except asyncio.CancelledError:
            pass  # İptal edilmesi normal
        _status_writer_task = None
        logger.info("AMI durum yazma görevi durduruldu.")

    if _manager is not None:
        try:
            _manager.close()
        except Exception:
            pass
        _manager = None
        logger.info("AMI bağlantısı kapatıldı.")
