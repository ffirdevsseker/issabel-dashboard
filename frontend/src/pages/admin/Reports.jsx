/**
 * Admin · Sistem & Raporlar  —  /admin/reports
 *
 * Tema: diğer admin sayfalarıyla aynı (beyaz kart, #0f172a metin, pastel bg)
 * Veri kaynakları (mock yok):
 *   overviewApi.getCommand()            → trunk / SLA / kuyruk / günlük çağrı
 *   overviewApi.getHourly()             → saatlik trafik dizisi
 *   operationsApi.getAuditLogs({limit}) → supervisor denetim logları
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, Clock, Cpu,
  Download, Phone, RefreshCw, Server, Shield,
  TrendingDown, TrendingUp, CheckCircle2,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { overviewApi, operationsApi } from "@/services/api";
import { Panel } from "@/pages/admin/Overview";

/* ─── Renk paleti (diğer admin sayfalarıyla aynı) ──────────────────────────── */
const C = {
  text:    "#0f172a",
  muted:   "#94a3b8",
  faint:   "#cbd5e1",
  border:  "rgba(0,0,0,0.07)",
  borderL: "rgba(0,0,0,0.05)",
  green:   "#10b981",
  yellow:  "#f59e0b",
  red:     "#ef4444",
  blue:    "#3b82f6",
  purple:  "#8b5cf6",
  teal:    "#14b8a6",
};

const POLL_MS = 30_000;

/* ─── Aksiyon etiketi / renk ────────────────────────────────────────────────── */
const AKSIYON_MAP = {
  create:          { color: C.green,  label: "Oluştur"    },
  update:          { color: C.blue,   label: "Güncelle"   },
  delete:          { color: C.red,    label: "Sil"        },
  override:        { color: C.yellow, label: "Override"   },
  xp_correction:   { color: C.purple, label: "XP Düzelt"  },
  login:           { color: C.teal,   label: "Giriş"      },
  logout:          { color: C.muted,  label: "Çıkış"      },
  rol_degisikligi: { color: C.blue,   label: "Rol Değiş." },
  break_end:       { color: C.yellow, label: "Mola Bitir" },
};

function aksiyonStil(aksiyon) {
  return AKSIYON_MAP[aksiyon?.toLowerCase?.()]
    ?? { color: C.muted, label: aksiyon ?? "—" };
}

/* ─── CSV export (client-side blob) ────────────────────────────────────────── */
function exportCSV(logs) {
  if (!logs.length) return;
  const headers = ["ID","Tarih","Kullanıcı","Rol","Eylem","Tablo","Kayıt ID","Eski Değer","Yeni Değer"];
  const rows = logs.map((l) => [
    l.id ?? "",
    l.tarih ? new Date(l.tarih).toLocaleString("tr-TR") : "",
    l.user_ad  ?? "",
    l.user_rol ?? "",
    l.aksiyon  ?? "",
    l.tablo_adi ?? "",
    l.kayit_id ?? "",
    l.eski_deger != null ? (typeof l.eski_deger === "object" ? JSON.stringify(l.eski_deger) : String(l.eski_deger)) : "",
    l.yeni_deger != null ? (typeof l.yeni_deger === "object" ? JSON.stringify(l.yeni_deger) : String(l.yeni_deger)) : "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `denetim_loglari_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Skeleton shimmer ──────────────────────────────────────────────────────── */
function Shimmer({ h = 100, radius = 12 }) {
  return (
    <div style={{
      height: h, borderRadius: radius,
      background: "rgba(0,0,0,0.04)", overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)",
        backgroundSize: "200% 100%",
        animation: "rpShimmer 1.6s infinite",
      }} />
    </div>
  );
}

/* ─── Sağlık Kartı (açık tema) ──────────────────────────────────────────────── */
function HealthCard({ icon: Icon, label, value, sub, extra, durum, trend }) {
  const kritik  = durum === "kritik";
  const uyari   = durum === "uyari";
  const renk    = kritik ? C.red : uyari ? C.yellow : C.green;

  return (
    <div style={{
      background: "#ffffff",
      border: `1px solid ${kritik ? "rgba(239,68,68,0.22)" : uyari ? "rgba(245,158,11,0.2)" : C.border}`,
      borderTop: `3px solid ${renk}`,
      borderRadius: 14,
      boxShadow: kritik
        ? "0 2px 12px rgba(239,68,68,0.1)"
        : uyari ? "0 2px 12px rgba(245,158,11,0.08)"
        : "0 2px 12px rgba(0,0,0,0.04)",
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${renk}12`, border: `1px solid ${renk}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={renk} strokeWidth={2.3} />
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: renk,
          boxShadow: `0 0 0 3px ${renk}20`,
          animation: kritik ? "rpPulse 1.6s ease-in-out infinite" : "none",
        }} />
      </div>

      <div>
        <div style={{
          fontSize: 20, fontWeight: 800, color: renk,
          lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}>
          {value ?? "—"}
        </div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <span style={{
          color: C.muted, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        {trend === "up"   && <TrendingUp   size={13} color={C.green} />}
        {trend === "down" && <TrendingDown size={13} color={C.red}   />}
      </div>

      {extra && (
        <div style={{
          padding: "4px 8px", borderRadius: 7,
          background: "rgba(0,0,0,0.03)",
          border: `1px solid ${C.borderL}`,
          color: C.muted, fontSize: 10,
        }}>
          {extra}
        </div>
      )}
    </div>
  );
}

/* ─── Chart tooltip (açık tema) ────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const labelMap  = { toplam: "Toplam", cevaplanan: "Cevaplanan", kacan: "Kaçan" };
  const colorMap  = { toplam: C.blue,   cevaplanan: C.green,       kacan: C.red   };
  return (
    <div style={{
      background: "#ffffff",
      border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      fontSize: 12, minWidth: 130,
    }}>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ color: colorMap[p.dataKey] ?? C.muted }}>
            {labelMap[p.dataKey] ?? p.dataKey}
          </span>
          <span style={{ color: C.text, fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function AdminReports() {
  const [command,   setCommand]   = useState(null);
  const [hourly,    setHourly]    = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [spinning,  setSpinning]  = useState(false);
  const [lastSync,  setLastSync]  = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    const [cmdRes, hourRes, auditRes] = await Promise.allSettled([
      overviewApi.getCommand(),
      overviewApi.getHourly(),
      operationsApi.getAuditLogs({ limit: 100 }),
    ]);
    if (cmdRes.status   === "fulfilled") setCommand(cmdRes.value.data);
    if (hourRes.status  === "fulfilled") setHourly(hourRes.value.data  ?? []);
    if (auditRes.status === "fulfilled") setAuditLogs(auditRes.value.data ?? []);
    setLastSync(new Date());
    setLoading(false);
    if (manual) setSpinning(false);
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const trunk   = command?.trunk         ?? {};
  const sla     = command?.sla           ?? {};
  const kuyruk  = command?.kuyruk        ?? {};
  const cagri   = command?.gunluk_cagri  ?? {};
  const uyarilar = command?.uyarilar     ?? [];

  const HEALTH_CARDS = [
    {
      icon:  Server,
      label: "Trunk Durumu",
      value: trunk.aktif_kanal != null
        ? `${trunk.aktif_kanal} / ${trunk.trunk_limiti ?? "?"}`
        : "—",
      sub:   trunk.yuzde != null ? `%${trunk.yuzde} kanal doluluk` : null,
      extra: trunk.cpu > 0 ? `CPU %${trunk.cpu}  ·  RAM %${trunk.ram}` : null,
      durum: trunk.alarm_aktif ? "kritik" : trunk.yuzde > 75 ? "uyari" : "ok",
    },
    {
      icon:  Cpu,
      label: "Sistem Kaynakları",
      value: trunk.cpu != null && trunk.cpu > 0 ? `CPU  %${trunk.cpu}` : "—",
      sub:   trunk.ram != null && trunk.ram > 0 ? `RAM  %${trunk.ram}` : null,
      extra: null,
      durum: (trunk.cpu > 85 || trunk.ram > 90) ? "kritik"
           : (trunk.cpu > 70 || trunk.ram > 75) ? "uyari"
           : "ok",
    },
    {
      icon:  Shield,
      label: "SLA Durumu",
      value: sla.yuzde != null ? `%${sla.yuzde}` : "—",
      sub:   `Hedef: %${sla.hedef_yuzde ?? 80}`,
      extra: sla.karsilayan != null
        ? `${sla.karsilayan} / ${sla.toplam ?? "?"} çağrı SLA'ya uydu`
        : null,
      durum: sla.alarm ? "kritik" : sla.yuzde < 80 ? "uyari" : "ok",
    },
    {
      icon:  Phone,
      label: "Günlük Çağrı",
      value: cagri.bugun != null ? String(cagri.bugun) : "—",
      sub:   cagri.degisim_pct != null
        ? `${cagri.degisim_pct > 0 ? "+" : ""}${cagri.degisim_pct}%  dün'e göre`
        : null,
      extra: cagri.kacan != null
        ? `${cagri.kacan} kaçan  ·  ${cagri.cevaplanan} cevaplanan`
        : null,
      durum: "ok",
      trend: cagri.trend,
    },
    {
      icon:  Clock,
      label: "Kuyruk & Bekleme",
      value: kuyruk.bekleyen != null ? `${kuyruk.bekleyen} bekliyor` : "—",
      sub:   kuyruk.ort_bekleme_sn != null
        ? `Ort. ${kuyruk.ort_bekleme_sn}sn bekleme`
        : null,
      extra: kuyruk.max_bekleme_sn
        ? `Maks. ${kuyruk.max_bekleme_sn}sn`
        : null,
      durum: kuyruk.alarm ? "kritik"
           : kuyruk.ort_bekleme_sn > 30 ? "uyari"
           : "ok",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes rpShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes rpSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rpPulse {
          0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0);   }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);   }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

        {/* ── BAŞLIK SATIRI ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${C.blue}12`, border: `1px solid ${C.blue}25`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <BarChart3 size={18} color={C.blue} strokeWidth={2.3} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: 0.2 }}>
                Sistem & Raporlar
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
                Sağlık monitörü · Saatlik trafik · Denetim logları
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {lastSync && (
              <span style={{ color: C.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={11} />
                {lastSync.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => fetchAll(true)}
              disabled={spinning}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: "#ffffff",
                color: C.text, fontSize: 12, fontWeight: 700,
                cursor: spinning ? "not-allowed" : "pointer",
                opacity: spinning ? 0.6 : 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <RefreshCw
                size={13}
                style={{ animation: spinning ? "rpSpin 1s linear infinite" : "none" }}
              />
              Yenile
            </button>
            <button
              onClick={() => exportCSV(auditLogs)}
              disabled={auditLogs.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: `1px solid rgba(16,185,129,0.3)`,
                background: "rgba(16,185,129,0.06)",
                color: C.green, fontSize: 12, fontWeight: 700,
                cursor: auditLogs.length === 0 ? "not-allowed" : "pointer",
                opacity: auditLogs.length === 0 ? 0.45 : 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <Download size={13} />
              CSV Dışa Aktar
            </button>
          </div>
        </div>

        {/* ── SİSTEM SAĞLIĞI KARTLARI ───────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  background: "#ffffff", borderRadius: 14, padding: 16,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}>
                  <Shimmer h={100} />
                </div>
              ))
            : HEALTH_CARDS.map((card, i) => <HealthCard key={i} {...card} />)}
        </div>

        {/* ── UYARI BANNERLARI ──────────────────────────────────────────────── */}
        {!loading && uyarilar.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uyarilar.map((u, i) => {
              const kritik = u.seviye === "kirmizi";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px", borderRadius: 10,
                  background: kritik ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
                  border: `1px solid ${kritik ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                  borderLeft: `4px solid ${kritik ? C.red : C.yellow}`,
                }}>
                  <AlertTriangle size={14} color={kritik ? C.red : C.yellow} style={{ flexShrink: 0 }} />
                  <span style={{ color: kritik ? "#b91c1c" : "#92400e", fontSize: 13, fontWeight: 600 }}>
                    {u.mesaj}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SAATLİK TRAFİK GRAFİĞİ ───────────────────────────────────────── */}
        <Panel title="Saatlik Çağrı Yoğunluğu (Son 24 Saat)"
          accentColor={C.blue}
          badge={hourly.length > 0 ? `${hourly.length} saat` : null}>
          {loading || hourly.length === 0 ? (
            <Shimmer h={220} />
          ) : (
            <div style={{ width: "100%", height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rp_toplam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.blue}  stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="rp_cevaplanan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="rp_kacan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}   stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.red}   stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="saat"
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={{ stroke: "rgba(0,0,0,0.07)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(0,0,0,0.06)" }} />
                  <Legend
                    formatter={(val) => {
                      const m = { toplam: "Toplam", cevaplanan: "Cevaplanan", kacan: "Kaçan" };
                      return <span style={{ color: C.muted, fontSize: 11 }}>{m[val] ?? val}</span>;
                    }}
                  />
                  <Area type="monotone" dataKey="toplam"
                    stroke={C.blue} strokeWidth={2}
                    fill="url(#rp_toplam)" dot={false}
                    activeDot={{ r: 4, fill: C.blue, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="cevaplanan"
                    stroke={C.green} strokeWidth={2}
                    fill="url(#rp_cevaplanan)" dot={false}
                    activeDot={{ r: 4, fill: C.green, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="kacan"
                    stroke={C.red} strokeWidth={2}
                    fill="url(#rp_kacan)" dot={false}
                    activeDot={{ r: 4, fill: C.red, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* ── DENETİM LOG TABLOSU ───────────────────────────────────────────── */}
        <Panel
          title="Supervisor Denetim Logları (Son 7 Gün)"
          accentColor={C.purple}
          badge={auditLogs.length > 0 ? `${auditLogs.length} kayıt` : null}
          noPad
        >
          {loading ? (
            <div style={{ padding: 16 }}><Shimmer h={180} /></div>
          ) : auditLogs.length === 0 ? (
            <div style={{
              padding: "48px 0", textAlign: "center",
              color: C.muted, fontSize: 13,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <CheckCircle2 size={28} color={C.faint} />
              Son 7 günde denetim logu bulunamadı.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Tarih","Kullanıcı","Rol","Eylem","Tablo","Kayıt ID","Eski  →  Yeni"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: C.muted, fontWeight: 700,
                        fontSize: 10, letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: "nowrap",
                        background: "#f8fafc",
                        position: "sticky", top: 0,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => {
                    const st = aksiyonStil(log.aksiyon);
                    return (
                      <tr
                        key={log.id ?? i}
                        style={{ borderBottom: `1px solid ${C.borderL}`, transition: "background 0.12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Tarih */}
                        <td style={{ padding: "9px 16px", color: C.muted, whiteSpace: "nowrap", fontSize: 11.5 }}>
                          {log.tarih
                            ? new Date(log.tarih).toLocaleString("tr-TR", {
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        {/* Kullanıcı */}
                        <td style={{ padding: "9px 16px", color: C.text, fontWeight: 600, whiteSpace: "nowrap", fontSize: 12 }}>
                          {log.user_ad ?? "—"}
                        </td>
                        {/* Rol */}
                        <td style={{ padding: "9px 16px", color: C.muted, fontSize: 11.5 }}>
                          {log.user_rol ?? "—"}
                        </td>
                        {/* Eylem badge */}
                        <td style={{ padding: "9px 16px" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 9px", borderRadius: 99,
                            background: `${st.color}10`, border: `1px solid ${st.color}28`,
                            color: st.color, fontWeight: 700, fontSize: 10,
                            letterSpacing: "0.04em", whiteSpace: "nowrap",
                          }}>
                            {st.label}
                          </span>
                        </td>
                        {/* Tablo */}
                        <td style={{
                          padding: "9px 16px", color: C.muted,
                          fontFamily: "monospace", fontSize: 11,
                        }}>
                          {log.tablo_adi ?? "—"}
                        </td>
                        {/* Kayıt ID */}
                        <td style={{
                          padding: "9px 16px", color: C.muted,
                          fontFamily: "monospace", fontSize: 11,
                        }}>
                          {log.kayit_id
                            ? log.kayit_id.length > 8
                              ? log.kayit_id.slice(0, 8) + "…"
                              : log.kayit_id
                            : "—"}
                        </td>
                        {/* Eski → Yeni */}
                        <td style={{ padding: "9px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
                            {log.eski_deger != null && (
                              <span style={{
                                maxWidth: 90, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                display: "block",
                                background: "rgba(239,68,68,0.07)",
                                border: "1px solid rgba(239,68,68,0.18)",
                                color: "#dc2626",
                                padding: "1px 6px", borderRadius: 5,
                                fontFamily: "monospace", fontSize: 10,
                              }}>
                                {typeof log.eski_deger === "object"
                                  ? JSON.stringify(log.eski_deger)
                                  : String(log.eski_deger)}
                              </span>
                            )}
                            {log.eski_deger != null && log.yeni_deger != null && (
                              <span style={{ color: C.faint, fontSize: 11, flexShrink: 0 }}>→</span>
                            )}
                            {log.yeni_deger != null && (
                              <span style={{
                                maxWidth: 90, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                display: "block",
                                background: "rgba(16,185,129,0.07)",
                                border: "1px solid rgba(16,185,129,0.18)",
                                color: "#059669",
                                padding: "1px 6px", borderRadius: 5,
                                fontFamily: "monospace", fontSize: 10,
                              }}>
                                {typeof log.yeni_deger === "object"
                                  ? JSON.stringify(log.yeni_deger)
                                  : String(log.yeni_deger)}
                              </span>
                            )}
                            {log.eski_deger == null && log.yeni_deger == null && (
                              <span style={{ color: C.faint }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

      </div>
    </>
  );
}
