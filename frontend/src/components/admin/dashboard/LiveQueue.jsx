import { Clock, Crown, PhoneIncoming } from "lucide-react";

function fmtTime(sec) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}d ${s}s` : `${s}s`;
}

function getWaitStyle(sn, esik) {
  if (sn > esik * 2) return { color: "#ef4444", label: "KRİTİK" };
  if (sn > esik)     return { color: "#f59e0b", label: "UZUN"   };
  return                    { color: "#2563eb", label: null      };
}

function SkeletonRow() {
  return (
    <div style={{
      height: 56, borderRadius: 10,
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

export default function LiveQueue({ items, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(55,138,221,0.07)",
          border: "1px solid rgba(55,138,221,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px",
        }}>
          <PhoneIncoming size={17} color="#378ADD" />
        </div>
        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Bekleyen çağrı yok</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, idx) => {
        const isVip = item.oncelik > 0;
        const esik  = item.uyari_esigi_sn || 45;
        const ws    = getWaitStyle(item.bekleme_suresi_sn, esik);
        const alarm = item.bekleme_suresi_sn > esik;

        return (
          <div key={idx} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#ffffff",
            border: `1px solid ${
              alarm  ? `${ws.color}22`
              : isVip ? "rgba(245,158,11,0.2)"
              :         "rgba(0,0,0,0.06)"
            }`,
            borderLeft: `2.5px solid ${
              alarm  ? ws.color
              : isVip ? "#f59e0b"
              :         "rgba(55,138,221,0.3)"
            }`,
            borderRadius: 10, padding: "9px 12px",
            boxShadow: alarm
              ? `0 0 0 2px ${ws.color}0a`
              : "0 1px 4px rgba(0,0,0,0.03)",
            transition: "box-shadow 0.2s",
          }}>
            {/* Sıra numarası */}
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              background: alarm
                ? `${ws.color}10`
                : isVip ? "rgba(245,158,11,0.1)"
                :         "rgba(0,0,0,0.04)",
              border: `1px solid ${alarm ? `${ws.color}22` : "rgba(0,0,0,0.06)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 800,
              color: alarm ? ws.color : isVip ? "#b45309" : "#94a3b8",
            }}>
              {idx + 1}
            </div>

            {/* İkon */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: alarm
                ? `${ws.color}0e`
                : isVip ? "rgba(245,158,11,0.09)"
                :         "rgba(55,138,221,0.07)",
              border: `1px solid ${
                alarm  ? `${ws.color}22`
                : isVip ? "rgba(245,158,11,0.2)"
                :         "rgba(55,138,221,0.14)"
              }`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isVip
                ? <Crown size={13} color="#f59e0b" />
                : <PhoneIncoming size={13} color={alarm ? ws.color : "#378ADD"} />
              }
            </div>

            {/* Numara + kuyruk */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em",
                color: alarm
                  ? (ws.color === "#ef4444" ? "#b91c1c" : "#92400e")
                  : isVip ? "#b45309"
                  :         "#0f172a",
                fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {item.arayan_numara}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>
                {item.kuyruk_adi || "—"}
              </div>
            </div>

            {/* Süre + etiket */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 12, fontWeight: 800, color: ws.color, whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}>
                <Clock size={10} color={ws.color} />
                {fmtTime(item.bekleme_suresi_sn)}
              </div>
              {alarm && ws.label && (
                <span style={{
                  fontSize: 8.5, fontWeight: 800, letterSpacing: "0.04em",
                  background: `${ws.color}10`,
                  border: `1px solid ${ws.color}28`,
                  borderRadius: 5, padding: "1px 5px",
                  color: ws.color,
                }}>
                  {ws.label}
                </span>
              )}
              {isVip && !alarm && (
                <span style={{
                  fontSize: 8.5, fontWeight: 800, letterSpacing: "0.04em",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 5, padding: "1px 5px",
                  color: "#b45309",
                }}>
                  VIP
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
