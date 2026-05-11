/**
 * Admin · Raporlar  —  /admin/reports
 *
 * Tema: ADMIN_THEME (adminTheme.js)
 * Sekmeler:
 *   1. Denetim Logları  → operationsApi.getAuditLogs(...)
 *   2. Personel Perf.   → personnelApi.getList({ per_page: 100 })
 *   3. Trendler         → overviewApi.getHourly()
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3, ChevronLeft, ChevronRight,
  Clock, Download, RefreshCw, CheckCircle2,
  Users, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import DateRangePicker from "@/components/admin/DateRangePicker";

import { ADMIN_THEME } from "@/constants/adminTheme";
import { operationsApi, personnelApi, overviewApi } from "@/services/api";
import { Panel } from "@/pages/admin/Overview";

/* ─── Renk paleti ────────────────────────────────────────────────────────────── */
const C = ADMIN_THEME;

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


/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
/* ─── Default tarih aralığı: son 7 gün ─────────────────────────────────────── */
function defaultDateRange() {
  const to   = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const AUDIT_PAGE_SIZE = 20;

const TABS = [
  { id: "audit",    label: "Denetim Logları",       Icon: BarChart3 },
  { id: "perf",     label: "Personel Performansı",   Icon: Users     },
  { id: "trendler", label: "Trendler",               Icon: TrendingUp },
];

export default function AdminReports() {
  const [activeTab,  setActiveTab]  = useState("audit");

  /* ── Denetim Logları (Sekme 1) ── */
  const [auditLogs,  setAuditLogs]  = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage,  setAuditPage]  = useState(1);
  const [dateRange,  setDateRange]  = useState(defaultDateRange);
  const [loading,    setLoading]    = useState(true);
  const [spinning,   setSpinning]   = useState(false);
  const [lastSync,   setLastSync]   = useState(null);
  const timerRef = useRef(null);

  /* ── Personel Performansı (Sekme 2) ── */
  const [perfData,     setPerfData]     = useState([]);
  const [perfLoading,  setPerfLoading]  = useState(false);
  const [perfFetched,  setPerfFetched]  = useState(false);

  /* ── Trendler (Sekme 3) ── */
  const [hourlyData,   setHourlyData]   = useState([]);
  const [hourlyLoading,setHourlyLoading]= useState(false);
  const [hourlyFetched,setHourlyFetched]= useState(false);

  const fetchAudit = useCallback(async (page = 1) => {
    try {
      const res = await operationsApi.getAuditLogs({
        from_date: dateRange.from,
        to_date:   dateRange.to,
        page,
        page_size: AUDIT_PAGE_SIZE,
      });
      const body = res.data;
      setAuditLogs(Array.isArray(body) ? body : (body.data ?? []));
      setAuditTotal(body.total ?? (Array.isArray(body) ? body.length : 0));
      setAuditPage(page);
    } catch { /* sessiz */ }
  }, [dateRange]);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    await fetchAudit(1);
    setLastSync(new Date());
    setLoading(false);
    if (manual) setSpinning(false);
  }, [fetchAudit]);

  // Tarih aralığı değişince audit'i yenile
  useEffect(() => { fetchAudit(1); }, [fetchAudit]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  /* ── Sekme 2: Personel Performansı — ilk kez açılınca yükle ── */
  useEffect(() => {
    if (activeTab !== "perf" || perfFetched) return;
    setPerfLoading(true);
    personnelApi.getList({ per_page: 100, page: 1 })
      .then(r => {
        setPerfData(r.data?.items ?? []);
        setPerfFetched(true);
      })
      .catch(() => { setPerfData([]); setPerfFetched(true); })
      .finally(() => setPerfLoading(false));
  }, [activeTab, perfFetched]);

  /* ── Sekme 3: Trendler — ilk kez açılınca yükle ── */
  useEffect(() => {
    if (activeTab !== "trendler" || hourlyFetched) return;
    setHourlyLoading(true);
    overviewApi.getHourly()
      .then(r => {
        setHourlyData(Array.isArray(r.data) ? r.data : []);
        setHourlyFetched(true);
      })
      .catch(() => { setHourlyData([]); setHourlyFetched(true); })
      .finally(() => setHourlyLoading(false));
  }, [activeTab, hourlyFetched]);


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
                Supervisor denetim logları · Tarih filtresi · CSV export
              </p>
            </div>
          </div>

          {/* Audit sekmesi kontrolleri */}
          {activeTab === "audit" && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <DateRangePicker
                value={dateRange}
                onChange={(v) => { setDateRange(v); setAuditPage(1); }}
                disabled={loading}
              />
              {lastSync && (
                <span style={{ color: C.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
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
                <RefreshCw size={13} style={{ animation: spinning ? "rpSpin 1s linear infinite" : "none" }} />
                Yenile
              </button>
              <button
                onClick={() => exportCSV(auditLogs)}
                disabled={auditLogs.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 10,
                  border: "1px solid rgba(16,185,129,0.3)",
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
          )}
        </div>

        {/* ── SEKME ÇUBUĞU ──────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 4,
          background: "#f8fafc",
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 4,
          width: "fit-content",
        }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "7px 16px", borderRadius: 8,
                  border: "none",
                  background: active ? "#ffffff" : "transparent",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  color: active ? C.text : C.muted,
                  fontSize: 12, fontWeight: active ? 700 : 600,
                  cursor: "pointer", transition: "all 0.15s",
                  borderTop: active ? `2px solid ${C.purple}` : "2px solid transparent",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── DENETİM LOG TABLOSU ───────────────────────────────────────────── */}
        {activeTab === "audit" && (<>
        <Panel
          title={`Denetim Logları  ·  ${dateRange.from}  →  ${dateRange.to}`}
          accentColor={C.purple}
          badge={auditTotal > 0 ? `${auditTotal} kayıt` : null}
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
            <>
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 480 }}>
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

            {/* Sayfalama */}
            {auditTotal > AUDIT_PAGE_SIZE && (() => {
              const totalPages = Math.ceil(auditTotal / AUDIT_PAGE_SIZE);
              return (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderTop: `1px solid ${C.borderL}`,
                  background: "#f8fafc",
                }}>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    <strong style={{ color: C.text }}>{auditTotal}</strong> kayıt · Sayfa{" "}
                    <strong style={{ color: C.text }}>{auditPage}</strong> / {totalPages}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      disabled={auditPage === 1}
                      onClick={() => fetchAudit(auditPage - 1)}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: `1px solid ${C.border}`, background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: auditPage === 1 ? "not-allowed" : "pointer",
                        opacity: auditPage === 1 ? 0.3 : 1,
                      }}
                    >
                      <ChevronLeft size={14} color={C.text} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = auditPage <= 3 ? i + 1 : auditPage - 2 + i;
                      if (pg < 1 || pg > totalPages) return null;
                      return (
                        <button key={pg} onClick={() => fetchAudit(pg)} style={{
                          width: 30, height: 30, borderRadius: 8,
                          border: `1px solid ${pg === auditPage ? C.purple : C.border}`,
                          background: pg === auditPage ? C.purple : "#fff",
                          color: pg === auditPage ? "#fff" : C.text,
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}>
                          {pg}
                        </button>
                      );
                    })}
                    <button
                      disabled={auditPage === totalPages}
                      onClick={() => fetchAudit(auditPage + 1)}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: `1px solid ${C.border}`, background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: auditPage === totalPages ? "not-allowed" : "pointer",
                        opacity: auditPage === totalPages ? 0.3 : 1,
                      }}
                    >
                      <ChevronRight size={14} color={C.text} />
                    </button>
                  </div>
                </div>
              );
            })()}
            </>
          )}
        </Panel>
        </>)}

        {/* ── PERSONEL PERFORMANSI (Sekme 2) ───────────────────────────────── */}
        {activeTab === "perf" && (
          <Panel title="Personel Performans Tablosu" accentColor={C.active}
            badge={perfData.length > 0 ? `${perfData.length} personel` : null}
            noPad>
            {perfLoading ? (
              <div style={{ padding: 16 }}><Shimmer h={200} /></div>
            ) : perfData.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
                <Users size={28} color={C.faint} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
                Personel verisi bulunamadı.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Personel","Ekip","Rol","Anlık Durum","Bugün Çağrı","XP","Seviye"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: "left",
                          color: C.muted, fontWeight: 700, fontSize: 10,
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          borderBottom: `1px solid ${C.border}`,
                          background: "#f8fafc", whiteSpace: "nowrap",
                          position: "sticky", top: 0,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perfData.map((p, i) => {
                      const durumColor = {
                        aktif:   C.active,
                        mesgul:  C.busy,
                        mola:    C.break,
                        offline: C.offline,
                      }[p.anlik_durum] || C.muted;
                      return (
                        <tr key={p.id ?? i}
                          style={{ borderBottom: `1px solid ${C.borderL}`, transition: "background 0.12s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "9px 16px", color: C.text, fontWeight: 600 }}>
                            {p.ad_soyad ?? "—"}
                          </td>
                          <td style={{ padding: "9px 16px", color: C.muted, fontSize: 11 }}>
                            {p.ekip ?? "—"}
                          </td>
                          <td style={{ padding: "9px 16px" }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px",
                              background: p.rol === "supervisor" ? "rgba(99,102,241,0.08)" : "rgba(16,185,129,0.08)",
                              color:      p.rol === "supervisor" ? "#6366f1" : C.active,
                              border: `1px solid ${p.rol === "supervisor" ? "rgba(99,102,241,0.2)" : "rgba(16,185,129,0.2)"}`,
                            }}>
                              {p.rol === "supervisor" ? "Süpervizör" : "Personel"}
                            </span>
                          </td>
                          <td style={{ padding: "9px 16px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 10, fontWeight: 700,
                              color: durumColor,
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: durumColor, flexShrink: 0,
                              }} />
                              {p.anlik_durum ?? "—"}
                            </span>
                          </td>
                          <td style={{ padding: "9px 16px", color: C.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                            {p.bugun_cagri ?? 0}
                          </td>
                          <td style={{ padding: "9px 16px", color: C.purple, fontWeight: 700 }}>
                            {(p.xp ?? 0).toLocaleString("tr-TR")}
                          </td>
                          <td style={{ padding: "9px 16px", color: C.muted, fontSize: 11 }}>
                            Lv {p.seviye ?? 1}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* ── TRENDLER (Sekme 3) ────────────────────────────────────────────── */}
        {activeTab === "trendler" && (
          <Panel title="Saatlik Çağrı Trendi — Bugün"
            accentColor={C.busy}
            badge={hourlyData.length > 0 ? `${hourlyData.length} saat` : null}>
            {hourlyLoading ? (
              <Shimmer h={280} />
            ) : hourlyData.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
                <TrendingUp size={28} color={C.faint} style={{ display: "block", margin: "0 auto 8px" }} />
                Bugün için saatlik veri bulunamadı.
              </div>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="saat"
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff", border: `1px solid ${C.border}`,
                        borderRadius: 10, fontSize: 12,
                        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                      }}
                    />
                    <Legend
                      formatter={(val) => {
                        const m = { toplam: "Toplam", cevaplanan: "Cevaplanan", kacan: "Kaçan" };
                        return <span style={{ fontSize: 11, color: C.muted }}>{m[val] ?? val}</span>;
                      }}
                    />
                    <Bar dataKey="cevaplanan" name="Cevaplanan" fill={C.active}
                      radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="kacan" name="Kaçan" fill={C.alarm}
                      radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="toplam" name="Toplam" fill={C.busy}
                      fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        )}

      </div>
    </>
  );
}
