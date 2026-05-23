import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from "recharts";
import { Phone, PhoneCall, PhoneMissed } from "lucide-react";

function CustomTooltip({ active, payload, label, mesaiDisiSaatler }) {
  if (!active || !payload?.length) return null;
  const isMesaiDisi = mesaiDisiSaatler?.has(label);
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
      fontSize: 12,
    }}>
      <div style={{
        fontWeight: 700, color: "#0f172a", marginBottom: 7,
        fontSize: 11, display: "flex", alignItems: "center", gap: 5,
      }}>
        {label}
        {isMesaiDisi && (
          <span style={{
            fontSize: 8.5, fontWeight: 700,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#6366f1", borderRadius: 99, padding: "1px 5px",
          }}>
            Mesai Dışı
          </span>
        )}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: p.color, flexShrink: 0,
          }} />
          <span style={{ color: "#64748b", flex: 1, fontSize: 11 }}>{p.name}</span>
          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 12 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const STAT_DEFS = [
  { key: "toplam",     label: "Toplam",     color: "#378ADD", Icon: Phone       },
  { key: "cevaplanan", label: "Cevaplanan", color: "#10b981", Icon: PhoneCall   },
  { key: "kacan",      label: "Kaçan",      color: "#ef4444", Icon: PhoneMissed },
];

export default function TrafficChart({ data }) {
  if (!data?.length) {
    return (
      <div style={{
        height: 200, display: "flex", alignItems: "center", justifyContent: "center",
        color: "#94a3b8", fontSize: 13,
      }}>
        Bugün için trafik verisi yok
      </div>
    );
  }

  // Mesai dışı saatleri set olarak tut (tooltip için)
  const mesaiDisiSaatler = new Set(
    data.filter((d) => d.mesai_disi).map((d) => d.saat)
  );

  // Mesai dışı aralıkları bul (ardışık gruplar → ReferenceArea)
  const mesaiDisiAraliklari = [];
  let aStart = null;
  data.forEach((d, i) => {
    if (d.mesai_disi && aStart === null) {
      aStart = d.saat;
    }
    if (!d.mesai_disi && aStart !== null) {
      mesaiDisiAraliklari.push({ x1: aStart, x2: data[i - 1].saat });
      aStart = null;
    }
    if (i === data.length - 1 && aStart !== null) {
      mesaiDisiAraliklari.push({ x1: aStart, x2: d.saat });
    }
  });

  const totals = data.reduce(
    (acc, d) => ({
      toplam:     acc.toplam     + (d.toplam     || 0),
      cevaplanan: acc.cevaplanan + (d.cevaplanan || 0),
      kacan:      acc.kacan      + (d.kacan      || 0),
    }),
    { toplam: 0, cevaplanan: 0, kacan: 0 }
  );

  const cevapOrani = totals.toplam > 0
    ? Math.round((totals.cevaplanan / totals.toplam) * 100)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Özet stat şeridi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STAT_DEFS.map(({ key, label, color, Icon }) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: `${color}07`,
            border: `1px solid ${color}1a`,
            borderRadius: 10, padding: "7px 13px",
            flex: 1, minWidth: 80,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: `${color}10`,
              border: `1px solid ${color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={12} color={color} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{
                fontSize: 18, fontWeight: 800, color: "#0f172a",
                lineHeight: 1, letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}>
                {totals[key]}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 1 }}>
                {label}
              </div>
            </div>
          </div>
        ))}

        {/* Cevaplama oranı */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: cevapOrani >= 80 ? "rgba(16,185,129,0.07)" : "rgba(245,158,11,0.07)",
          border: `1px solid ${cevapOrani >= 80 ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)"}`,
          borderRadius: 10, padding: "7px 13px",
          flex: 1, minWidth: 80,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: cevapOrani >= 80 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
            border: `1px solid ${cevapOrani >= 80 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
            color: cevapOrani >= 80 ? "#10b981" : "#f59e0b",
          }}>
            %
          </div>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 800, lineHeight: 1,
              letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              color: cevapOrani >= 80 ? "#10b981" : "#f59e0b",
            }}>
              {cevapOrani}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 1 }}>
              Cevaplama
            </div>
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCevaplanan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradKacan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradToplam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#378ADD" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#378ADD" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Mesai dışı arka plan bölgeleri */}
            {mesaiDisiAraliklari.map(({ x1, x2 }, i) => (
              <ReferenceArea
                key={i}
                x1={x1}
                x2={x2}
                fill="rgba(99,102,241,0.05)"
                stroke="rgba(99,102,241,0.12)"
                strokeWidth={0.5}
                label={i === 0 ? { value: "Mesai Dışı", position: "insideTopLeft", fontSize: 9, fill: "#6366f1", fontWeight: 600 } : undefined}
              />
            ))}

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="saat"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip mesaiDisiSaatler={mesaiDisiSaatler} />}
              cursor={{ stroke: "rgba(148,163,184,0.25)", strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="toplam"
              name="Toplam"
              stroke="#378ADD"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#gradToplam)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "#378ADD" }}
            />
            <Area
              type="monotone"
              dataKey="cevaplanan"
              name="Cevaplanan"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradCevaplanan)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
            />
            <Area
              type="monotone"
              dataKey="kacan"
              name="Kaçan"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#gradKacan)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#ef4444" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { color: "#378ADD", label: "Toplam",        dash: true  },
          { color: "#10b981", label: "Cevaplanan",    dash: false },
          { color: "#ef4444", label: "Kaçan",         dash: false },
          { color: "#6366f1", label: "Mesai Dışı (arka plan)", dash: false, rect: true },
        ].map(({ color, label, dash, rect }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {rect ? (
              <div style={{
                width: 14, height: 8, borderRadius: 2,
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)",
              }} />
            ) : (
              <svg width="18" height="8">
                <line
                  x1="0" y1="4" x2="18" y2="4"
                  stroke={color}
                  strokeWidth={dash ? 1.5 : 2}
                  strokeDasharray={dash ? "4 2" : "0"}
                />
              </svg>
            )}
            <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
