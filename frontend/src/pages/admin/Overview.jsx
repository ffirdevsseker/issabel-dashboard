import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

import { useAuth }       from "@/context/AuthContext";
import { overviewApi, dashboardApi } from "@/services/api";

import HeroMetrics    from "@/components/admin/dashboard/HeroMetrics";
import TrafficChart   from "@/components/admin/dashboard/TrafficChart";
import TrunkGauge     from "@/components/admin/dashboard/TrunkGauge";
import AgentGrid      from "@/components/admin/dashboard/AgentGrid";
import MissedCallsTable from "@/components/admin/dashboard/MissedCallsTable";

const POLL_MS = 30_000;

/* ─── DEMO veriler (backend boş döndüğünde gösterilir) ─── */
const MOCK_HOURLY = [
  { saat: "08:00", toplam: 12, cevaplanan: 11, kacan: 1,  mesai_disi: false },
  { saat: "09:00", toplam: 28, cevaplanan: 24, kacan: 4,  mesai_disi: false },
  { saat: "10:00", toplam: 45, cevaplanan: 41, kacan: 4,  mesai_disi: false },
  { saat: "11:00", toplam: 52, cevaplanan: 47, kacan: 5,  mesai_disi: false },
  { saat: "12:00", toplam: 38, cevaplanan: 33, kacan: 5,  mesai_disi: false },
  { saat: "13:00", toplam: 35, cevaplanan: 31, kacan: 4,  mesai_disi: false },
  { saat: "14:00", toplam: 48, cevaplanan: 43, kacan: 5,  mesai_disi: false },
  { saat: "15:00", toplam: 55, cevaplanan: 50, kacan: 5,  mesai_disi: false },
  { saat: "16:00", toplam: 42, cevaplanan: 39, kacan: 3,  mesai_disi: false },
  { saat: "17:00", toplam: 30, cevaplanan: 27, kacan: 3,  mesai_disi: false },
];

const MOCK_COMMAND = {
  gunluk_cagri: { bugun: 393, dun: 371, cevaplanan: 358, kacan: 35, degisim_pct: 5.9, trend: "up" },
  sla:          { yuzde: 87.3, esik_sn: 45, karsilayan: 312, toplam: 358, hedef_yuzde: 80, alarm: false },
  kacan:        { sayi: 35, tahmini_ciro: 1750, ciro_per_cagri: 50, alarm: false },
  kuyruk:       { bekleyen: 4, ort_bekleme_sn: 28, max_bekleme_sn: 67, alarm: false },
  trunk:        { aktif_kanal: 14, trunk_limiti: 30, yuzde: 46.7, alarm_aktif: false, cpu: 38.2, ram: 51.4 },
  uyarilar:     [],
};

const MOCK_AGENTS = [
  { id: "a-1", ad_soyad: "Ahmet Yılmaz",  dahili_no: "1101", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi A", anlik_durum: "aktif",   sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 23, bugun_cevaplanan: 22, bugun_ort_csat: 4.7, unvan: "Altın",  xp: 1850, seviye: 8  },
  { id: "a-2", ad_soyad: "Selin Öztürk",  dahili_no: "1102", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi A", anlik_durum: "mesgul",  sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 19, bugun_cevaplanan: 18, bugun_ort_csat: 4.5, unvan: "Gümüş", xp: 1620, seviye: 7  },
  { id: "a-3", ad_soyad: "Can Demir",     dahili_no: "1103", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Satış Ekibi",     anlik_durum: "mola",    sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 15, bugun_cevaplanan: 14, bugun_ort_csat: 4.2, unvan: "Gümüş", xp: 1450, seviye: 6  },
  { id: "a-4", ad_soyad: "Zeynep Arslan", dahili_no: "1104", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi B", anlik_durum: "aktif",   sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 27, bugun_cevaplanan: 27, bugun_ort_csat: 4.9, unvan: "Platin", xp: 2100, seviye: 10 },
  { id: "a-5", ad_soyad: "Mert Güven",    dahili_no: "1105", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi B", anlik_durum: "mesgul",  sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 21, bugun_cevaplanan: 20, bugun_ort_csat: 4.6, unvan: "Altın",  xp: 1780, seviye: 8  },
  { id: "a-6", ad_soyad: "Ayşe Koç",      dahili_no: "1106", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi A", anlik_durum: "aktif",   sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 18, bugun_cevaplanan: 17, bugun_ort_csat: 4.4, unvan: "Gümüş", xp: 1540, seviye: 6  },
  { id: "a-7", ad_soyad: "Burak Yıldız",  dahili_no: "1107", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Satış Ekibi",     anlik_durum: "offline",  sip_durumu: "koptu",  mola_asimi: false, bugun_toplam_cagri: 0,  bugun_cevaplanan: 0,  bugun_ort_csat: 0,   unvan: "Bronz", xp: 980,  seviye: 3  },
  { id: "a-8", ad_soyad: "Deniz Kaya",    dahili_no: "1108", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi B", anlik_durum: "mola",    sip_durumu: "normal", mola_asimi: true,  bugun_toplam_cagri: 12, bugun_cevaplanan: 11, bugun_ort_csat: 3.8, unvan: "Bronz", xp: 1320, seviye: 5  },
  { id: "a-9", ad_soyad: "Emre Yıldırım", dahili_no: "1109", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi A", anlik_durum: "mesgul",  sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 16, bugun_cevaplanan: 16, bugun_ort_csat: 4.8, unvan: "Altın",  xp: 1690, seviye: 7  },
  { id: "a-10", ad_soyad: "Fatma Şahin",  dahili_no: "1110", departman_adi: "Müşteri Hizmetleri", ekip_adi: "Çağrı Merkezi B", anlik_durum: "aktif",   sip_durumu: "normal", mola_asimi: false, bugun_toplam_cagri: 20, bugun_cevaplanan: 19, bugun_ort_csat: 4.3, unvan: "Gümüş", xp: 1600, seviye: 7  },
];

const _now = Date.now();
const _fmtKisa = (m) => {
  const d = new Date(_now - m * 60_000);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const MOCK_MISSED = [
  { id: "m-1", arayan_numara: "+905***218", tarih_kisa: _fmtKisa(8),  durum: "cevaplanmadi", mesai_disi: false, bekleme_sn: 42,  kuyruk_adi: "Genel Hat"    },
  { id: "m-2", arayan_numara: "+905***844", tarih_kisa: _fmtKisa(15), durum: "cevaplanmadi", mesai_disi: false, bekleme_sn: 75,  kuyruk_adi: "Teknik Destek" },
  { id: "m-3", arayan_numara: "+905***412", tarih_kisa: _fmtKisa(22), durum: "cevaplanmadi", mesai_disi: false, bekleme_sn: 120, kuyruk_adi: "İade"          },
  { id: "m-4", arayan_numara: "+905***122", tarih_kisa: _fmtKisa(34), durum: "mesgul",       mesai_disi: false, bekleme_sn: 65,  kuyruk_adi: "VIP"           },
  { id: "m-5", arayan_numara: "+905***677", tarih_kisa: _fmtKisa(46), durum: "cevaplanmadi", mesai_disi: true,  bekleme_sn: 90,  kuyruk_adi: "Genel Hat"    },
  { id: "m-6", arayan_numara: "+905***788", tarih_kisa: _fmtKisa(58), durum: "cevaplanmadi", mesai_disi: true,  bekleme_sn: 38,  kuyruk_adi: "Satış"         },
  { id: "m-7", arayan_numara: "+905***991", tarih_kisa: _fmtKisa(72), durum: "mesgul",       mesai_disi: false, bekleme_sn: 55,  kuyruk_adi: "Teknik Destek" },
  { id: "m-8", arayan_numara: "+905***303", tarih_kisa: _fmtKisa(95), durum: "cevaplanmadi", mesai_disi: true,  bekleme_sn: 148, kuyruk_adi: "Genel Hat"    },
];

/* ─── Beyaz kart paneli ─────────────────────────────────────────────────────── */
export function Panel({ title, accentColor = "#3b82f6", children, stretch, badge, action, noPad }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.07)",
      borderRadius: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      height: stretch ? "100%" : undefined,
      overflow: "hidden",
    }}>
      <div style={{
        height: 3, flexShrink: 0,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`,
        borderRadius: "16px 16px 0 0",
      }} />
      <div style={{
        padding: "14px 20px 12px",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: accentColor,
          boxShadow: `0 0 0 3px ${accentColor}20`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 700, color: "#0f172a",
          letterSpacing: "0.01em", flex: 1,
        }}>
          {title}
        </span>
        {badge != null && (
          <span style={{
            fontSize: 11, fontWeight: 800,
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}28`,
            color: accentColor,
            borderRadius: 999, padding: "2px 9px",
          }}>
            {badge}
          </span>
        )}
        {action}
      </div>
      <div style={{
        padding:         noPad ? 0 : "16px 20px",
        flex:            stretch ? 1 : undefined,
        overflow:        stretch ? "auto" : undefined,
        display:         stretch ? "flex" : undefined,
        flexDirection:   stretch ? "column" : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Uyarı Şeridi ──────────────────────────────────────────────────────────── */
function AlertBanner({ uyarilar, onDismiss }) {
  if (!uyarilar?.length) return null;

  const kritik  = uyarilar.filter((u) => u.seviye === "kirmizi");
  const uyariSr = uyarilar.filter((u) => u.seviye === "turuncu");
  const renk    = kritik.length > 0;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 16px",
      background: renk ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
      border:     `1px solid ${renk ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
      borderRadius: 12,
      borderLeft:   `4px solid ${renk ? "#ef4444" : "#f59e0b"}`,
    }}>
      <AlertTriangle
        size={16}
        color={renk ? "#ef4444" : "#f59e0b"}
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        {uyarilar.map((u, i) => (
          <div key={i} style={{
            fontSize: 12.5, fontWeight: 600,
            color: u.seviye === "kirmizi" ? "#b91c1c" : "#92400e",
          }}>
            {u.mesaj}
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 2,
          color: "#94a3b8", flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── Shimmer kart ─────────────────────────────────────────────────────────── */
function Shimmer({ h = 200 }) {
  return (
    <div style={{
      height: h, borderRadius: 12,
      background: "rgba(0,0,0,0.025)",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
      }} />
    </div>
  );
}

/* ─── Ana sayfa ─────────────────────────────────────────────────────────────── */
export default function AdminOverview() {
  const { user }    = useAuth();
  const isAdmin     = user?.role === "admin";

  const [command,      setCommand]      = useState(null);
  const [hourly,       setHourly]       = useState([]);
  const [agents,       setAgents]       = useState([]);
  const [missedCalls,  setMissedCalls]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastSync,     setLastSync]     = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const timerRef = useRef(null);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    const [cmdRes, hourRes, agentRes, missedRes] = await Promise.allSettled([
      overviewApi.getCommand(),
      overviewApi.getHourly(),
      dashboardApi.getAgents(),
      overviewApi.getMissedCalls(25),
    ]);

    const cmdData = cmdRes.status === "fulfilled" ? cmdRes.value.data : null;
    const cmdEmpty = !cmdData || (cmdData.gunluk_cagri?.bugun === 0 && cmdData.sla?.toplam === 0);
    setCommand(cmdEmpty ? MOCK_COMMAND : cmdData);

    const hourlyData = hourRes.status === "fulfilled" ? (hourRes.value.data || []) : [];
    setHourly(hourlyData.length > 0 ? hourlyData : MOCK_HOURLY);

    const agentData = agentRes.status === "fulfilled" ? (agentRes.value.data || []) : [];
    setAgents(agentData.length > 0 ? agentData : MOCK_AGENTS);

    const missedData = missedRes.status === "fulfilled" ? (missedRes.value.data || []) : [];
    setMissedCalls(missedData.length > 0 ? missedData : MOCK_MISSED);

    setLastSync(new Date());
    setLoading(false);
    if (manual) {
      setRefreshing(false);
      setBannerDismissed(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const handleEndBreak = async (userId) => {
    await dashboardApi.endBreak(userId);
    fetchAll();
  };

  const uyarilar       = command?.uyarilar || [];
  const showBanner     = !bannerDismissed && uyarilar.length > 0;

  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      paddingBottom: 28,
    }}>

      {/* ── SAYFA BAŞLIĞI ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 4,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: "#0f172a", letterSpacing: "-0.025em",
          }}>
            Komuta Merkezi
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
            Müşteri Hizmetleri — Genel Bakış
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>
              {lastSync.toLocaleTimeString("tr-TR")}
            </span>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "6px 14px",
              fontSize: 12, fontWeight: 600, color: "#475569",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.15s",
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            Yenile
          </button>
        </div>
      </div>

      {/* ── A. UYARI ŞERİDİ ───────────────────────────────────────────────── */}
      {showBanner && (
        <AlertBanner
          uyarilar={uyarilar}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── B. HERO METRİKLER (4 Kart) ───────────────────────────────────── */}
      <HeroMetrics data={command} loading={loading} />

      {/* ── C. SİSTEM KALP ATIŞI ─────────────────────────────────────────── */}
      <div
        className="ov-heartbeat-grid"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "stretch" }}
      >
        {/* Saatlik Çağrı Yoğunluğu */}
        <Panel title="Saatlik Çağrı Yoğunluğu Eğrisi" accentColor="#0ea5e9">
          {loading ? (
            <Shimmer h={260} />
          ) : (
            <TrafficChart data={hourly} />
          )}
        </Panel>

        {/* Trunk Doluluk Gauge */}
        <Panel title="Trunk (Hat) Doluluk Oranı" accentColor="#8b5cf6">
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 0",
          }}>
            {loading ? (
              <Shimmer h={180} />
            ) : (
              <TrunkGauge trunk={command?.trunk} loading={loading} />
            )}
          </div>
        </Panel>
      </div>

      {/* ── D. OPERASYONEL DENETİM ───────────────────────────────────────── */}
      <div
        className="ov-ops-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}
      >
        {/* Canlı Personel Durumu */}
        <Panel
          title="Canlı Personel Durumu"
          accentColor="#10b981"
          badge={agents.length || null}
          stretch
        >
          {loading ? (
            <Shimmer h={250} />
          ) : (
            <AgentGrid
              agents={agents}
              isAdmin={isAdmin}
              onEndBreak={handleEndBreak}
            />
          )}
        </Panel>

        {/* Kaçan / Mesai Dışı Çağrılar */}
        <Panel
          title="Kaçan & Mesai Dışı Çağrılar"
          accentColor="#ef4444"
          badge={missedCalls.length || null}
          stretch
        >
          {loading ? (
            <Shimmer h={250} />
          ) : (
            <MissedCallsTable items={missedCalls} loading={false} />
          )}
        </Panel>
      </div>

      {/* ── Animasyon stilleri ───────────────────────────────────────────── */}
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @media (max-width: 1100px) {
          .ov-heartbeat-grid { grid-template-columns: 1fr !important; }
          .ov-ops-grid        { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .ov-hero-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
