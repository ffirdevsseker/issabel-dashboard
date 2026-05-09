/**
 * Admin · Sistem & Raporlar — DevOps Komuta Ekranı
 *
 * Veri kaynakları (mock yok):
 *   overviewApi.getCommand()              → trunk / SLA / kuyruk / günlük çağrı
 *   overviewApi.getHourly()               → saatlik trafik dizisi
 *   operationsApi.getAuditLogs({limit})   → supervisor denetim logları (doğru SQL)
 *
 * CSV export tamamen client-side (blob) — ek endpoint gerektirmez.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Cpu,
  Download,
  HardDrive,
  Phone,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { overviewApi, operationsApi } from "@/services/api";

/* ─── Sabitler ─────────────────────────────────────────────────────────────── */
const POLL_MS = 30_000;

/* ─── Renk paleti (Layout.jsx sidebar renkleriyle eşleşiyor) ──────────────── */
const C = {
  bg0:    "#0d1e2c",
  bg1:    "#132334",
  bg2:    "#18293a",
  bg3:    "#1e3047",
  border: "rgba(255,255,255,0.07)",
  text:   "#e2e8f0",
  muted:  "rgba(255,255,255,0.42)",
  green:  "#10b981",
  yellow: "#f59e0b",
  red:    "#ef4444",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  teal:   "#14b8a6",
};

/* ─── Aksiyon etiket / renk haritası ──────────────────────────────────────── */
const AKSIYON_MAP = {
  create:          { color: C.green,  label: "Oluştur"    },
  update:          { color: C.blue,   label: "Güncelle"   },
  delete:          { color: C.red,    label: "Sil"        },
  override:        { color: C.yellow, label: "Override"   },
  xp_correction:   { color: C.purple, label: "XP Düzelt"  },
  login:           { color: C.teal,   label: "Giriş"      },
  logout:          { color: "#94a3b8", label: "Çıkış"     },
  rol_degisikligi: { color: C.blue,   label: "Rol Değiş." },
  break_end:       { color: C.yellow, label: "Mola Bitir" },
};

function aksiyonStil(aksiyon) {
  return AKSIYON_MAP[aksiyon?.toLowerCase?.()]
    ?? { color: "#94a3b8", label: aksiyon ?? "—" };
}

/* ─── Sağlık rengi ─────────────────────────────────────────────────────────── */
function saglikRenk(durum) {
  if (durum === "kritik") return C.red;
  if (durum === "uyari")  return C.yellow;
  return C.green;
}

/* ─── CSV export (client-side blob) ───────────────────────────────────────── */
function exportCSV(logs) {
  if (!logs.length) return;
  const headers = ["ID", "Tarih", "Kullanıcı", "Rol", "Eylem", "Tablo", "Kayıt ID", "Eski Değer", "Yeni Değer"];
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

/* ─── Shimmer (yükleniyor placeholder) ────────────────────────────────────── */
function Shimmer({ h = 100 }) {
  return (
    <div
      style={{
        height:     h,
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        overflow:   "hidden",
        position:   "relative",
      }}
    >
      <div
        style={{
          position:           "absolute",
          inset:              0,
          background:         "linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)",
          backgroundSize:     "200% 100%",
          animation:          "rpShimmer 1.6s infinite",
        }}
      />
    </div>
  );
}

/* ─── Dark Panel sarmalayıcı ───────────────────────────────────────────────── */
function Panel({ title, icon, accent = C.blue, badge, children, noPad }) {
  return (
    <div
      style={{
        background:   C.bg1,
        border:       `1px solid ${C.border}`,
        borderRadius: 14,
        overflow:     "hidden",
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},${accent}44)` }} />
      <div
        style={{
          padding:        "12px 18px",
          borderBottom:   `1px solid ${C.border}`,
          display:        "flex",
          alignItems:     "center",
          gap:            8,
        }}
      >
        <span style={{ color: accent, display: "flex" }}>{icon}</span>
        <span style={{ color: C.text, fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</span>
        {badge != null && (
          <span
            style={{
              background:   `${accent}18`,
              border:       `1px solid ${accent}33`,
              color:        accent,
              fontSize:     10,
              fontWeight:   700,
              padding:      "2px 9px",
              borderRadius: 99,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: noPad ? 0 : "16px 18px" }}>{children}</div>
    </div>
  );
}

/* ─── Sağlık Kartı ─────────────────────────────────────────────────────────── */
function HealthCard({ icon: Icon, label, value, sub, extra, durum, trend }) {
  const renk      = saglikRenk(durum);
  const isCritik  = durum === "kritik";
  const isUyari   = durum === "uyari";
  const glowColor = isCritik ? "rgba(239,68,68,0.25)" : isUyari ? "rgba(245,158,11,0.2)" : "transparent";

  return (
    <div
      style={{
        background:     C.bg2,
        border:         `1px solid ${isCritik ? "rgba(239,68,68,0.3)" : isUyari ? "rgba(245,158,11,0.25)" : C.border}`,
        borderRadius:   14,
        padding:        "14px 16px",
        display:        "flex",
        flexDirection:  "column",
        gap:            8,
        position:       "relative",
        overflow:       "hidden",
        boxShadow:      (isCritik || isUyari) ? `0 0 18px ${glowColor}` : "none",
      }}
    >
      {/* Üst şerit */}
      {(isCritik || isUyari) && (
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     2,
            background: `linear-gradient(90deg,${renk},${renk}44)`,
          }}
        />
      )}

      {/* İkon + durum noktası */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width:           32,
            height:          32,
            borderRadius:    9,
            background:      `${renk}18`,
            border:          `1px solid ${renk}30`,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <Icon style={{ width: 15, height: 15, color: renk }} />
        </div>
        <div
          style={{
            width:      8,
            height:     8,
            borderRadius: "50%",
            background: renk,
            boxShadow:  `0 0 0 3px ${renk}30`,
            animation:  isCritik ? "rpPulse 1.6s ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* Değer */}
      <div>
        <div style={{ color: C.text, fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>
          {value ?? "—"}
        </div>
        {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>

      {/* Etiket + trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <span
          style={{
            color:         C.muted,
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        {trend === "up"   && <TrendingUp   style={{ width: 13, height: 13, color: C.green }} />}
        {trend === "down" && <TrendingDown style={{ width: 13, height: 13, color: C.red   }} />}
      </div>

      {/* Ek bilgi */}
      {extra && (
        <div
          style={{
            padding:      "4px 8px",
            borderRadius: 7,
            background:   "rgba(0,0,0,0.22)",
            color:        C.muted,
            fontSize:     10,
          }}
        >
          {extra}
        </div>
      )}
    </div>
  );
}

/* ─── Tooltip özelleştirme (recharts) ─────────────────────────────────────── */
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const labelMap = { toplam: "Toplam", cevaplanan: "Cevaplanan", kacan: "Kaçan" };
  const colorMap = { toplam: C.blue, cevaplanan: C.green, kacan: C.red };
  return (
    <div
      style={{
        background:   C.bg2,
        border:       `1px solid ${C.border}`,
        borderRadius: 10,
        padding:      "10px 14px",
        fontSize:     12,
        minWidth:     130,
      }}
    >
      <div style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ color: colorMap[p.dataKey] ?? C.muted }}>{labelMap[p.dataKey] ?? p.dataKey}</span>
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

  /* Türetilmiş değerler */
  const trunk  = command?.trunk         ?? {};
  const sla    = command?.sla           ?? {};
  const kuyruk = command?.kuyruk        ?? {};
  const cagri  = command?.gunluk_cagri  ?? {};
  const uyarilar = command?.uyarilar    ?? [];

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

  /* ── Render ──────────────────────────────────────────────────────────────── */
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
          0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.6); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0);   }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);   }
        }
      `}</style>

      <div
        style={{
          minHeight:      "100%",
          background:     `linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 55%,${C.bg0} 100%)`,
          borderRadius:   16,
          padding:        "24px 24px 36px",
          display:        "flex",
          flexDirection:  "column",
          gap:            20,
        }}
      >

        {/* ══ BAŞLIK SATIRI ════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width:           38,
                height:          38,
                borderRadius:    11,
                background:      "rgba(59,130,246,0.15)",
                border:          "1px solid rgba(59,130,246,0.3)",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                flexShrink:      0,
              }}
            >
              <BarChart3 style={{ width: 18, height: 18, color: C.blue }} />
            </div>
            <div>
              <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.3 }}>
                Sistem & Raporlar
              </h1>
              <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0" }}>
                DevOps Komuta Ekranı · Müşteri Hizmetleri
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastSync && (
              <span style={{ color: C.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock style={{ width: 11, height: 11 }} />
                {lastSync.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}

            <button
              onClick={() => fetchAll(true)}
              disabled={spinning}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        6,
                padding:    "8px 14px",
                borderRadius: 10,
                border:     "1px solid rgba(59,130,246,0.3)",
                background: "rgba(59,130,246,0.1)",
                color:      C.blue,
                fontSize:   12,
                fontWeight: 700,
                cursor:     spinning ? "not-allowed" : "pointer",
                opacity:    spinning ? 0.6 : 1,
              }}
            >
              <RefreshCw
                style={{
                  width:     13,
                  height:    13,
                  animation: spinning ? "rpSpin 1s linear infinite" : "none",
                }}
              />
              Yenile
            </button>

            <button
              onClick={() => exportCSV(auditLogs)}
              disabled={auditLogs.length === 0}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        6,
                padding:    "8px 16px",
                borderRadius: 10,
                border:     "1px solid rgba(16,185,129,0.35)",
                background: "rgba(16,185,129,0.1)",
                color:      C.green,
                fontSize:   12,
                fontWeight: 700,
                cursor:     auditLogs.length === 0 ? "not-allowed" : "pointer",
                opacity:    auditLogs.length === 0 ? 0.45 : 1,
              }}
            >
              <Download style={{ width: 13, height: 13 }} />
              Tüm Veriyi Dışa Aktar (CSV)
            </button>
          </div>
        </div>

        {/* ══ SİSTEM SAĞLIĞI KARTLARI ══════════════════════════════════════════ */}
        <div
          style={{
            display:               "grid",
            gridTemplateColumns:   "repeat(5, 1fr)",
            gap:                   12,
          }}
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} h={120} />)
            : HEALTH_CARDS.map((card, i) => <HealthCard key={i} {...card} />)}
        </div>

        {/* ══ UYARI BANNERLARI ══════════════════════════════════════════════════ */}
        {!loading && uyarilar.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {uyarilar.map((u, i) => (
              <div
                key={i}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         10,
                  padding:     "10px 16px",
                  borderRadius: 10,
                  background:  u.seviye === "kirmizi" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                  border:      `1px solid ${u.seviye === "kirmizi" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.28)"}`,
                  borderLeft:  `4px solid ${u.seviye === "kirmizi" ? C.red : C.yellow}`,
                }}
              >
                <AlertTriangle
                  style={{
                    width:    14,
                    height:   14,
                    color:    u.seviye === "kirmizi" ? C.red : C.yellow,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                  {u.mesaj}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ══ SAATLİK TRAFİK GRAFİĞİ ════════════════════════════════════════════ */}
        <Panel
          title="Saatlik Çağrı Yoğunluğu (Son 24 Saat)"
          icon={<Activity style={{ width: 15, height: 15 }} />}
          accent={C.blue}
          badge={hourly.length > 0 ? `${hourly.length} saat` : null}
        >
          {loading || hourly.length === 0 ? (
            <Shimmer h={220} />
          ) : (
            <div style={{ width: "100%", minHeight: 230 }}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={hourly} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="rp_toplam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.blue}  stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rp_cevaplanan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rp_kacan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red}   stopOpacity={0.28} />
                    <stop offset="95%" stopColor={C.red}   stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="saat"
                  tick={{ fill: C.muted, fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  formatter={(val) => {
                    const m = { toplam: "Toplam", cevaplanan: "Cevaplanan", kacan: "Kaçan" };
                    return (
                      <span style={{ color: C.muted, fontSize: 11 }}>{m[val] ?? val}</span>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="toplam"
                  stroke={C.blue}
                  strokeWidth={2}
                  fill="url(#rp_toplam)"
                  dot={false}
                  activeDot={{ r: 4, fill: C.blue }}
                />
                <Area
                  type="monotone"
                  dataKey="cevaplanan"
                  stroke={C.green}
                  strokeWidth={2}
                  fill="url(#rp_cevaplanan)"
                  dot={false}
                  activeDot={{ r: 4, fill: C.green }}
                />
                <Area
                  type="monotone"
                  dataKey="kacan"
                  stroke={C.red}
                  strokeWidth={2}
                  fill="url(#rp_kacan)"
                  dot={false}
                  activeDot={{ r: 4, fill: C.red }}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* ══ DENETİM LOG TABLOSU ════════════════════════════════════════════════ */}
        <Panel
          title="Supervisor Denetim Logları (Son 7 Gün)"
          icon={<Shield style={{ width: 15, height: 15 }} />}
          accent={C.purple}
          badge={auditLogs.length > 0 ? `${auditLogs.length} kayıt` : null}
          noPad
        >
          {loading ? (
            <div style={{ padding: 18 }}>
              <Shimmer h={200} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div
              style={{
                padding:   "40px 0",
                textAlign: "center",
                color:     C.muted,
                fontSize:  13,
              }}
            >
              Son 7 günde supervisor denetim logu bulunamadı.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width:           "100%",
                  borderCollapse:  "collapse",
                  fontSize:        12,
                }}
              >
                <thead>
                  <tr>
                    {["Tarih", "Kullanıcı", "Rol", "Eylem", "Tablo", "Kayıt ID", "Eski  →  Yeni"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding:       "10px 14px",
                          textAlign:     "left",
                          color:         C.muted,
                          fontWeight:    700,
                          fontSize:      10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderBottom:  `1px solid ${C.border}`,
                          whiteSpace:    "nowrap",
                          background:    "rgba(0,0,0,0.18)",
                          position:      "sticky",
                          top:           0,
                        }}
                      >
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
                        style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, transition: "background 0.12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Tarih */}
                        <td style={{ padding: "9px 14px", color: C.muted, whiteSpace: "nowrap" }}>
                          {log.tarih
                            ? new Date(log.tarih).toLocaleString("tr-TR", {
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Kullanıcı */}
                        <td style={{ padding: "9px 14px", color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {log.user_ad ?? "—"}
                        </td>

                        {/* Rol */}
                        <td style={{ padding: "9px 14px", color: C.muted }}>
                          {log.user_rol ?? "—"}
                        </td>

                        {/* Eylem badge */}
                        <td style={{ padding: "9px 14px" }}>
                          <span
                            style={{
                              display:      "inline-block",
                              padding:      "2px 9px",
                              borderRadius: 99,
                              background:   `${st.color}18`,
                              border:       `1px solid ${st.color}40`,
                              color:        st.color,
                              fontWeight:   700,
                              fontSize:     10,
                              letterSpacing:"0.04em",
                              whiteSpace:   "nowrap",
                            }}
                          >
                            {st.label}
                          </span>
                        </td>

                        {/* Tablo */}
                        <td
                          style={{
                            padding:    "9px 14px",
                            color:      C.muted,
                            fontFamily: "monospace",
                            fontSize:   11,
                          }}
                        >
                          {log.tablo_adi ?? "—"}
                        </td>

                        {/* Kayıt ID (kısaltılmış) */}
                        <td
                          style={{
                            padding:    "9px 14px",
                            color:      C.muted,
                            fontFamily: "monospace",
                            fontSize:   11,
                          }}
                        >
                          {log.kayit_id
                            ? log.kayit_id.length > 8
                              ? log.kayit_id.slice(0, 8) + "…"
                              : log.kayit_id
                            : "—"}
                        </td>

                        {/* Eski → Yeni */}
                        <td style={{ padding: "9px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
                            {log.eski_deger != null && (
                              <span
                                style={{
                                  maxWidth:     90,
                                  overflow:     "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace:   "nowrap",
                                  display:      "block",
                                  background:   "rgba(239,68,68,0.1)",
                                  border:       "1px solid rgba(239,68,68,0.2)",
                                  color:        "#f87171",
                                  padding:      "1px 6px",
                                  borderRadius: 5,
                                  fontFamily:   "monospace",
                                  fontSize:     10,
                                }}
                              >
                                {typeof log.eski_deger === "object"
                                  ? JSON.stringify(log.eski_deger)
                                  : String(log.eski_deger)}
                              </span>
                            )}
                            {log.eski_deger != null && log.yeni_deger != null && (
                              <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>→</span>
                            )}
                            {log.yeni_deger != null && (
                              <span
                                style={{
                                  maxWidth:     90,
                                  overflow:     "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace:   "nowrap",
                                  display:      "block",
                                  background:   "rgba(16,185,129,0.1)",
                                  border:       "1px solid rgba(16,185,129,0.2)",
                                  color:        "#34d399",
                                  padding:      "1px 6px",
                                  borderRadius: 5,
                                  fontFamily:   "monospace",
                                  fontSize:     10,
                                }}
                              >
                                {typeof log.yeni_deger === "object"
                                  ? JSON.stringify(log.yeni_deger)
                                  : String(log.yeni_deger)}
                              </span>
                            )}
                            {log.eski_deger == null && log.yeni_deger == null && (
                              <span style={{ color: C.muted }}>—</span>
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
