import {
  TrendingUp, TrendingDown, Phone, Star, Wifi,
  Users, Coffee, PhoneCall, WifiOff, Minus,
} from "lucide-react";

/* ─── KPI kartı (Supervisor tarzı — beyaz, temiz) ──────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, trend, trendDir, accentColor, alarm }) {
  const color = alarm ? "#ef4444" : accentColor;

  const TrendIcon =
    trendDir === "up"   ? TrendingUp   :
    trendDir === "down" ? TrendingDown : Minus;

  const trendColor =
    trendDir === "up"   ? "#10b981" :
    trendDir === "down" ? "#ef4444" : "#94a3b8";

  return (
    <div style={{
      background: "#ffffff",
      border: alarm
        ? "1.5px solid rgba(239,68,68,0.3)"
        : "1px solid rgba(0,0,0,0.06)",
      borderRadius: 16,
      padding: "20px 20px 0",
      boxShadow: alarm
        ? "0 0 0 3px rgba(239,68,68,0.06), 0 4px 16px rgba(0,0,0,0.06)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      minHeight: 130,
    }}>
      {/* Alarm stripe */}
      {alarm && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg,#ef4444,#fca5a5)",
        }} />
      )}

      {/* Icon + Label */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}12`,
          border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={color} strokeWidth={2.2} />
        </div>
        {alarm && (
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
            color: "#ef4444", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6, padding: "3px 7px",
          }}>
            ALARM
          </span>
        )}
      </div>

      {/* Değer */}
      <div style={{
        fontSize: 32, fontWeight: 800, lineHeight: 1,
        color: alarm ? "#ef4444" : "#0f172a",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
        marginBottom: 6,
      }}>
        {value ?? "—"}
      </div>

      {/* Etiket */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
        {label}
      </div>

      {/* Alt bilgi + trend */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        {sub && (
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{sub}</span>
        )}
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <TrendIcon size={11} color={trendColor} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trend}</span>
          </div>
        )}
      </div>

      {/* Alt renk çubuğu */}
      <div style={{
        position: "absolute", bottom: 0, left: "12%", right: "12%",
        height: 3, borderRadius: "3px 3px 0 0",
        background: color, opacity: alarm ? 1 : 0.7,
      }} />
    </div>
  );
}

/* ─── Personel kompozit paneli ──────────────────────────────────────────────── */
function PersonelPanel({ hs }) {
  const mola_asimi = (hs.mola_asimi_sayisi || 0) > 0;

  const items = [
    { label: "Aktif",       value: hs.aktif   ?? 0, color: "#10b981", Icon: Users    },
    { label: "Görüşmede",   value: hs.mesgul  ?? 0, color: "#3b82f6", Icon: PhoneCall },
    { label: "Molada",      value: hs.mola    ?? 0, color: "#f59e0b", Icon: Coffee,
      alarm: mola_asimi, alarmText: `${hs.mola_asimi_sayisi} aşımda` },
    { label: "Offline",     value: hs.offline ?? 0, color: "#94a3b8", Icon: WifiOff  },
  ];

  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.06)",
      borderRadius: 16,
      padding: "18px 18px 0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      minHeight: 130,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Başlık */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: "0.07em",
        marginBottom: 14,
      }}>
        Personel Durumu
      </div>

      {/* 2×2 mini stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", flex: 1 }}>
        {items.map(({ label, value, color, Icon, alarm, alarmText }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: alarm ? "rgba(239,68,68,0.08)" : `${color}0f`,
              border: `1px solid ${alarm ? "rgba(239,68,68,0.2)" : `${color}22`}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={13} color={alarm ? "#ef4444" : color} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{
                  fontSize: 22, fontWeight: 800, lineHeight: 1,
                  color: alarm ? "#ef4444" : "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}>
                  {value}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: alarm ? "#ef4444" : color,
                }}>
                  %{Math.round(value / total * 100)}
                </span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: alarm ? "#ef4444" : "#64748b", marginTop: 1 }}>
                {alarm && alarmText ? alarmText : label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Doluluk çubuğu */}
      <div style={{ marginTop: 14, marginBottom: 0, display: "flex", height: 3, borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
        {items.map(({ label, value, color, alarm }) => {
          const pct = Math.round(value / total * 100);
          return pct > 0 ? (
            <div key={label} style={{
              width: `${pct}%`,
              background: alarm ? "#ef4444" : color,
              transition: "width 0.4s ease",
            }} />
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────────────── */
function SkeletonCard({ wide }) {
  return (
    <div style={{
      minHeight: 130,
      borderRadius: 16,
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)",
        animation: "shimmer 1.6s infinite",
        backgroundSize: "200% 100%",
      }} />
    </div>
  );
}

/* ─── Export ────────────────────────────────────────────────────────────────── */
export default function TopMetrics({ summary, headerStats, loading }) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.3fr", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        <SkeletonCard wide />
      </div>
    );
  }

  const s  = summary     || {};
  const hs = headerStats || {};

  const pct = s.trunk_limiti > 0
    ? Math.round((s.aktif_kanal / s.trunk_limiti) * 100)
    : 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.3fr", gap: 12 }}>

        <KpiCard
          icon={Phone}
          label="Bekleyen Çağrı"
          value={s.bekleyen_cagri ?? 0}
          sub="Anlık kuyruk"
          trend={s.bekleme_alarm ? "45sn+" : null}
          trendDir={s.bekleme_alarm ? "down" : null}
          accentColor="#3b82f6"
          alarm={!!s.bekleme_alarm}
        />

        <KpiCard
          icon={Wifi}
          label="Aktif Kanal"
          value={s.trunk_limiti > 0
            ? `${s.aktif_kanal ?? 0}/${s.trunk_limiti}`
            : (s.aktif_kanal ?? "—")}
          sub={s.trunk_limiti > 0 ? `%${pct} doluluk` : "Trunk yok"}
          trend={s.trunk_limiti > 0 ? `%${pct}` : null}
          trendDir={pct > 90 ? "down" : pct > 70 ? null : "up"}
          accentColor="#10b981"
          alarm={!!s.kanal_alarm}
        />

        <KpiCard
          icon={TrendingUp}
          label="Cevaplama Oranı"
          value={s.cevaplama_orani != null ? `%${s.cevaplama_orani}` : "—"}
          sub="Hedef: %80"
          trend={s.cevaplama_orani != null
            ? (s.cevaplama_orani >= 80 ? "Hedefte" : "Hedef altı")
            : null}
          trendDir={s.cevaplama_orani >= 80 ? "up" : "down"}
          accentColor={s.cevaplama_orani >= 80 ? "#10b981" : "#f59e0b"}
          alarm={s.cevaplama_orani != null && s.cevaplama_orani < 80}
        />

        <KpiCard
          icon={Star}
          label="Ort. CSAT"
          value={s.ort_csat ? `${s.ort_csat}` : "—"}
          sub="/ 5 puan"
          trend={s.ort_csat >= 4 ? "İyi" : s.ort_csat >= 3 ? "Orta" : s.ort_csat > 0 ? "Düşük" : null}
          trendDir={s.ort_csat >= 4 ? "up" : s.ort_csat > 0 && s.ort_csat < 3 ? "down" : null}
          accentColor={s.ort_csat >= 4 ? "#10b981" : s.ort_csat >= 3 ? "#f59e0b" : "#ef4444"}
          alarm={s.ort_csat > 0 && s.ort_csat < 3}
        />

        <PersonelPanel hs={hs} />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .pulse-dot { animation: pulse-glow 1.2s ease-in-out infinite !important; }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #ef4444; }
          50%       { opacity: 0.4; box-shadow: 0 0 3px #ef4444; }
        }
      `}</style>
    </>
  );
}
