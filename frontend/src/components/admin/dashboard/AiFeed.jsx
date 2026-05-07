import { Mic, Star } from "lucide-react";

const DUYGU_EMOJI = { 1: "😡", 2: "😔", 3: "😐", 4: "😊", 5: "😄" };
const DUYGU_COLOR = { 1: "#ef4444", 2: "#f97316", 3: "#94a3b8", 4: "#34d399", 5: "#34d399" };

function fmtDuration(sec) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AiFeed({ items, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 72, borderRadius: 10,
            background: "rgba(241,245,249,0.9)",
            border: "1px solid rgba(148,163,184,0.12)",
          }} />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(167,139,250,0.08)",
          border: "1px solid rgba(167,139,250,0.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 8px",
        }}>
          <Mic size={14} color="#a78bfa" />
        </div>
        <div style={{ color: "#64748b", fontSize: 12 }}>Henüz analiz yok</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, idx) => {
        const emoji = DUYGU_EMOJI[item.duygu_skoru] || "😐";
        const duyguColor = DUYGU_COLOR[item.duygu_skoru] || "#94a3b8";
        return (
          <div key={idx} style={{
            background: "rgba(248,250,252,0.96)",
            border: "1px solid rgba(148,163,184,0.12)",
            borderLeft: `2px solid ${duyguColor}60`,
            borderRadius: 10, padding: "10px 12px",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: "rgba(167,139,250,0.12)",
                  border: "1px solid rgba(167,139,250,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Mic size={10} color="#a78bfa" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  {item.personel_adi}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{emoji}</span>
                {item.csat_skoru > 0 && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: 2,
                    fontSize: 11, color: "#f59e0b", fontWeight: 700,
                  }}>
                    <Star size={9} fill="#f59e0b" color="#f59e0b" /> {item.csat_skoru}
                  </span>
                )}
              </div>
            </div>
            {item.ai_ozet && (
              <div style={{
                fontSize: 11, color: "#475569",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                lineHeight: 1.45,
              }}>
                {item.ai_ozet}
              </div>
            )}
            <div style={{
              fontSize: 10, color: "#94a3b8",
              marginTop: 5, letterSpacing: "0.02em",
            }}>
              Süre: {fmtDuration(item.konusma_suresi)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
