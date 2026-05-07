import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function IssueFinder({ issues, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2].map((i) => (
          <div key={i} style={{
            height: 52, borderRadius: 10,
            background: "rgba(241,245,249,0.9)",
            border: "1px solid rgba(148,163,184,0.12)",
          }} />
        ))}
      </div>
    );
  }

  if (!issues?.length) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 0", color: "#34d399", fontSize: 12, fontWeight: 600,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(52,211,153,0.1)",
          border: "1px solid rgba(52,211,153,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 size={12} color="#34d399" />
        </div>
        Aktif sorun bulunamadı
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 210, overflowY: "auto" }}>
      {issues.map((issue, idx) => (
        <div key={idx} style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "linear-gradient(90deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.025) 100%)",
          border: "1px solid rgba(239,68,68,0.14)",
          borderLeft: "2px solid rgba(239,68,68,0.6)",
          borderRadius: 10, padding: "9px 12px",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: 1,
          }}>
            <AlertCircle size={12} color="#ef4444" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
              {issue.ad_soyad}
            </div>
            <div style={{
              fontSize: 11, color: "#b91c1c",
              marginTop: 2, lineHeight: 1.3,
            }}>
              {issue.sorun}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
