import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const SEVERITY = {
  critical: {
    color:  "#ef4444",
    bg:     "#ffffff",
    border: "rgba(239,68,68,0.2)",
    left:   "#ef4444",
    icon:   AlertCircle,
    label:  "Kritik",
  },
  warning: {
    color:  "#f59e0b",
    bg:     "#ffffff",
    border: "rgba(245,158,11,0.2)",
    left:   "#f59e0b",
    icon:   AlertTriangle,
    label:  "Uyarı",
  },
  info: {
    color:  "#378ADD",
    bg:     "#ffffff",
    border: "rgba(55,138,221,0.18)",
    left:   "#378ADD",
    icon:   Info,
    label:  "Bilgi",
  },
};

function SkeletonRow() {
  return (
    <div style={{
      height: 58, borderRadius: 10,
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.05)",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.025) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
      }} />
    </div>
  );
}

export default function IssueFinder({ issues, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[1, 2].map((i) => <SkeletonRow key={i} />)}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!issues?.length) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 0",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(16,185,129,0.07)",
          border: "1px solid rgba(16,185,129,0.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <CheckCircle2 size={14} color="#10b981" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
            Aktif sorun yok
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>
            Tüm sistemler normal
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount  = issues.filter((i) => i.severity === "warning").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>

      {/* Özet chips */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div style={{ display: "flex", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
          {criticalCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10.5, fontWeight: 800,
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444", borderRadius: 999, padding: "3px 9px",
            }}>
              <AlertCircle size={9} color="#ef4444" />
              {criticalCount} kritik
            </div>
          )}
          {warningCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10.5, fontWeight: 800,
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b", borderRadius: 999, padding: "3px 9px",
            }}>
              <AlertTriangle size={9} color="#f59e0b" />
              {warningCount} uyarı
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 5,
        maxHeight: 210, overflowY: "auto",
      }}>
        {issues.map((issue, idx) => {
          const sv   = SEVERITY[issue.severity] || SEVERITY.warning;
          const Icon = sv.icon;
          return (
            <div key={idx} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              background: "#ffffff",
              border: `1px solid ${sv.border}`,
              borderLeft: `2.5px solid ${sv.left}`,
              borderRadius: 10, padding: "9px 12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: `${sv.color}0e`,
                border: `1px solid ${sv.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: 1,
              }}>
                <Icon size={11} color={sv.color} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5, marginBottom: 3,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                    {issue.ad_soyad}
                  </span>
                  <span style={{
                    fontSize: 8.5, fontWeight: 800,
                    background: `${sv.color}10`,
                    border: `1px solid ${sv.color}22`,
                    color: sv.color, borderRadius: 999, padding: "1px 6px",
                  }}>
                    {sv.label.toLocaleUpperCase('tr-TR')}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, color: "#64748b", lineHeight: 1.4,
                }}>
                  {issue.sorun}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
