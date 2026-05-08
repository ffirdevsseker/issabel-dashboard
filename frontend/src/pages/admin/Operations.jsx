/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · CANLI OPERASYON (WAR ROOM)  (/admin/operations)
   ────────────────────────────────────────────────────────────────────────────
   Kapsam   : SADECE Müşteri Hizmetleri departmanı
   Paneller : A) Canlı Çağrı Radarı (aktif görüşmeler)
              B) Kuyruk Monitörü    (kuyrukta bekleyenler)
              C) Personel Radarı    (ekip filtreli anlık durum)
   Veri     : Gerçek DB – 5 sn poll + 1 sn tick
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Ear,
  Headphones,
  Minus,
  Plus,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import { warRoomApi } from "@/services/api";
import { useAuth }    from "@/context/AuthContext";
import { Panel }      from "@/pages/admin/Overview";

const POLL_MS = 5_000;

/* ─── Statü renk haritası ────────────────────────────────────────────────── */
const D = {
  aktif:   { label: "Aktif",   color: "#10b981", bg: "rgba(16,185,129,0.09)" },
  mesgul:  { label: "Meşgul",  color: "#3b82f6", bg: "rgba(59,130,246,0.09)" },
  mola:    { label: "Mola",    color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
  offline: { label: "Offline", color: "#94a3b8", bg: "rgba(148,163,184,0.09)" },
};

const SIP_COLOR = {
  kayitli: "#10b981",
  mesgul:  "#3b82f6",
  koptu:   "#ef4444",
};

/* ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────── */
function fmtDur(sn) {
  if (sn < 0) sn = 0;
  const h  = Math.floor(sn / 3600);
  const m  = Math.floor((sn % 3600) / 60);
  const s  = sn % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtSn(sn) {
  if (sn == null || sn <= 0) return "0sn";
  if (sn < 60) return `${Math.round(sn)}sn`;
  const m = Math.floor(sn / 60);
  const s = Math.round(sn % 60);
  return s > 0 ? `${m}d ${s}sn` : `${m}d`;
}

function nowHMS() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
function StatusBadge({ durum }) {
  const d = D[durum] || D.offline;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
      color: d.color, background: d.bg, border: `1px solid ${d.color}30`,
      borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      {d.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   A. CANLI ÇAĞRI RADARI — aktif görüşmeler (mesgul personel)
════════════════════════════════════════════════════════════════════════════ */
function ActiveCallsPanel({ calls, nowMs, isAdmin, onAction }) {
  const cols = isAdmin ? "1fr 1fr 130px 88px 70px" : "1fr 1fr 130px 88px";
  const hdrs = isAdmin
    ? ["Müşteri / Numara", "Personel", "Kuyruk", "Süre", ""]
    : ["Müşteri / Numara", "Personel", "Kuyruk", "Süre"];

  return (
    <Panel title="📡 Canlı Çağrı Radarı" accentColor="#3b82f6" badge={calls.length}>
      {calls.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Şu an aktif görüşme yok
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>

          {/* Başlık satırı */}
          <div style={{
            display: "grid", gridTemplateColumns: cols,
            gap: 8, padding: "6px 10px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}>
            {hdrs.map((h, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700, color: "#94a3b8",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{h}</div>
            ))}
          </div>

          {/* Veri satırları */}
          {calls.map((c) => {
            const elapsed  = c.baslangic_zamani
              ? Math.floor((nowMs - new Date(c.baslangic_zamani)) / 1000)
              : (c.sure_sn || 0);
            const longCall = elapsed >= 900;

            return (
              <div
                key={c.id}
                style={{
                  display: "grid", gridTemplateColumns: cols,
                  gap: 8, padding: "9px 10px",
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                  alignItems: "center",
                  background: longCall ? "rgba(239,68,68,0.04)" : "transparent",
                  borderLeft: longCall ? "3px solid #ef4444" : "3px solid transparent",
                }}
              >
                {/* Müşteri / Numara */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#0f172a",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {c.musteri_ad || c.arayan_numara || "—"}
                  </div>
                  {c.musteri_ad && c.arayan_numara && c.arayan_numara !== "—" && (
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>
                      {c.arayan_numara}
                    </div>
                  )}
                </div>

                {/* Personel */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#0f172a",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {c.personel_ad || "—"}
                  </div>
                  {c.dahili_no && (
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>
                      ·{c.dahili_no}
                      {c.ekip_adi && c.ekip_adi !== "—" && (
                        <span style={{ marginLeft: 4 }}>· {c.ekip_adi}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Kuyruk */}
                <div style={{
                  fontSize: 11, color: "#475569",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {c.kuyruk_adi || "—"}
                </div>

                {/* Canlı Süre */}
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: longCall ? "#ef4444" : "#3b82f6",
                  whiteSpace: "nowrap",
                }}>
                  {fmtDur(elapsed)}
                </div>

                {/* Aksiyon (admin only) */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      title="🎧 Dinle (Whisper)"
                      onClick={() => onAction(c.id, "whisper")}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: "1px solid rgba(59,130,246,0.3)",
                        background: "rgba(59,130,246,0.08)", color: "#3b82f6",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Ear size={12} />
                    </button>
                    <button
                      title="🎙️ Müdahale (Barge)"
                      onClick={() => onAction(c.id, "barge")}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: "1px solid rgba(245,158,11,0.3)",
                        background: "rgba(245,158,11,0.08)", color: "#f59e0b",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Headphones size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   B. KUYRUK MONİTÖRÜ
════════════════════════════════════════════════════════════════════════════ */
function QueueCard({ q, onCapacityChange }) {
  const kapYuzde = q.max_kapasite > 0
    ? Math.min(100, Math.round((q.bekleyen_sayi / q.max_kapasite) * 100))
    : 0;
  const barColor = kapYuzde >= 80 ? "#ef4444" : kapYuzde >= 50 ? "#f59e0b" : "#10b981";

  return (
    <div
      className={q.kritik ? "queue-pulse" : ""}
      style={{
        background: "#fff",
        border: `1px solid ${q.kritik ? "rgba(239,68,68,0.45)" : "rgba(0,0,0,0.07)"}`,
        borderTop: `2px solid ${q.kritik ? "#ef4444" : "#f59e0b"}`,
        borderRadius: 14, padding: "14px 16px",
        minWidth: 220, flex: "1 1 220px",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      {/* Başlık */}
      <div style={{
        fontSize: 13, fontWeight: 800, color: "#0f172a",
        display: "flex", alignItems: "center", gap: 7,
      }}>
        {q.kuyruk_adi}
        {q.kritik && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: "#ef4444",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 4, padding: "1px 5px", letterSpacing: "0.06em",
          }}>KRİTİK</span>
        )}
      </div>

      {/* 2×2 metrik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { lbl: "Bekleyen",   val: q.bekleyen_sayi,          color: q.bekleyen_sayi > 5 ? "#ef4444" : "#0f172a" },
          { lbl: "Maks Bekl.", val: fmtSn(q.max_bekleme_sn),  color: q.max_bekleme_sn >= 45 ? "#ef4444" : "#f59e0b" },
          { lbl: "Ort Bekl.",  val: fmtSn(q.ort_bekleme_sn),  color: "#475569" },
          { lbl: "Kapasite",   val: `${q.bekleyen_sayi}/${q.max_kapasite}`, color: "#475569" },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{
            background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)",
            borderRadius: 8, padding: "7px 10px",
          }}>
            <div style={{
              fontSize: 15, fontWeight: 800, color,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>{val}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Doluluk çubuğu */}
      <div style={{ height: 4, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          width: `${kapYuzde}%`, height: "100%", background: barColor,
          borderRadius: 3, transition: "width 0.4s ease",
        }} />
      </div>

      {/* Kapasite stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <button
          onClick={() => onCapacityChange(q.id, q.max_kapasite - 1)}
          disabled={q.max_kapasite <= 1}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.1)",
            background: q.max_kapasite <= 1 ? "#f1f5f9" : "#fff",
            color: q.max_kapasite <= 1 ? "#cbd5e1" : "#475569",
            cursor: q.max_kapasite <= 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        ><Minus size={11} /></button>

        <span style={{
          fontSize: 13, fontWeight: 800, color: "#0f172a",
          minWidth: 36, textAlign: "center", fontVariantNumeric: "tabular-nums",
        }}>{q.max_kapasite}</span>

        <button
          onClick={() => onCapacityChange(q.id, q.max_kapasite + 1)}
          disabled={q.max_kapasite >= 200}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.1)",
            background: q.max_kapasite >= 200 ? "#f1f5f9" : "#fff",
            color: q.max_kapasite >= 200 ? "#cbd5e1" : "#475569",
            cursor: q.max_kapasite >= 200 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        ><Plus size={11} /></button>

        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginLeft: 2 }}>maks</span>
      </div>
    </div>
  );
}

function QueuesPanel({ queues, onCapacityChange }) {
  return (
    <Panel title="Kuyruk Monitörü" accentColor="#f59e0b" badge={queues.length}>
      {queues.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Aktif kuyruk bulunamadı
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {queues.map((q) => (
            <QueueCard key={q.id} q={q} onCapacityChange={onCapacityChange} />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   C. PERSONEL RADARI — Ekip odaklı filtre + durum vurgusu
════════════════════════════════════════════════════════════════════════════ */
function TeamFilterTabs({ teams, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 5, flexWrap: "wrap",
      padding: "10px 16px 8px",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      background: "#fafbff",
    }}>
      {teams.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            fontSize: 10.5, fontWeight: 700,
            padding: "4px 10px", borderRadius: 6,
            cursor: "pointer", whiteSpace: "nowrap",
            border: active === t
              ? "1.5px solid #8b5cf6"
              : "1px solid rgba(0,0,0,0.08)",
            background: active === t
              ? "rgba(139,92,246,0.1)"
              : "#ffffff",
            color: active === t ? "#8b5cf6" : "#64748b",
            transition: "all 0.12s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function StaffRow({ s }) {
  const d     = D[s.anlik_durum] || D.offline;
  const sipC  = SIP_COLOR[s.sip_durumu] || "#94a3b8";
  const initials = (s.ad_soyad || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={s.mola_asimi ? "mola-alarm" : ""}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px",
        borderBottom: "1px solid rgba(0,0,0,0.03)",
        background: s.mola_asimi ? "rgba(254,226,226,0.55)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: d.bg, border: `1.5px solid ${d.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: d.color, flexShrink: 0,
      }}>
        {initials}
      </div>

      {/* Ad + dahili + unvan */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#0f172a",
            whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", maxWidth: 130,
          }}>
            {s.ad_soyad}
          </span>
          {s.mola_asimi && (
            <span style={{
              fontSize: 8, fontWeight: 800, color: "#ef4444",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 3, padding: "1px 4px",
              letterSpacing: "0.06em", flexShrink: 0,
            }}>AŞIM</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 1 }}>
          {[s.dahili_no && `·${s.dahili_no}`, s.unvan].filter(Boolean).join("  ")}
        </div>
      </div>

      {/* Statü badge */}
      <StatusBadge durum={s.anlik_durum} />

      {/* SIP göstergesi */}
      <div title={`SIP: ${s.sip_durumu}`} style={{ flexShrink: 0 }}>
        {s.sip_durumu === "koptu"
          ? <WifiOff size={12} color="#ef4444" />
          : <Wifi size={12} color={sipC} />}
      </div>
    </div>
  );
}

function StaffPanel({ staff }) {
  const teams = ["Tümü", ...Array.from(
    new Set(staff.map((s) => s.ekip_ad).filter(Boolean))
  ).sort()];

  const [activeTeam, setActiveTeam] = useState("Tümü");

  const filtered = activeTeam === "Tümü"
    ? staff
    : staff.filter((s) => s.ekip_ad === activeTeam);

  /* Tümü modunda ekiplere göre grupla, tekil ekip modunda düz liste */
  const groups = activeTeam === "Tümü"
    ? teams.slice(1).reduce((acc, team) => {
        const members = filtered.filter((s) => s.ekip_ad === team);
        if (members.length) acc.push({ team, members });
        return acc;
      }, [
        ...( filtered.filter((s) => !s.ekip_ad).length
             ? [{ team: "—", members: filtered.filter((s) => !s.ekip_ad) }]
             : [] ),
      ])
    : [{ team: activeTeam, members: filtered }];

  const onlineCount = staff.filter(
    (s) => s.anlik_durum === "aktif" || s.anlik_durum === "mesgul"
  ).length;

  return (
    <Panel
      title="Personel Radarı"
      accentColor="#8b5cf6"
      badge={`${onlineCount}/${staff.length}`}
      stretch
      noPad
    >
      <TeamFilterTabs teams={teams} active={activeTeam} onChange={setActiveTeam} />

      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
            Bu ekipte personel bulunamadı
          </div>
        ) : (
          groups.map(({ team, members }) => (
            <div key={team}>
              {/* Ekip grup başlığı */}
              <div style={{
                padding: "7px 16px 4px",
                fontSize: 9, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#8b5cf6",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(139,92,246,0.03)",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#8b5cf6", display: "inline-block", flexShrink: 0,
                }} />
                {team}
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>({members.length})</span>
              </div>

              {members.map((s) => <StaffRow key={s.id} s={s} />)}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   D. ALERT TICKER
════════════════════════════════════════════════════════════════════════════ */
function AlertTicker({ staff, queues, calls, nowMs }) {
  const msgs = [];

  staff.forEach((s) => {
    if (s.mola_asimi)        msgs.push(`⏰ ${s.ad_soyad} — mola süresi aşıldı`);
    if (s.sip_durumu === "koptu") msgs.push(`📡 ${s.ad_soyad} — SIP bağlantısı kopuk`);
  });

  queues.forEach((q) => {
    if (q.kritik)
      msgs.push(`🚨 ${q.kuyruk_adi} — ${fmtSn(q.max_bekleme_sn)} bekleme (kritik)`);
  });

  calls.forEach((c) => {
    const elapsed = c.baslangic_zamani
      ? Math.floor((nowMs - new Date(c.baslangic_zamani)) / 1000)
      : (c.sure_sn || 0);
    if (elapsed >= 900)
      msgs.push(`📞 ${c.personel_ad || c.arayan_numara || "?"} — ${fmtDur(elapsed)} uzun görüşme`);
  });

  if (msgs.length === 0) return null;

  const ticker = msgs.join("   ·   ");
  const doubled = `${ticker}   ·   ${ticker}`;

  return (
    <div style={{
      position: "sticky", bottom: 0,
      margin: "12px -16px -16px",
      background: "linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d)",
      overflow: "hidden", height: 34,
      display: "flex", alignItems: "center",
      borderRadius: "0 0 12px 12px",
    }}>
      <div style={{
        whiteSpace: "nowrap",
        animation: "tickerScroll 28s linear infinite",
        display: "inline-block",
        fontSize: 11, fontWeight: 600,
        color: "#fecaca", paddingLeft: "100%",
      }}>
        {doubled}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function Operations() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const [calls,      setCalls]      = useState([]);
  const [queues,     setQueues]     = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs,      setNowMs]      = useState(Date.now());
  const [clockStr,   setClockStr]   = useState(nowHMS());
  const [toast,      setToast]      = useState(null);

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  /* ── Veri çekimi ──────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const results = await Promise.allSettled([
      warRoomApi.getActiveCalls(),
      warRoomApi.getQueues(),
      warRoomApi.getStaff(),
    ]);
    const get = (i) =>
      results[i]?.status === "fulfilled" ? results[i].value.data : null;

    if (get(0) !== null) setCalls(get(0));
    if (get(1) !== null) setQueues(get(1));
    if (get(2) !== null) setStaff(get(2));
    setLoading(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  /* ── 1 sn tick — süre sayaçları + saat ──────────────────────────────── */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNowMs(Date.now());
      setClockStr(nowHMS());
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── Toast ──────────────────────────────────────────────────────────── */
  const showToast = (kind, msg) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Whisper / Barge ────────────────────────────────────────────────── */
  const handleCallAction = async (callId, action) => {
    try {
      const { data } = await warRoomApi.callAction(callId, { action });
      showToast("ok", data.message);
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Aksiyon başarısız");
    }
  };

  /* ── Kapasite güncelle (optimistik) ─────────────────────────────────── */
  const handleCapacityChange = async (queueId, newCap) => {
    if (newCap < 1 || newCap > 200) return;
    setQueues((prev) =>
      prev.map((q) => q.id === queueId ? { ...q, max_kapasite: newCap } : q)
    );
    try {
      await warRoomApi.updateCapacity(queueId, newCap);
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Kapasite güncellenemedi");
      fetchAll();
    }
  };

  /* ── Özet sayılar (başlık satırı için) ───────────────────────────────── */
  const totalQueued = queues.reduce((s, q) => s + (q.bekleyen_sayi || 0), 0);
  const onlineCount = staff.filter(
    (s) => s.anlik_durum === "aktif" || s.anlik_durum === "mesgul"
  ).length;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 0 }}>

      {/* ── BAŞLIK ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 14, borderBottom: "1px solid rgba(0,0,0,0.06)",
        gap: 12, flexWrap: "wrap", marginBottom: 14,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: "#0f172a", letterSpacing: "-0.025em",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Radio
              size={20} color="#ef4444"
              style={{ animation: "liveGlow 2s ease-in-out infinite" }}
            />
            Canlı Operasyon
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
            {loading ? "Yükleniyor…" : (
              `${calls.length} aktif görüşme · ${totalQueued} kuyrukta bekleyen · ${onlineCount} çevrimiçi personel`
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* CANLI chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "5px 12px",
            background: "rgba(16,185,129,0.07)",
            border: "1.5px solid rgba(16,185,129,0.3)",
            borderRadius: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#10b981", display: "inline-block",
              animation: "livePulse 1.5s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 11.5, fontWeight: 700, color: "#10b981",
              letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
            }}>
              CANLI · {clockStr}
            </span>
          </div>

          {/* Yenile */}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "6px 14px",
              fontSize: 12, fontWeight: 600, color: "#475569",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
            />
            Yenile
          </button>
        </div>
      </div>

      {/* ── ANA GRID: 2fr (sol) + 1fr (sağ — personel) ─────────────────── */}
      <div
        className="wr-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gridTemplateRows: "auto 1fr",
          gap: 14,
        }}
      >
        {/* A. Canlı Çağrı Radarı — sol üst */}
        <div>
          <ActiveCallsPanel
            calls={calls}
            nowMs={nowMs}
            isAdmin={isAdmin}
            onAction={handleCallAction}
          />
        </div>

        {/* C. Personel Radarı — sağ, 2 satır */}
        <div style={{ gridRow: "1 / 3", gridColumn: 2 }}>
          <StaffPanel staff={staff} />
        </div>

        {/* B. Kuyruk Monitörü — sol alt */}
        <div>
          <QueuesPanel queues={queues} onCapacityChange={handleCapacityChange} />
        </div>
      </div>

      {/* ── ALERT TICKER ────────────────────────────────────────────────── */}
      <AlertTicker staff={staff} queues={queues} calls={calls} nowMs={nowMs} />

      {/* ── TOAST ───────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 52, right: 24, zIndex: 200,
          padding: "12px 16px", borderRadius: 10,
          background: "#ffffff",
          border: `1px solid ${toast.kind === "ok" ? "#10b981" : "#ef4444"}40`,
          borderLeft: `3px solid ${toast.kind === "ok" ? "#10b981" : "#ef4444"}`,
          boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
          fontSize: 12.5, fontWeight: 600,
          color: toast.kind === "ok" ? "#10b981" : "#ef4444",
          display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
        }}>
          {toast.kind === "ok"
            ? <CheckCircle2 size={14} />
            : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── KEYFRAMES + CSS SINIFLARI ───────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(0.8); }
        }
        @keyframes liveGlow {
          0%, 100% { opacity: 1; }
          50%       { opacity: .6; }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes queuePulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.22), 0 2px 8px rgba(0,0,0,0.04); }
        }
        @keyframes molaAlarm {
          0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
          50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0.28), 0 1px 4px rgba(0,0,0,0.03); }
        }
        .queue-pulse { animation: queuePulse 1.5s ease-in-out infinite; }
        .mola-alarm  { animation: molaAlarm  1.8s ease-in-out infinite; }
        @media (max-width: 1100px) {
          .wr-main-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
          }
          .wr-main-grid > div[style*="grid-row"] { grid-row: auto !important; }
          .wr-main-grid > div[style*="grid-column"] { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}
