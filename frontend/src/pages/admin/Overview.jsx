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

    if (cmdRes.status    === "fulfilled") setCommand(cmdRes.value.data);
    if (hourRes.status   === "fulfilled") setHourly(hourRes.value.data  || []);
    if (agentRes.status  === "fulfilled") setAgents(agentRes.value.data || []);
    if (missedRes.status === "fulfilled") setMissedCalls(missedRes.value.data || []);

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
