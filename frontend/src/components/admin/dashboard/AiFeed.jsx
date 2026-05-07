import { Mic, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";

const DUYGU = {
  1: { emoji: "😡", color: "#ef4444", label: "Çok Kötü"  },
  2: { emoji: "😔", color: "#f97316", label: "Kötü"      },
  3: { emoji: "😐", color: "#94a3b8", label: "Nötr"      },
  4: { emoji: "😊", color: "#10b981", label: "İyi"        },
  5: { emoji: "😄", color: "#10b981", label: "Mükemmel"  },
};

function fmtDuration(sec) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CsatStars({ score }) {
  if (!score) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={9}
          color={n <= score ? "#f59e0b" : "#e2e8f0"}
          fill={n <= score ? "#f59e0b" : "#e2e8f0"}
        />
      ))}
      <span style={{
        fontSize: 10.5, fontWeight: 800, color: "#0f172a",
        marginLeft: 3, fontVariantNumeric: "tabular-nums",
      }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      height: 78, borderRadius: 10,
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

export default function AiFeed({ items, loading }) {
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
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px",
        }}>
          <Mic size={16} color="#8b5cf6" />
        </div>
        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Henüz analiz yok</div>
      </div>
    );
  }

  const avgCsat = items.filter((i) => i.csat_skoru > 0).length > 0
    ? (items.filter((i) => i.csat_skoru > 0).reduce((s, i) => s + i.csat_skoru, 0) /
       items.filter((i) => i.csat_skoru > 0).length)
    : 0;

  const avgDuygu = items.filter((i) => i.duygu_skoru > 0).length > 0
    ? (items.filter((i) => i.duygu_skoru > 0).reduce((s, i) => s + i.duygu_skoru, 0) /
       items.filter((i) => i.duygu_skoru > 0).length)
    : 0;

  const TrendIcon = avgCsat >= 4 ? TrendingUp : avgCsat >= 3 ? Minus : TrendingDown;
  const trendColor = avgCsat >= 4 ? "#10b981" : avgCsat >= 3 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Mini özet şeridi */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 10px",
        background: "rgba(139,92,246,0.04)",
        border: "1px solid rgba(139,92,246,0.1)",
        borderRadius: 10,
      }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: "#0f172a",
            fontVariantNumeric: "tabular-nums", lineHeight: 1,
          }}>
            {items.length}
          </div>
          <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>
            Analiz
          </div>
        </div>
        <div style={{ width: 1, background: "rgba(0,0,0,0.06)", alignSelf: "stretch" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          {avgCsat > 0 ? (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                fontSize: 16, fontWeight: 800, lineHeight: 1,
                color: trendColor, fontVariantNumeric: "tabular-nums",
              }}>
                <TrendIcon size={12} color={trendColor} />
                {avgCsat.toFixed(1)}
              </div>
              <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>
                Ort. CSAT
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#cbd5e1", lineHeight: 1 }}>—</div>
              <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Ort. CSAT</div>
            </>
          )}
        </div>
        <div style={{ width: 1, background: "rgba(0,0,0,0.06)", alignSelf: "stretch" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            fontSize: 16, fontWeight: 800, lineHeight: 1,
            color: avgDuygu >= 4 ? "#10b981" : avgDuygu >= 3 ? "#f59e0b" : avgDuygu > 0 ? "#ef4444" : "#cbd5e1",
          }}>
            {avgDuygu > 0 ? DUYGU[Math.round(avgDuygu)]?.emoji || "😐" : "—"}
          </div>
          <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>
            Duygu
          </div>
        </div>
      </div>

      {/* Analiz listesi */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 240, overflowY: "auto" }}>
        {items.map((item, idx) => {
          const d = DUYGU[item.duygu_skoru] || DUYGU[3];
          return (
            <div key={idx} style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderLeft: `2.5px solid ${d.color}`,
              borderRadius: 10, padding: "10px 12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}>
              {/* Header satırı */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.16)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Mic size={10} color="#8b5cf6" />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                    {item.personel_adi}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: d.color,
                    background: `${d.color}10`,
                    border: `1px solid ${d.color}22`,
                    borderRadius: 5, padding: "1px 5px",
                  }}>
                    {d.label}
                  </span>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{d.emoji}</span>
                </div>
              </div>

              {/* AI özet */}
              {item.ai_ozet && (
                <div style={{
                  fontSize: 11, color: "#475569",
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  lineHeight: 1.45, marginBottom: 7,
                }}>
                  {item.ai_ozet}
                </div>
              )}

              {/* Footer: süre + CSAT */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{
                  fontSize: 10, color: "#94a3b8", fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {fmtDuration(item.konusma_suresi)}
                </span>
                <CsatStars score={item.csat_skoru} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
