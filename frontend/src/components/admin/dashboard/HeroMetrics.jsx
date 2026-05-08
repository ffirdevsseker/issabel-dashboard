import { Minus, Phone, PhoneMissed, TrendingDown, TrendingUp } from "lucide-react";

/* ─── Dairesel SLA progress (SVG) ──────────────────────────────────────────── */
function CircularProgress({ pct, size = 72, alarm }) {
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - Math.min(pct, 100) / 100);
  const color = alarm       ? "#ef4444"
              : pct >= 80   ? "#10b981"
              : pct >= 60   ? "#f59e0b"
              :               "#ef4444";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={7}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 0,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 900, lineHeight: 1,
          color: color,
          fontVariantNumeric: "tabular-nums",
        }}>
          %{pct}
        </span>
      </div>
    </div>
  );
}

/* ─── Trend okları ─────────────────────────────────────────────────────────── */
function Trend({ pct, dir }) {
  if (!pct && pct !== 0) return null;
  const Icon  = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "#10b981"  : dir === "down" ? "#ef4444"    : "#94a3b8";
  const label = pct > 0 ? `+%${Math.abs(pct)}` : `%${Math.abs(pct)}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <Icon size={11} color={color} strokeWidth={2.5} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

/* ─── Kart iskeleti ─────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      minHeight: 150, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
      }} />
    </div>
  );
}

/* ─── Tek hero kart ─────────────────────────────────────────────────────────── */
function HeroCard({ children, alarm, accent = "#3b82f6", noBadge }) {
  return (
    <div style={{
      background:   "#fff",
      border:       alarm
        ? "1.5px solid rgba(239,68,68,0.28)"
        : "1px solid rgba(0,0,0,0.06)",
      borderRadius: 18,
      boxShadow:    alarm
        ? "0 0 0 3px rgba(239,68,68,0.05), 0 4px 16px rgba(0,0,0,0.06)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      overflow:     "hidden",
      position:     "relative",
      display:      "flex",
      flexDirection: "column",
    }}>
      {/* Üst renk çizgisi */}
      <div style={{
        height:     3,
        flexShrink: 0,
        background: alarm
          ? "linear-gradient(90deg,#ef4444,#fca5a5)"
          : `linear-gradient(90deg,${accent},${accent}44)`,
        borderRadius: "18px 18px 0 0",
      }} />
      {alarm && !noBadge && (
        <div style={{
          position: "absolute", top: 12, right: 14,
          fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
          color: "#ef4444", background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 6, padding: "2px 7px",
        }}>
          ALARM
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── KART 1: Günlük Toplam Çağrı ─────────────────────────────────────────── */
function GunlukCagriCard({ d }) {
  const g = d?.gunluk_cagri || {};
  return (
    <HeroCard accent="#378ADD">
      <div style={{ padding: "18px 20px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: "rgba(55,138,221,0.1)",
            border: "1px solid rgba(55,138,221,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Phone size={17} color="#378ADD" strokeWidth={2.2} />
          </div>
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em",
          color: "#0f172a", fontVariantNumeric: "tabular-nums", marginBottom: 6,
        }}>
          {(g.bugun ?? 0).toLocaleString("tr-TR")}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 10 }}>
          Günlük Toplam Çağrı
        </div>
        {/* Alt bilgi satırı */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
            Dün: {(g.dun ?? 0).toLocaleString("tr-TR")} çağrı
          </span>
          <Trend pct={Math.abs(g.degisim_pct ?? 0)} dir={g.trend} />
        </div>
        {/* Mini bar: cevaplanan / kaçan */}
        {g.bugun > 0 && (
          <div style={{ marginTop: 12, display: "flex", height: 4, borderRadius: 99, overflow: "hidden", background: "rgba(0,0,0,0.06)" }}>
            <div style={{
              width: `${Math.round((g.cevaplanan || 0) / g.bugun * 100)}%`,
              background: "#10b981",
              transition: "width 0.5s ease",
            }} />
            <div style={{
              width: `${Math.round((g.kacan || 0) / g.bugun * 100)}%`,
              background: "#ef4444",
              transition: "width 0.5s ease",
            }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>
            ✓ {g.cevaplanan ?? 0}
          </span>
          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>
            ✗ {g.kacan ?? 0}
          </span>
        </div>
      </div>
    </HeroCard>
  );
}

/* ─── KART 2: SLA Karşılama Oranı ─────────────────────────────────────────── */
function SlaCard({ d }) {
  const s = d?.sla || {};
  const pct = s.yuzde ?? 0;
  const alarm = s.alarm;
  const color = alarm ? "#ef4444" : pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <HeroCard alarm={alarm} accent={color} noBadge>
      <div style={{ padding: "18px 20px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                SLA Karşılama
              </span>
              {alarm && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                  color: "#ef4444", background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6, padding: "2px 7px",
                }}>
                  ALARM
                </span>
              )}
            </div>
            <div style={{
              fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em",
              color: color, fontVariantNumeric: "tabular-nums", marginBottom: 4,
            }}>
              %{pct}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>
              45 sn altında bağlantı
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 700,
              background: pct >= 80 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${pct >= 80 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              color: pct >= 80 ? "#10b981" : "#f59e0b",
              borderRadius: 99, padding: "3px 9px",
            }}>
              Hedef: %{s.hedef_yuzde ?? 80}
            </div>
          </div>
          <CircularProgress pct={pct} alarm={alarm} />
        </div>
        <div style={{ marginTop: 12, fontSize: 10.5, color: "#94a3b8", fontWeight: 500 }}>
          {s.karsilayan ?? 0} / {s.toplam ?? 0} çağrı eşik altında
        </div>
      </div>
    </HeroCard>
  );
}

/* ─── KART 3: Kaçan Çağrılar ──────────────────────────────────────────────── */
function KacanCard({ d }) {
  const k = d?.kacan || {};
  const alarm = k.alarm;

  return (
    <HeroCard alarm={alarm} accent="#ef4444">
      <div style={{ padding: "18px 20px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: "rgba(239,68,68,0.09)",
            border: "1px solid rgba(239,68,68,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PhoneMissed size={17} color="#ef4444" strokeWidth={2.2} />
          </div>
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em",
          color: alarm ? "#ef4444" : "#0f172a",
          fontVariantNumeric: "tabular-nums", marginBottom: 6,
        }}>
          {(k.sayi ?? 0).toLocaleString("tr-TR")}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 10 }}>
          Kaçan Çağrılar
        </div>
        {/* Ciro kaybı */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.12)",
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            Tahmini Ciro Kaybı:
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#dc2626" }}>
            ₺{(k.tahmini_ciro ?? 0).toLocaleString("tr-TR")}
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
          ₺{k.ciro_per_cagri ?? 50} / kaçan çağrı (tahmini)
        </div>
      </div>
    </HeroCard>
  );
}

/* ─── KART 4: Aktif Kuyruk Bekleyen ──────────────────────────────────────── */
function KuyrukCard({ d }) {
  const k = d?.kuyruk || {};
  const alarm = k.alarm;
  const color = alarm ? "#ef4444" : k.bekleyen > 5 ? "#f59e0b" : "#10b981";

  return (
    <HeroCard alarm={alarm} accent={color}>
      <div style={{ padding: "18px 20px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          {/* Durum noktası */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: color,
              boxShadow: `0 0 0 3px ${color}28`,
              animation: alarm ? "pulseKuyruk 1.2s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {alarm ? "KRİTİK" : k.bekleyen > 5 ? "YOĞUN" : "NORMAL"}
            </span>
          </div>
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em",
          color: alarm ? "#ef4444" : "#0f172a",
          fontVariantNumeric: "tabular-nums", marginBottom: 6,
        }}>
          {(k.bekleyen ?? 0).toLocaleString("tr-TR")}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 12 }}>
          Anlık Kuyruk Bekleyen
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: alarm ? "#ef4444" : "#0f172a", fontVariantNumeric: "tabular-nums" }}>
              {k.ort_bekleme_sn ?? 0}sn
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Ort. Bekleme</div>
          </div>
          {k.max_bekleme_sn > 0 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: k.max_bekleme_sn > 90 ? "#ef4444" : "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {k.max_bekleme_sn}sn
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Maks. Bekleme</div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulseKuyruk {
          0%,100% { opacity:1; box-shadow: 0 0 0 3px rgba(239,68,68,0.25); }
          50%      { opacity:.6; box-shadow: 0 0 0 1px rgba(239,68,68,0.1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </HeroCard>
  );
}

/* ─── Export ────────────────────────────────────────────────────────────────── */
export default function HeroMetrics({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <GunlukCagriCard d={data} />
      <SlaCard         d={data} />
      <KacanCard       d={data} />
      <KuyrukCard      d={data} />
    </div>
  );
}
