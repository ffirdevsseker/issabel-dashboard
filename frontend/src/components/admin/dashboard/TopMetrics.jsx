import { AlertTriangle, Phone, Star, TrendingUp, Wifi } from "lucide-react";

function MetricCard({ icon: Icon, label, value, sub, color, alarm }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, #132334 0%, #162c44 100%)",
      border: `1px solid ${alarm ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.07)"}`,
      borderLeft: `3px solid ${alarm ? "#ef4444" : color}`,
      borderRadius: 14,
      padding: "18px 18px 16px",
      boxShadow: alarm
        ? "0 0 24px rgba(239,68,68,0.12), 0 6px 24px rgba(0,0,0,0.3)"
        : "0 6px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
      position: "relative",
      overflow: "hidden",
      transition: "box-shadow 0.3s",
    }}>
      {/* Background glow blob */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 90, height: 90, borderRadius: "50%",
        background: `${alarm ? "#ef4444" : color}`,
        opacity: 0.06, filter: "blur(24px)",
        pointerEvents: "none",
      }} />

      {alarm && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, #ef4444 0%, transparent 70%)`,
        }} />
      )}

      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${alarm ? "#ef4444" : color}16`,
            border: `1px solid ${alarm ? "#ef4444" : color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 12px ${alarm ? "#ef4444" : color}20`,
          }}>
            <Icon size={16} color={alarm ? "#ef4444" : color} />
          </div>
          {alarm && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#ef4444", display: "inline-block",
                boxShadow: "0 0 8px #ef4444",
              }} className="pulse-dot" />
              <AlertTriangle size={12} color="#ef4444" />
            </div>
          )}
        </div>

        <div style={{
          color: alarm ? "#ef4444" : color,
          fontSize: 34, fontWeight: 900, lineHeight: 1, marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 20px ${alarm ? "rgba(239,68,68,0.35)" : `${color}35`}`,
        }}>
          {value ?? "—"}
        </div>
        <div style={{ color: "#c7d4e4", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" }}>
          {label}
        </div>
        {sub && (
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      height: 118, borderRadius: 14,
      background: "linear-gradient(160deg, #132334 0%, #162c44 100%)",
      border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
    }} />
  );
}

export default function TopMetrics({ summary, loading }) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const s = summary || {};
  const pct = s.trunk_limiti > 0 ? Math.round((s.aktif_kanal / s.trunk_limiti) * 100) : 0;
  const kanaliAlarm = pct > 90;
  const csatAlarm = s.ort_csat > 0 && s.ort_csat < 3;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      <MetricCard
        icon={Phone}
        label="Bekleyen Çağrı"
        value={s.bekleyen_cagri ?? 0}
        sub={s.bekleme_alarm ? "Bekleme süresi kritik!" : "Anlık kuyruk"}
        color="#378ADD"
        alarm={!!s.bekleme_alarm}
      />
      <MetricCard
        icon={Wifi}
        label="Aktif Kanal"
        value={s.trunk_limiti > 0 ? `${s.aktif_kanal ?? 0} / ${s.trunk_limiti}` : (s.aktif_kanal ?? "—")}
        sub={s.trunk_limiti > 0 ? `%${pct} kapasite doluluk` : "Trunk bilgisi yok"}
        color="#34d399"
        alarm={kanaliAlarm}
      />
      <MetricCard
        icon={TrendingUp}
        label="Cevaplama Oranı"
        value={s.cevaplama_orani != null ? `%${s.cevaplama_orani}` : "—"}
        sub="Hedef: %80 üzeri"
        color={s.cevaplama_orani >= 80 ? "#34d399" : "#f59e0b"}
        alarm={s.cevaplama_orani != null && s.cevaplama_orani < 80}
      />
      <MetricCard
        icon={Star}
        label="Ort. CSAT"
        value={s.ort_csat ? String(s.ort_csat) : "—"}
        sub="/ 5 müşteri puanı"
        color={csatAlarm ? "#ef4444" : "#f59e0b"}
        alarm={csatAlarm}
      />
    </div>
  );
}
