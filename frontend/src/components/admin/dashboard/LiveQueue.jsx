import { Clock, Crown, PhoneIncoming } from "lucide-react";

function fmtTime(sec) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}d ${s}s` : `${s}s`;
}

export default function LiveQueue({ items, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 52, borderRadius: 10,
            background: "rgba(241,245,249,0.9)",
            border: "1px solid rgba(148,163,184,0.12)",
          }} />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(55,138,221,0.08)",
          border: "1px solid rgba(55,138,221,0.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 8px",
        }}>
          <PhoneIncoming size={16} color="#378ADD" />
        </div>
        <div style={{ color: "#64748b", fontSize: 12 }}>Bekleyen çağrı yok</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, idx) => {
        const isVip = item.oncelik > 0;
        return (
          <div key={idx} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: isVip
              ? "linear-gradient(90deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)"
              : "rgba(248,250,252,0.95)",
            border: `1px solid ${isVip ? "rgba(245,158,11,0.22)" : "rgba(148,163,184,0.12)"}`,
            borderLeft: isVip ? "2px solid #f59e0b" : "2px solid rgba(55,138,221,0.28)",
            borderRadius: 10, padding: "9px 12px",
            transition: "border-color 0.2s",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: isVip ? "rgba(245,158,11,0.1)" : "rgba(55,138,221,0.08)",
              border: `1px solid ${isVip ? "rgba(245,158,11,0.22)" : "rgba(55,138,221,0.16)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isVip
                ? <Crown size={13} color="#f59e0b" />
                : <PhoneIncoming size={13} color="#378ADD" />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: isVip ? "#b45309" : "#0f172a",
                fontFamily: "monospace", letterSpacing: "0.05em",
              }}>
                {item.arayan_numara}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                {item.kuyruk_adi || "—"}
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              color: "#64748b", fontSize: 11, whiteSpace: "nowrap",
            }}>
              <Clock size={10} color="#60a5fa" />
              <span style={{ fontWeight: 600, color: "#2563eb" }}>{fmtTime(item.bekleme_suresi_sn)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
