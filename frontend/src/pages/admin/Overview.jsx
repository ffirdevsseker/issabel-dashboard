import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { dashboardApi } from "@/services/api";
import TopMetrics from "@/components/admin/dashboard/TopMetrics";
import AgentGrid from "@/components/admin/dashboard/AgentGrid";
import LiveQueue from "@/components/admin/dashboard/LiveQueue";
import AiFeed from "@/components/admin/dashboard/AiFeed";
import IssueFinder from "@/components/admin/dashboard/IssueFinder";

const POLL_MS = 15_000;

export function Panel({ title, color, children, stretch, badge }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: stretch ? "100%" : undefined,
      background: "linear-gradient(160deg, #132334 0%, #162c44 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: `2px solid ${color}`,
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(0,0,0,0.18)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}80`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 700, color: "#e2e8f0",
          letterSpacing: "0.025em", flex: 1,
        }}>
          {title}
        </span>
        {badge != null && (
          <span style={{
            fontSize: 11, fontWeight: 800,
            background: `${color}20`,
            border: `1px solid ${color}35`,
            color,
            borderRadius: 999, padding: "2px 9px",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{
        padding: "14px 16px",
        flex: stretch ? 1 : undefined,
        overflow: stretch ? "hidden" : undefined,
        display: stretch ? "flex" : undefined,
        flexDirection: stretch ? "column" : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isBt = role === "bt";

  const [summary,   setSummary]   = useState(null);
  const [agents,    setAgents]    = useState([]);
  const [queueLive, setQueueLive] = useState([]);
  const [aiFeed,    setAiFeed]    = useState([]);
  const [issues,    setIssues]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    const calls = [
      dashboardApi.getSummary(),
      dashboardApi.getQueueLive(),
    ];
    if (!isBt) {
      calls.push(
        dashboardApi.getAgents(),
        dashboardApi.getAiFeed(),
        dashboardApi.getIssues(),
      );
    }

    const results = await Promise.allSettled(calls);
    const get = (i) => results[i]?.status === "fulfilled" ? results[i].value.data : null;

    setSummary(get(0));
    setQueueLive(get(1) || []);
    if (!isBt) {
      setAgents(get(2) || []);
      setAiFeed(get(3) || []);
      setIssues(get(4) || []);
    }
    setLastSync(new Date());
    setLoading(false);
  }, [isBt]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const handleEndBreak = async (userId) => {
    await dashboardApi.endBreak(userId);
    fetchAll();
  };

  return (
    <div style={{
      margin: -16,
      padding: 16,
      minHeight: "calc(100% + 32px)",
      background: "linear-gradient(145deg, #0b1929 0%, #0d1e30 50%, #091522 100%)",
      borderRadius: 16,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 19, fontWeight: 800, color: "#e2e8f0",
            letterSpacing: "-0.01em",
          }}>
            Genel Bakış
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
            {isBt ? "BT Metrikleri & Canlı Kuyruk" : "Çağrı merkezi anlık durumu"}
            {" · "}15sn'de bir güncellenir
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(55,138,221,0.1)",
          border: "1px solid rgba(55,138,221,0.2)",
          borderRadius: 8, padding: "5px 11px",
        }}>
          <RefreshCw size={11} color="#60a5fa" />
          <span style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600 }}>
            {lastSync ? lastSync.toLocaleTimeString("tr-TR") : "Yükleniyor..."}
          </span>
        </div>
      </div>

      {/* Top Metrics — all roles */}
      <TopMetrics summary={summary} loading={loading} />

      {isBt ? (
        <Panel title="Canlı Kuyruk" color="#378ADD">
          <LiveQueue items={queueLive} loading={loading} />
        </Panel>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
        }} className="overview-grid">
          {/* Left: Agent Grid — stretches to match right column height */}
          <Panel
            title="Personel Durumu"
            color="#34d399"
            badge={agents.length}
            stretch
          >
            <AgentGrid agents={agents} isAdmin={isAdmin} onEndBreak={handleEndBreak} />
          </Panel>

          {/* Right: stacked panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Panel title="Canlı Kuyruk" color="#378ADD" badge={queueLive.length || null}>
              <LiveQueue items={queueLive} loading={loading} />
            </Panel>
            <Panel title="AI Çağrı Analizi" color="#a78bfa">
              <AiFeed items={aiFeed} loading={loading} />
            </Panel>
            <Panel title="Dikkat Gerektiren" color="#ef4444" badge={issues.length || null}>
              <IssueFinder issues={issues} loading={loading} />
            </Panel>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #ef4444; }
          50%       { opacity: 0.35; box-shadow: 0 0 2px #ef4444; }
        }
        .pulse-dot { animation: pulse-glow 1.2s ease-in-out infinite !important; }
        @media (max-width: 1000px) {
          .overview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
