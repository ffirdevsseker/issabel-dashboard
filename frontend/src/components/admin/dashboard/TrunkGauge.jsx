/* ─── Trunk (Hat) Doluluk Gauge — Yarım Daire SVG ──────────────────────────
   Renk eşikleri: < 70 → yeşil, 70–90 → sarı, > 90 → kırmızı
   ────────────────────────────────────────────────────────────────────────── */

function getColor(pct) {
  if (pct >= 90) return { fill: "#ef4444", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.18)", label: "Kritik" };
  if (pct >= 70) return { fill: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.18)", label: "Yüksek" };
  return          { fill: "#10b981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.18)",  label: "Normal" };
}

/* Yarım daire parametreleri */
const CX     = 90;
const CY     = 90;
const R      = 72;
const STROKE = 12;
const START_ANGLE = -180; // saat 9
const END_ANGLE   =    0; // saat 3

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const TOTAL_ARC   = END_ANGLE - START_ANGLE; // 180°
const TRACK_PATH  = describeArc(CX, CY, R, START_ANGLE, END_ANGLE);
const CIRC        = Math.PI * R;             // yarım çevre

export default function TrunkGauge({ trunk, loading }) {
  if (loading) {
    return (
      <div style={{
        height: "100%", minHeight: 180,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 180, height: 100, borderRadius: 12,
          background: "rgba(0,0,0,0.04)",
          animation: "shimmerGauge 1.6s infinite",
          backgroundSize: "200% 100%",
        }} />
        <style>{`
          @keyframes shimmerGauge {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const pct   = Math.min(trunk?.yuzde ?? 0, 100);
  const c     = getColor(pct);
  const alarm = trunk?.alarm_aktif || pct >= 90;

  // Dolu arc açısı
  const filledDeg  = (pct / 100) * TOTAL_ARC;
  const filledPath = filledDeg > 0
    ? describeArc(CX, CY, R, START_ANGLE, START_ANGLE + filledDeg)
    : null;

  // Eşik çizgileri (70% → sarı, 90% → kırmızı)
  const tick70  = polarToCartesian(CX, CY, R + STROKE / 2 + 4, START_ANGLE + 0.7 * TOTAL_ARC);
  const tick70i = polarToCartesian(CX, CY, R - STROKE / 2 - 2, START_ANGLE + 0.7 * TOTAL_ARC);
  const tick90  = polarToCartesian(CX, CY, R + STROKE / 2 + 4, START_ANGLE + 0.9 * TOTAL_ARC);
  const tick90i = polarToCartesian(CX, CY, R - STROKE / 2 - 2, START_ANGLE + 0.9 * TOTAL_ARC);

  // İbre ucu
  const needleTip  = polarToCartesian(CX, CY, R - 16, START_ANGLE + (pct / 100) * TOTAL_ARC);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

      {/* SVG Gauge */}
      <div style={{ position: "relative" }}>
        <svg width={180} height={110} viewBox="0 0 180 110" overflow="visible">
          {/* Arka plan track */}
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="rgba(0,0,0,0.07)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Bölge renklendirme: 0-70 yeşil */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE, START_ANGLE + 0.7 * TOTAL_ARC)}
            fill="none"
            stroke="rgba(16,185,129,0.15)"
            strokeWidth={STROKE}
          />
          {/* 70-90 sarı */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE + 0.7 * TOTAL_ARC, START_ANGLE + 0.9 * TOTAL_ARC)}
            fill="none"
            stroke="rgba(245,158,11,0.15)"
            strokeWidth={STROKE}
          />
          {/* 90-100 kırmızı */}
          <path
            d={describeArc(CX, CY, R, START_ANGLE + 0.9 * TOTAL_ARC, END_ANGLE)}
            fill="none"
            stroke="rgba(239,68,68,0.15)"
            strokeWidth={STROKE}
          />

          {/* Dolu arc */}
          {filledPath && (
            <path
              d={filledPath}
              fill="none"
              stroke={c.fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.7s ease" }}
            />
          )}

          {/* Eşik çizgileri */}
          <line x1={tick70i.x} y1={tick70i.y} x2={tick70.x} y2={tick70.y}
                stroke="#f59e0b" strokeWidth={2} opacity={0.8} />
          <line x1={tick90i.x} y1={tick90i.y} x2={tick90.x} y2={tick90.y}
                stroke="#ef4444" strokeWidth={2} opacity={0.8} />

          {/* İbre */}
          <line
            x1={CX} y1={CY}
            x2={needleTip.x} y2={needleTip.y}
            stroke={c.fill}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: "x2 0.7s ease, y2 0.7s ease" }}
          />
          <circle cx={CX} cy={CY} r={5} fill={c.fill} />

          {/* Etiketler */}
          <text x={CX - R - 2} y={CY + 18} textAnchor="middle"
                fontSize={8} fill="#94a3b8" fontWeight={600}>0</text>
          <text x={CX + R + 2} y={CY + 18} textAnchor="middle"
                fontSize={8} fill="#94a3b8" fontWeight={600}>100</text>
          <text x={CX} y={CY - R - 6} textAnchor="middle"
                fontSize={8} fill="#94a3b8" fontWeight={600}>50</text>
        </svg>

        {/* Merkez değer */}
        <div style={{
          position: "absolute",
          bottom: 2, left: 0, right: 0,
          textAlign: "center",
        }}>
          <span style={{
            fontSize: 26, fontWeight: 900, lineHeight: 1,
            color: c.fill,
            fontVariantNumeric: "tabular-nums",
          }}>
            %{Math.round(pct)}
          </span>
        </div>
      </div>

      {/* Kanal bilgisi */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
          {trunk?.aktif_kanal ?? 0} / {trunk?.trunk_limiti ?? 0} aktif kanal
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px",
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 99,
          fontSize: 10.5, fontWeight: 700, color: c.fill,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: c.fill,
            animation: alarm ? "pulseTrunk 1.2s ease-in-out infinite" : "none",
          }} />
          {c.label}
        </div>
      </div>

      {/* Eşik göstergesi */}
      <div style={{ display: "flex", gap: 10, fontSize: 9.5, fontWeight: 600, color: "#94a3b8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 8, height: 3, borderRadius: 99, background: "#10b981" }} />
          &lt;70%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 8, height: 3, borderRadius: 99, background: "#f59e0b" }} />
          70–90%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 8, height: 3, borderRadius: 99, background: "#ef4444" }} />
          &gt;90%
        </div>
      </div>

      {/* CPU / RAM */}
      {(trunk?.cpu > 0 || trunk?.ram > 0) && (
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {[
            { label: "CPU", val: trunk.cpu },
            { label: "RAM", val: trunk.ram },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: val > 80 ? "#ef4444" : val > 65 ? "#f59e0b" : "#10b981", fontVariantNumeric: "tabular-nums" }}>
                %{Math.round(val)}
              </div>
              <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulseTrunk {
          0%,100% { opacity:1; }
          50%      { opacity:.4; }
        }
      `}</style>
    </div>
  );
}
