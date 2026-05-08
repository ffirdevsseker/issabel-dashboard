import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { dashboardApi } from "@/services/api";
import TopMetrics   from "@/components/admin/dashboard/TopMetrics";
import AgentGrid    from "@/components/admin/dashboard/AgentGrid";
import LiveQueue    from "@/components/admin/dashboard/LiveQueue";
import AiFeed       from "@/components/admin/dashboard/AiFeed";
import IssueFinder  from "@/components/admin/dashboard/IssueFinder";
import TrafficChart from "@/components/admin/dashboard/TrafficChart";

const POLL_MS = 15_000;

/* ─── Beyaz kart paneli — PersonnelMonitor'da da import edilir ──────────────── */
export function Panel({ title, accentColor = "#3b82f6", children, stretch, badge, action }) {
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
      {/* Üst renk şeridi */}
      <div style={{
        height: 3, flexShrink: 0,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`,
        borderRadius: "16px 16px 0 0",
      }} />

      {/* Başlık */}
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
            minWidth: "24px", textAlign: "center",
          }}>
            {badge}
          </span>
        )}
        {action}
      </div>

      {/* İçerik */}
      <div style={{
        padding: "16px 20px",
        flex: stretch ? 1 : undefined,
        overflow: stretch ? "auto" : undefined,
        display: stretch ? "flex" : undefined,
        flexDirection: stretch ? "column" : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Sayfa ─────────────────────────────────────────────────────────────────── */
export default function AdminOverview() {
  const { user } = useAuth();
  const role    = user?.role;
  const isAdmin = role === "admin";
  const isBt    = role === "bt";

  const [headerStats, setHeaderStats] = useState(null);
  const [summary,     setSummary]     = useState(null);
  const [agents,      setAgents]      = useState([]);
  const [queueLive,   setQueueLive]   = useState([]);
  const [aiFeed,      setAiFeed]      = useState([]);
  const [issues,      setIssues]      = useState([]);
  const [traffic,     setTraffic]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastSync,    setLastSync]    = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    const calls = [
      dashboardApi.getHeaderStats(),
      dashboardApi.getSummary(),
      dashboardApi.getQueueLive(),
    ];
    if (!isBt) {
      calls.push(
        dashboardApi.getAgents(),
        dashboardApi.getAiFeed(),
        dashboardApi.getIssues(),
        dashboardApi.getTrafficHourly(),
      );
    }

    const results = await Promise.allSettled(calls);
    const get = (i) => results[i]?.status === "fulfilled" ? results[i].value.data : null;

    setHeaderStats(get(0));
    setSummary(get(1));
    setQueueLive(get(2) || []);
    if (!isBt) {
      setAgents(get(3)  || []);
      setAiFeed(get(4)  || []);
      setIssues(get(5)  || []);
      setTraffic(get(6) || []);
    }
    setLastSync(new Date());
    setLoading(false);
    if (manual) setRefreshing(false);
  }, [isBt]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const handleEndBreak = async (userId) => {
    await dashboardApi.endBreak(userId);
    fetchAll();
  };

  const saglik      = headerStats?.sistem_saglik      || null;
  const saglikRenk  = headerStats?.sistem_saglik_renk || "#10b981";
  const kritikSayi  = headerStats?.kritik_bildirim    || 0;

  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      paddingBottom: 28,
    }}>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 4,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: "#0f172a", letterSpacing: "-0.025em",
          }}>
            Genel Bakış
          </h1>
          <p style={{
            margin: "2px 0 0", fontSize: 12,
            color: "#94a3b8", fontWeight: 500,
          }}>
            Gerçek zamanlı operasyon izleme
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Sistem sağlık badge */}
          {saglik && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px",
              background: `${saglikRenk}0e`,
              border: `1.5px solid ${saglikRenk}28`,
              borderRadius: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: saglikRenk,
                boxShadow: `0 0 0 3px ${saglikRenk}28`,
              }} className={saglik === "Kırmızı" ? "pulse-dot" : ""} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: saglikRenk }}>
                Sistem {saglik}
              </span>
            </div>
          )}

          {/* Kritik bildirim */}
          {kritikSayi > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 11px",
              background: "rgba(239,68,68,0.06)",
              border: "1.5px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
            }}>
              <Activity size={12} color="#ef4444" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#ef4444" }}>
                {kritikSayi} kritik bildirim
              </span>
            </div>
          )}

          {/* Son güncelleme */}
          {lastSync && (
            <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>
              {lastSync.toLocaleTimeString("tr-TR")}
            </span>
          )}

          {/* Yenile */}
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
            <RefreshCw
              size={12}
              style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
            />
            Yenile
          </button>
        </div>
      </div>

      {/* ── TOP METRICS ──────────────────────────────────────────────────────── */}
      <TopMetrics summary={summary} headerStats={headerStats} loading={loading} />

      {isBt ? (
        <Panel title="Canlı Kuyruk" accentColor="#3b82f6">
          <LiveQueue items={queueLive} loading={loading} />
        </Panel>
      ) : (
        <>
          {/* ── TRAFİK GRAFİĞİ ───────────────────────────────────────────────── */}
          {(traffic.length > 0 || loading) && (
            <Panel title="Saatlik Çağrı Trafiği" accentColor="#0ea5e9">
              {loading ? (
                <div style={{
                  height: 190,
                  background: "rgba(0,0,0,0.025)",
                  borderRadius: 10,
                  animation: "shimmer 1.6s infinite",
                  backgroundSize: "200% 100%",
                }} />
              ) : (
                <TrafficChart data={traffic} />
              )}
            </Panel>
          )}

          {/* ── ANA GRID ─────────────────────────────────────────────────────── */}
          <div
            className="overview-main-grid"
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, alignItems: "start" }}
          >
            {/* Personel Grid */}
            <Panel
              title="Personel Durumu"
              accentColor="#10b981"
              badge={agents.length || null}
              stretch
            >
              <AgentGrid
                agents={agents}
                isAdmin={isAdmin}
                onEndBreak={handleEndBreak}
              />
            </Panel>

            {/* Sağ panel sütunu */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Panel
                title="Canlı Kuyruk"
                accentColor="#3b82f6"
                badge={queueLive.length || null}
              >
                <LiveQueue items={queueLive} loading={loading} />
              </Panel>

              <Panel title="AI Çağrı Analizi" accentColor="#8b5cf6">
                <AiFeed items={aiFeed} loading={loading} />
              </Panel>

              <Panel
                title="Dikkat Gerektiren"
                accentColor="#ef4444"
                badge={issues.length || null}
              >
                <IssueFinder issues={issues} loading={loading} />
              </Panel>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background: linear-gradient(90deg,#f8fafc 0%,#eef2f7 50%,#f8fafc 100%); background-size: 200% 100%; background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 3px currentColor; }
          50%       { opacity: 0.6; box-shadow: 0 0 0 1px currentColor; }
        }
        .pulse-dot { animation: pulse-glow 1.4s ease-in-out infinite !important; }

        @media (max-width: 1200px) {
          .overview-main-grid { grid-template-columns: 1fr !important; }
        }

        /* Özel scrollbar */
        ::-webkit-scrollbar        { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track  { background: transparent; }
        ::-webkit-scrollbar-thumb  { background: rgba(0,0,0,0.14); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
      `}</style>
    </div>
  );
}
