/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · SİSTEM SAĞLIĞI & AI ANALİZ  (/admin/system-health)
   ────────────────────────────────────────────────────────────────────────────
   Paneller:
     · Sistem durum kartları (trunk / CPU / bellek / DB)
     · Çağrı özeti (bugün vs dün)
     · Risk uyarıları (AI tabanlı eşik aşımı)
     · Saatlik yoğunluk karşılaştırması (7 günlük ort. vs bugün — div bar)
     · En düşük CSAT'li personel listesi
     · "AI Önerilerini Otomatik Uygula" toggle (görsel)

   Veri: GET /admin/system/ai-insights  (system_health.py backend)
   Tema: mevcut admin inline-style sistemi + Panel bileşeni (Overview.jsx)
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { systemHealthApi } from "@/services/api";
import { Panel }           from "@/pages/admin/Overview";

/* ─── Renk tablosu ───────────────────────────────────────────────────────── */
const RENK = {
  yesil:   { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  label: "Sağlıklı" },
  sari:    { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Dikkat"   },
  kirmizi: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   label: "Kritik"   },
  tamam:   { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  label: "Normal"   },
  uyari:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Uyarı"    },
  kritik:  { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   label: "Kritik"   },
};

const POLL_MS = 30_000;

/* ─── Shimmer ────────────────────────────────────────────────────────────── */
function Shimmer({ h = 48, mb = 0 }) {
  return (
    <>
      <div style={{
        height: h, borderRadius: 10, marginBottom: mb,
        background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shim 1.4s infinite",
      }} />
      <style>{`@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}

/* ─── Sistem Sağlık Kartı ────────────────────────────────────────────────── */
function SaglikKart({ baslik, deger, alt, renk = "yesil" }) {
  const r = RENK[renk] ?? RENK.yesil;
  return (
    <div style={{
      flex: "1 1 160px", minWidth: 130,
      background: "#fff",
      border: `1px solid ${r.border}`,
      borderRadius: 12,
      borderTop: `3px solid ${r.color}`,
      padding: "16px 20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {baslik}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 800,
          color: r.color, background: r.bg,
          borderRadius: 99, padding: "2px 8px",
          border: `1px solid ${r.border}`,
        }}>
          {r.label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: 4 }}>
        {deger}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{alt}</div>
    </div>
  );
}

/* ─── Risk Uyarı Satırı ─────────────────────────────────────────────────── */
function RiskRow({ risk }) {
  const r = RENK[risk.seviye] ?? RENK.uyari;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "10px 14px", borderRadius: 8,
      background: r.bg, border: `1px solid ${r.border}`,
      borderLeft: `4px solid ${r.color}`,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
        {risk.ikon}
      </span>
      <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>
        {risk.mesaj}
      </span>
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────────────────── */
function HourlyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ort   = payload.find(p => p.dataKey === "ort")?.value   ?? 0;
  const bugun = payload.find(p => p.dataKey === "bugun")?.value ?? 0;
  const fark  = bugun - ort;
  const farkPct = ort > 0 ? Math.round((fark / ort) * 100) : null;
  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 10, padding: "10px 12px", minWidth: 160,
      boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "0.04em" }}>
        SAAT {label}:00
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, marginBottom: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#cbd5e1" }} />
          7 Gün Ort.
        </span>
        <strong style={{ color: "#475569", fontVariantNumeric: "tabular-nums" }}>{ort.toFixed(1)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6" }} />
          Bugün
        </span>
        <strong style={{ color: "#1d4ed8", fontVariantNumeric: "tabular-nums" }}>{bugun}</strong>
      </div>
      {farkPct !== null && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,0.08)",
          fontSize: 10.5, color: fark >= 0 ? "#059669" : "#dc2626",
          fontWeight: 700,
        }}>
          {fark >= 0 ? "▲" : "▼"} ort. {fark >= 0 ? "+" : ""}{farkPct}%
        </div>
      )}
    </div>
  );
}

/* ─── Saatlik trend grafiği (recharts) ───────────────────────────────────── */
function HourlyChart({ ortalama, bugun }) {
  const ortMap   = Object.fromEntries((ortalama || []).map(r => [r.saat, r.ort]));
  const bugunMap = Object.fromEntries((bugun    || []).map(r => [r.saat, r.cagri]));

  const hasData = Object.values(ortMap).some(v => v > 0)
               || Object.values(bugunMap).some(v => v > 0);

  if (!hasData) {
    return (
      <div style={{
        padding: "48px 0", textAlign: "center",
        color: "#94a3b8", fontSize: 13,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      }}>
        <Activity size={26} color="#e2e8f0" />
        Henüz yeterli saatlik veri yok.
      </div>
    );
  }

  // 0-23 saat sabit eksen
  const rows = Array.from({ length: 24 }, (_, h) => ({
    saat:  String(h).padStart(2, "0"),
    ort:   Math.round((ortMap[h] ?? 0) * 10) / 10,
    bugun: bugunMap[h] ?? 0,
  }));

  return (
    <div style={{ width: "100%", height: 240, marginTop: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={3}>
          <defs>
            <linearGradient id="hh-bugun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity={1}    />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.75} />
            </linearGradient>
            <linearGradient id="hh-ort" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#cbd5e1" stopOpacity={1}    />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.7}  />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis
            dataKey="saat"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            content={<HourlyTooltip />}
            cursor={{ fill: "rgba(99,102,241,0.06)" }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span style={{ fontSize: 11, color: "#64748b", marginRight: 8 }}>
                {val === "ort" ? "7 Günlük Ortalama" : "Bugün"}
              </span>
            )}
          />
          <Bar
            dataKey="ort"
            name="ort"
            fill="url(#hh-ort)"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
          />
          <Bar
            dataKey="bugun"
            name="bugun"
            fill="url(#hh-bugun)"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── CSAT Personel Satırı ───────────────────────────────────────────────── */
function CsatRow({ kisi, rank }) {
  const pct  = Math.round((kisi.ort_csat / 5) * 100);
  const renk = kisi.ort_csat < 3 ? "#ef4444" : kisi.ort_csat < 4 ? "#f59e0b" : "#10b981";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "9px 12px", borderRadius: 8,
      background: rank === 1 ? "rgba(239,68,68,0.04)" : "transparent",
      border: rank === 1 ? "1px solid rgba(239,68,68,0.12)" : "1px solid transparent",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 800, color: "#94a3b8",
        width: 16, textAlign: "center", flexShrink: 0,
      }}>
        #{rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {kisi.ad_soyad}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Dahili {kisi.dahili_no || "—"} · {kisi.cagri_sayisi} çağrı
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: renk }}>
          {kisi.ort_csat.toFixed(1)}<span style={{ fontSize: 10, color: "#94a3b8" }}>/5</span>
        </div>
        {/* mini bar */}
        <div style={{ width: 60, height: 4, borderRadius: 2, background: "#f1f5f9", marginTop: 4 }}>
          <div style={{
            width: `${pct}%`, height: "100%", borderRadius: 2,
            background: renk, transition: "width 0.4s",
          }} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function SystemHealthPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoApply,  setAutoApply]  = useState(false);

  const fetchData = useCallback(async (signal) => {
    try {
      const r = await systemHealthApi.getInsights(signal);
      if (signal?.aborted) return;
      setData(r.data);
      setLastUpdate(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      if (e?.name === "AbortError" || e?.code === "ERR_CANCELED") return;
      console.error("system-health fetch error:", e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    const t = setInterval(() => fetchData(ctrl.signal), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, [fetchData]);

  const ozet     = data?.cagri_ozeti  ?? {};
  const riskler  = data?.riskler      ?? [];
  const sistem   = data?.sistem       ?? [];
  const dusukCsat = data?.dusuk_csat  ?? [];

  const kritikRisk = riskler.some(r => r.seviye === "kritik" || r.seviye === "kirmizi");

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: "24px 28px", minHeight: "100%", background: "#f8fafc" }}>

      {/* ── Başlık ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 24, gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(99,102,241,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BrainCircuit size={18} color="#6366f1" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Sistem Sağlığı
            </h1>
            {kritikRisk && (
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: "rgba(239,68,68,0.1)", color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 99, padding: "2px 10px", marginLeft: 4,
              }}>
                KRİTİK UYARI
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            AI destekli sistem izleme · {lastUpdate ? `Son güncelleme ${lastUpdate}` : "Yükleniyor…"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {/* AI auto-apply toggle */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 8,
            background: autoApply ? "rgba(99,102,241,0.08)" : "#fff",
            border: `1px solid ${autoApply ? "rgba(99,102,241,0.25)" : "rgba(0,0,0,0.1)"}`,
          }}>
            <Zap size={13} color={autoApply ? "#6366f1" : "#94a3b8"} />
            <span style={{ fontSize: 12, fontWeight: 600, color: autoApply ? "#6366f1" : "#64748b", whiteSpace: "nowrap" }}>
              AI Otomatik
            </span>
            <button
              onClick={() => setAutoApply(v => !v)}
              style={{
                width: 34, height: 18, borderRadius: 99, border: "none",
                background: autoApply ? "#6366f1" : "#e2e8f0",
                cursor: "pointer", position: "relative", flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 2,
                left: autoApply ? 18 : 2,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          <button
            onClick={fetchData}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)", background: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "#64748b",
            }}
          >
            <RefreshCw size={13} /> Yenile
          </button>
        </div>
      </div>

      {/* ── Sistem Sağlık Kartları ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {loading
          ? [1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: "1 1 150px", minWidth: 130 }}>
                <Shimmer h={82} />
              </div>
            ))
          : sistem.map(k => (
              <SaglikKart key={k.baslik} {...k} />
            ))
        }
      </div>

      {/* ── Ana grid (2 sütun) ─────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 16,
      }}>

        {/* ── Çağrı Özeti ──────────────────────────────────────────────── */}
        <Panel title="📊 Çağrı Özeti (Bugün vs Dün)" accentColor="#3b82f6">
          {loading ? (
            <Shimmer h={90} />
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                {
                  label: "Bugün",
                  value: ozet.bugun ?? 0,
                  sub: "toplam çağrı",
                  color: "#3b82f6",
                },
                {
                  label: "Dün",
                  value: ozet.dun ?? 0,
                  sub: "toplam çağrı",
                  color: "#94a3b8",
                },
                {
                  label: "Fark",
                  value: `${ozet.fark_yuzde >= 0 ? "+" : ""}${ozet.fark_yuzde}%`,
                  sub: "bugün vs dün",
                  color: (ozet.fark_yuzde ?? 0) > 0 ? "#f59e0b" : "#10b981",
                },
                {
                  label: "Cevaplama",
                  value: `%${ozet.cevaplama_orani ?? 0}`,
                  sub: "oran",
                  color: (ozet.cevaplama_orani ?? 100) >= 80 ? "#10b981" : "#ef4444",
                },
              ].map(s => (
                <div key={s.label} style={{
                  flex: "1 1 100px",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Risk Uyarıları ────────────────────────────────────────────── */}
        <Panel
          title="⚡ AI Risk Analizi"
          accentColor={kritikRisk ? "#ef4444" : "#f59e0b"}
          badge={riskler.filter(r => r.seviye !== "tamam").length || undefined}
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Shimmer h={40} /><Shimmer h={40} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {riskler.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontSize: 13 }}>
                  <CheckCircle2 size={16} /> Tüm göstergeler normal
                </div>
              ) : (
                riskler.map((r, i) => <RiskRow key={i} risk={r} />)
              )}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Alt grid ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 16,
      }}>

        {/* ── Saatlik Yoğunluk Karşılaştırması ────────────────────────── */}
        <Panel
          title="⏱ Saatlik Yoğunluk (7 Günlük Ort. vs Bugün)"
          accentColor="#6366f1"
        >
          {loading ? (
            <Shimmer h={240} />
          ) : (
            <HourlyChart
              ortalama={data?.saatlik_trend}
              bugun={data?.bugun_saatlik}
            />
          )}
        </Panel>

        {/* ── En Düşük CSAT ────────────────────────────────────────────── */}
        <Panel
          title="📉 Düşük CSAT Performans"
          accentColor="#f59e0b"
          badge={dusukCsat.length || undefined}
          action={
            <span style={{ fontSize: 10, color: "#94a3b8" }}>son 7 gün · min 5 çağrı</span>
          }
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => <Shimmer key={i} h={50} />)}
            </div>
          ) : dusukCsat.length === 0 ? (
            <div style={{
              padding: "20px 0", textAlign: "center",
              color: "#94a3b8", fontSize: 13,
            }}>
              <CheckCircle2 size={28} color="#d1fae5" style={{ marginBottom: 8 }} />
              <div>Yeterli veri yok ya da herkes iyi performans gösteriyor</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dusukCsat.map((k, i) => (
                <CsatRow key={k.dahili_no ?? i} kisi={k} rank={i + 1} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── AI Önerisi footer ─────────────────────────────────────────────── */}
      {autoApply && (
        <div style={{
          marginTop: 16, padding: "12px 20px", borderRadius: 10,
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <BrainCircuit size={16} color="#6366f1" />
          <span style={{ fontSize: 13, color: "#4f46e5", fontWeight: 500 }}>
            AI Otomatik Öneri modu aktif — risk uyarıları süpervizörlere anlık iletilecek
          </span>
        </div>
      )}
    </div>
  );
}
