import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";

const ANALYSIS_BARS = [
  { time: "08:00", intensity: 3,  staff: 5,  label: "08" },
  { time: "10:00", intensity: 6,  staff: 8,  label: "10" },
  { time: "12:00", intensity: 8,  staff: 7,  label: "12" },
  { time: "14:00", intensity: 10, staff: 6,  label: "14" },
  { time: "16:00", intensity: 7,  staff: 7,  label: "16" },
  { time: "18:00", intensity: 4,  staff: 5,  label: "18" },
];

const MAX_VAL = 12;
const CHART_H = 120;

function barColor(intensity) {
  if (intensity >= 9) return "#DC2626";
  if (intensity >= 6) return "#D97706";
  return "#60A5FA";
}

function ProBarChart() {
  const W = 460;
  const H = CHART_H;
  const padL = 32, padR = 12, padT = 10, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barCount = ANALYSIS_BARS.length;
  const groupW = innerW / barCount;
  const barW = groupW * 0.45;
  const gridLines = [0, 4, 8, 12];

  const staffPoints = ANALYSIS_BARS.map((bar, i) => ({
    cx: padL + i * groupW + groupW / 2,
    cy: padT + innerH - (bar.staff / MAX_VAL) * innerH,
  }));
  const polyline = staffPoints.map(p => `${p.cx},${p.cy}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {gridLines.map(v => {
        const y = padT + innerH - (v / MAX_VAL) * innerH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray={v === 0 ? "none" : "4 3"} />
            <text x={padL - 6} y={y + 4} fontSize="9" fill="#94A3B8" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {ANALYSIS_BARS.map((bar, i) => {
        const x = padL + i * groupW + (groupW - barW) / 2;
        const barH2 = (bar.intensity / MAX_VAL) * innerH;
        const y = padT + innerH - barH2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH2} fill={barColor(bar.intensity)} rx={3} opacity={0.82} />
            <text x={x + barW / 2} y={y - 3} fontSize="9" fill="#64748B" textAnchor="middle">{bar.intensity}</text>
            <text x={padL + i * groupW + groupW / 2} y={H - 4} fontSize="9" fill="#94A3B8" textAnchor="middle">{bar.label}:00</text>
          </g>
        );
      })}
      <polyline points={polyline} fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {staffPoints.map((p, i) => {
        const bar = ANALYSIS_BARS[i];
        const isShort = bar.staff < bar.intensity;
        return (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={4} fill={isShort ? "#DC2626" : "#2563EB"} stroke="#fff" strokeWidth="1.5" />
            <text x={p.cx} y={p.cy - 7} fontSize="9" fill={isShort ? "#DC2626" : "#2563EB"} textAnchor="middle" fontWeight="600">{bar.staff}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendIcon({ trend }) {
  if (trend === "up")      return <TrendingUp size={13} color="#DC2626" />;
  if (trend === "down")    return <TrendingDown size={13} color="#16A34A" />;
  if (trend === "neutral") return <Minus size={13} color="#94A3B8" />;
  return null;
}

function SkeletonKPI() {
  return (
    <div style={{ padding: "14px 16px", border: "1px solid #F1F5F9", borderLeft: "3px solid #E2E8F0", borderRadius: 10, background: "#FAFAFA" }}>
      <div style={{ height: 10, width: "70%", background: "#E2E8F0", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 24, width: "40%", background: "#E2E8F0", borderRadius: 4 }} />
    </div>
  );
}

export default function BottomPanels({ totalUnassigned, weeklyStats, weekLabel }) {
  const stats = weeklyStats;

  const kpiItems = stats
    ? [
        {
          label: "Toplam Planlanan Saat",
          value: String(stats.toplam_planlanan_saat ?? 0),
          unit: "sa", trend: null, trendVal: "",
          color: "#0F172A", accent: "#2563EB",
        },
        {
          label: "Atanmamış Slot",
          value: String(stats.atanmamis_slot ?? totalUnassigned ?? 0),
          unit: "adet",
          trend: stats.atanmamis_slot > 0 ? "up" : null,
          trendVal: stats.atanmamis_slot > 0 ? "Acil atama gerekli" : "Tüm slotlar dolu",
          color: stats.atanmamis_slot > 0 ? "#DC2626" : "#15803D",
          accent: stats.atanmamis_slot > 0 ? "#DC2626" : "#15803D",
        },
        {
          label: "Fazla Mesai",
          value: String(stats.fazla_mesai_personel ?? 0),
          unit: "personel", trend: "neutral", trendVal: "45+ saat çalışan",
          color: "#D97706", accent: "#D97706",
        },
        {
          label: "Onay Bekleyen",
          value: String(stats.bekleyen_talep ?? 0),
          unit: "talep",
          trend: stats.bekleyen_talep > 0 ? "up" : "down",
          trendVal: stats.bekleyen_talep > 0 ? "İnceleme gerekiyor" : "Temiz",
          color: "#2563EB", accent: "#2563EB",
        },
      ]
    : null;

  const dolulukOran = stats?.doluluk_oran ?? 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

      {/* Sol: Yoğunluk Analizi */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Çağrı Yoğunluğu &amp; Personel Dağılımı</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>Bu hafta · saatlik ortalama</p>
          </div>
          <Info size={14} color="#CBD5E1" />
        </div>
        <ProBarChart />
        <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
          {[
            { color: "#DC2626", label: "Kritik yoğunluk" },
            { color: "#D97706", label: "Yüksek yoğunluk" },
            { color: "#60A5FA", label: "Normal" },
            { color: "#2563EB", label: "Planlanan personel", line: true },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#64748B" }}>
              {l.line
                ? <div style={{ width: 16, height: 2, background: l.color, borderRadius: 1 }} />
                : <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2, opacity: 0.82 }} />
              }
              {l.label}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#991B1B", fontWeight: 600 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
          Salı 14:00–16:00 kritik — mevcut 6 personel, önerilen minimum: 9
        </div>
      </div>

      {/* Sağ: Haftalık Özet */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Haftalık Özet</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>{weekLabel || "Bu Hafta"}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {kpiItems
            ? kpiItems.map(item => (
                <div key={item.label} style={{ padding: "14px 16px", border: "1px solid #F1F5F9", borderLeft: `3px solid ${item.accent}`, borderRadius: 10, background: "#FAFAFA" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748B", fontWeight: 500, lineHeight: 1.3 }}>{item.label}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "6px 0 4px" }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{item.unit}</span>
                  </div>
                  {item.trend && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94A3B8" }}>
                      <TrendIcon trend={item.trend} />
                      {item.trendVal}
                    </div>
                  )}
                </div>
              ))
            : Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
          }
        </div>

        {/* Doluluk oranı */}
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Haftalık Doluluk Oranı</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>{stats ? `%${dolulukOran}` : "—"}</span>
          </div>
          <div style={{ height: 5, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${dolulukOran}%`, background: "linear-gradient(90deg, #2563EB, #60A5FA)", borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>0%</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>Hedef: %85</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>100%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
