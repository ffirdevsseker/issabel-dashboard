/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · OTOMASYON & KURALLAR  (/admin/automation)
   ─────────────────────────────────────────────────
   Koşul-tabanlı otomatik aksiyon kurallarını listeler, oluşturur, düzenler,
   aktif/pasife alır ve siler.

   Veri: GET/POST/PUT/PATCH/DELETE /admin/rules  (rules.py backend)
   Tema: Overview.jsx Panel bileşeni + inline-style (mevcut admin teması)
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useState } from "react";
import {
  Edit2,
  History,
  Plus,
  RefreshCw,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Inbox,
} from "lucide-react";

import { rulesApi }  from "@/services/api";
import { Panel }     from "@/pages/admin/Overview";

/* ─── Sabitler ───────────────────────────────────────────────────────────── */
const KOSUL_TIPLERI = [
  { value: "kuyruk_bekleme_sn",  label: "Kuyruk bekleme süresi (sn)" },
  { value: "csat_yuzde",         label: "CSAT skoru (%)" },
  { value: "ayni_anda_mola",     label: "Aynı anda mola yapan kişi sayısı" },
  { value: "sip_trunk_kopuk",    label: "SIP trunk kopuk (eşik = 1)" },
  { value: "cevaplama_orani",    label: "Cevaplama oranı (%)" },
  { value: "trunk_doluluk",      label: "Trunk doluluk oranı (%)" },
];

const AKSIYON_TIPLERI = [
  { value: "supervizore_bildirim", label: "Süpervizöre bildirim gönder" },
  { value: "personeli_egitim",     label: "Personeli eğitime yönlendir" },
  { value: "backup_route",         label: "Backup route aç" },
  { value: "kuyruga_ekle",         label: "Kuyruğa personel ekle" },
  { value: "alarm_gonder",         label: "Alarm gönder (tüm adminler)" },
];

const KOSUL_MAP   = Object.fromEntries(KOSUL_TIPLERI.map(k => [k.value, k.label]));
const AKSIYON_MAP = Object.fromEntries(AKSIYON_TIPLERI.map(a => [a.value, a.label]));

const BOSH_FORM = {
  ad:             "",
  kosul_tipi:     "kuyruk_bekleme_sn",
  kosul_degeri:   60,
  aksiyon_tipi:   "supervizore_bildirim",
  aksiyon_degeri: "",
  aktif:          true,
};

/* ─── Yardımcı bileşenler ────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: "#374151",
        letterSpacing: "0.03em", textTransform: "uppercase",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT = {
  padding: "9px 12px",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "#f8fafc",
  fontFamily: "inherit",
};

/* ─── Shimmer iskelet ────────────────────────────────────────────────────── */
function Shimmer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 44, borderRadius: 8,
          background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
function StatusBadge({ aktif, onClick }) {
  return (
    <button
      onClick={onClick}
      title={aktif ? "Pasife al" : "Aktife al"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 99, cursor: "pointer",
        border: "none",
        background: aktif ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
        color:      aktif ? "#10b981"               : "#94a3b8",
        fontSize: 11, fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {aktif ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
      {aktif ? "Aktif" : "Pasif"}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function AutomationPage() {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);   // null | "create" | {rule}
  const [form,     setForm]     = useState(BOSH_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error,    setError]    = useState(null);

  // Sprint 7-C · Tetiklenme geçmişi
  const [historyModal,   setHistoryModal]   = useState(null);  // null | { rule }
  const [historyRows,    setHistoryRows]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [recentHist,     setRecentHist]     = useState([]);
  const [recentLoading,  setRecentLoading]  = useState(true);

  /* fetch ────────────────────────────────────────────────────────────────── */
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await rulesApi.getAll();
      setRules(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError("Kurallar yüklenemedi. Sunucu bağlantısını kontrol edin.");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  /* Tetiklenme geçmişi ────────────────────────────────────────────────────── */
  const fetchRecentHistory = useCallback(async () => {
    setRecentLoading(true);
    try {
      const r = await rulesApi.getRecentHistory(20);
      setRecentHist(Array.isArray(r.data) ? r.data : []);
    } catch {
      setRecentHist([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecentHistory(); }, [fetchRecentHistory]);

  async function openHistory(rule) {
    setHistoryModal({ rule });
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const r = await rulesApi.getHistory(rule.id, 50);
      setHistoryRows(Array.isArray(r.data) ? r.data : []);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "—"; }
  }

  /* modal helpers ─────────────────────────────────────────────────────────── */
  function openCreate() {
    setForm(BOSH_FORM);
    setModal("create");
  }

  function openEdit(rule) {
    setForm({
      ad:             rule.ad,
      kosul_tipi:     rule.kosul_tipi,
      kosul_degeri:   rule.kosul_degeri,
      aksiyon_tipi:   rule.aksiyon_tipi,
      aksiyon_degeri: rule.aksiyon_degeri || "",
      aktif:          rule.aktif,
    });
    setModal(rule);
  }

  /* save ─────────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!form.ad.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (modal === "create") {
        await rulesApi.create(form);
      } else {
        await rulesApi.update(modal.id, form);
      }
      await fetchRules();
      setModal(null);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Kural kaydedilemedi. Sunucu hatası.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  /* toggle ───────────────────────────────────────────────────────────────── */
  async function handleToggle(rule) {
    try {
      await rulesApi.toggle(rule.id, { aktif: !rule.aktif });
      setRules(prev =>
        prev.map(r => r.id === rule.id ? { ...r, aktif: !r.aktif } : r)
      );
    } catch (e) {
      console.error(e);
    }
  }

  /* delete ───────────────────────────────────────────────────────────────── */
  async function handleDelete(id) {
    if (!window.confirm("Bu kuralı kalıcı olarak silmek istiyor musunuz?")) return;
    setDeleting(id);
    try {
      await rulesApi.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  const aktifSayi = rules.filter(r => r.aktif).length;

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
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(59,130,246,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Settings2 size={18} color="#3b82f6" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Otomasyon & Kurallar
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Koşul-tabanlı otomatik aksiyonları tanımlayın ve yönetin
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={fetchRules}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)", background: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "#64748b",
            }}
          >
            <RefreshCw size={13} /> Yenile
          </button>
          <button
            onClick={openCreate}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#3b82f6", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 700,
            }}
          >
            <Plus size={14} /> Yeni Kural
          </button>
        </div>
      </div>

      {/* ── Özet kartlar ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Toplam Kural", value: rules.length,                  color: "#3b82f6" },
          { label: "Aktif",        value: aktifSayi,                     color: "#10b981" },
          { label: "Pasif",        value: rules.length - aktifSayi,      color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 12,
            padding: "14px 22px",
            display: "flex", flexDirection: "column", gap: 2,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            minWidth: 110,
          }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </span>
            <span style={{
              fontSize: 10, color: "#94a3b8", fontWeight: 700,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Hata şeridi ────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 8,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 13, color: "#dc2626",
        }}>
          {error}
        </div>
      )}

      {/* ── Tablo ──────────────────────────────────────────────────────── */}
      <Panel title="Kural Listesi" accentColor="#3b82f6" badge={rules.length}>
        {loading ? (
          <Shimmer />
        ) : rules.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Settings2 size={44} color="#e2e8f0" style={{ marginBottom: 12 }} />
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 14px" }}>
              Henüz hiç kural tanımlanmadı
            </p>
            <button
              onClick={openCreate}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "none",
                background: "#3b82f6", color: "#fff",
                cursor: "pointer", fontSize: 13, fontWeight: 700,
              }}
            >
              + İlk Kuralı Ekle
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {/* header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(160px,2fr) minmax(160px,2fr) minmax(160px,2fr) 80px 90px 112px",
              gap: 8, padding: "6px 12px 8px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
            }}>
              {["Kural Adı", "Koşul", "Aksiyon", "Eşik", "Durum", ""].map((h, i) => (
                <div key={i} style={{
                  fontSize: 9, fontWeight: 800, color: "#94a3b8",
                  letterSpacing: "0.07em", textTransform: "uppercase",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* rows */}
            {rules.map(rule => (
              <div
                key={rule.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(160px,2fr) minmax(160px,2fr) minmax(160px,2fr) 80px 90px 112px",
                  gap: 8, padding: "11px 12px",
                  borderBottom: "1px solid rgba(0,0,0,0.045)",
                  alignItems: "center",
                  transition: "background 0.12s",
                  borderLeft: `3px solid ${rule.aktif ? "#3b82f6" : "#e2e8f0"}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                {/* Ad */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  {rule.ad}
                </div>

                {/* Koşul */}
                <div>
                  <span style={{
                    fontSize: 11, color: "#64748b",
                    display: "block", marginBottom: 2,
                  }}>
                    {KOSUL_MAP[rule.kosul_tipi] ?? rule.kosul_tipi}
                  </span>
                </div>

                {/* Aksiyon */}
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {AKSIYON_MAP[rule.aksiyon_tipi] ?? rule.aksiyon_tipi}
                  {rule.aksiyon_degeri && (
                    <span style={{ color: "#94a3b8" }}> · {rule.aksiyon_degeri}</span>
                  )}
                </div>

                {/* Eşik */}
                <div style={{
                  fontSize: 14, fontWeight: 800, color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {rule.kosul_degeri}
                </div>

                {/* Durum */}
                <StatusBadge aktif={rule.aktif} onClick={() => handleToggle(rule)} />

                {/* Aksiyonlar */}
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => openHistory(rule)}
                    title="Tetiklenme Geçmişi"
                    style={{
                      padding: "5px 8px",
                      border: "1px solid rgba(139,92,246,0.18)",
                      borderRadius: 6,
                      background: "rgba(139,92,246,0.06)",
                      cursor: "pointer", display: "flex", alignItems: "center",
                    }}
                  >
                    <History size={12} color="#8b5cf6" />
                  </button>
                  <button
                    onClick={() => openEdit(rule)}
                    title="Düzenle"
                    style={{
                      padding: "5px 8px",
                      border: "1px solid rgba(0,0,0,0.09)",
                      borderRadius: 6, background: "#fff",
                      cursor: "pointer", display: "flex", alignItems: "center",
                    }}
                  >
                    <Edit2 size={12} color="#64748b" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleting === rule.id}
                    title="Sil"
                    style={{
                      padding: "5px 8px",
                      border: "1px solid rgba(239,68,68,0.18)",
                      borderRadius: 6,
                      background: "rgba(239,68,68,0.05)",
                      cursor: deleting === rule.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center",
                      opacity: deleting === rule.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={12} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ════════════════════════════════════════════════════════════════════
          SON TETİKLENMELER  —  /admin/rules/history
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 16 }}>
        <Panel
          title="Son Tetiklenmeler — Tüm Kurallar"
          accentColor="#8b5cf6"
          badge={!recentLoading && recentHist.length > 0 ? recentHist.length : null}
          action={
            <button
              onClick={fetchRecentHistory}
              disabled={recentLoading}
              title="Yenile"
              style={{
                padding: "4px 8px", borderRadius: 6,
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                cursor: recentLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center",
                opacity: recentLoading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={11} color="#8b5cf6" style={{
                animation: recentLoading ? "rulesSpin 0.8s linear infinite" : "none",
              }} />
            </button>
          }
          noPad
        >
          <style>{`@keyframes rulesSpin{to{transform:rotate(360deg);}}`}</style>
          {recentLoading ? (
            <div style={{ padding: 16 }}>
              <Shimmer />
            </div>
          ) : recentHist.length === 0 ? (
            <div style={{
              padding: "40px 0", textAlign: "center",
              color: "#94a3b8", fontSize: 13,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 10,
            }}>
              <Inbox size={28} color="#e2e8f0" />
              <div>Henüz tetiklenme kaydı yok.</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                Scheduler bir kural çalıştırdığında burada görünecek.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Zaman", "Kural", "Anlık Değer", "Aksiyon Özeti", "Etkilenen", "Sonuç"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px", textAlign: "left",
                        color: "#94a3b8", fontWeight: 700, fontSize: 10,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        borderBottom: "1px solid rgba(0,0,0,0.07)",
                        background: "#f8fafc", whiteSpace: "nowrap",
                        position: "sticky", top: 0,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentHist.map((h) => (
                    <tr key={h.id}
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.045)" }}
                    >
                      <td style={{ padding: "9px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 11 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Clock size={11} color="#cbd5e1" />
                          {fmtTime(h.tetiklenme_zamani)}
                        </span>
                      </td>
                      <td style={{ padding: "9px 16px", color: "#0f172a", fontWeight: 600, fontSize: 12 }}>
                        {h.kural_ad ?? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>silindi</span>}
                      </td>
                      <td style={{
                        padding: "9px 16px", color: "#0f172a", fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {h.kosul_anlik_deger != null ? h.kosul_anlik_deger : "—"}
                      </td>
                      <td style={{
                        padding: "9px 16px", color: "#475569", fontSize: 11.5,
                        maxWidth: 360, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={h.aksiyon_ozeti}>
                        {h.aksiyon_ozeti || "—"}
                      </td>
                      <td style={{
                        padding: "9px 16px", color: "#0f172a", fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {h.etkilenen_sayi > 0
                          ? <span style={{ color: "#10b981" }}>{h.etkilenen_sayi}</span>
                          : <span style={{ color: "#94a3b8" }}>0</span>}
                      </td>
                      <td style={{ padding: "9px 16px" }}>
                        {h.basarili ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 800,
                            color: "#10b981", background: "rgba(16,185,129,0.1)",
                            border: "1px solid rgba(16,185,129,0.22)",
                            borderRadius: 99, padding: "2px 8px",
                          }}>
                            <CheckCircle2 size={10} /> Başarılı
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 800,
                            color: "#ef4444", background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.22)",
                            borderRadius: 99, padding: "2px 8px",
                          }}>
                            <AlertTriangle size={10} /> Hata
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          HISTORY MODAL  —  tek kural detayı
      ════════════════════════════════════════════════════════════════════ */}
      {historyModal && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setHistoryModal(null); }}
        >
          <div style={{
            background: "#fff", borderRadius: 16,
            width: "100%", maxWidth: 720,
            maxHeight: "85vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 22px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "rgba(139,92,246,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <History size={15} color="#8b5cf6" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                    Tetiklenme Geçmişi
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {historyModal.rule.ad}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHistoryModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ padding: 16 }}><Shimmer /></div>
              ) : historyRows.length === 0 ? (
                <div style={{
                  padding: "60px 0", textAlign: "center",
                  color: "#94a3b8", fontSize: 13,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 10,
                }}>
                  <Inbox size={28} color="#e2e8f0" />
                  <div>Bu kural için henüz tetiklenme kaydı yok.</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Zaman", "Anlık Değer", "Aksiyon Özeti", "Etkilenen", "Sonuç"].map(h => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: "left",
                          color: "#94a3b8", fontWeight: 700, fontSize: 10,
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          borderBottom: "1px solid rgba(0,0,0,0.07)",
                          background: "#f8fafc", whiteSpace: "nowrap",
                          position: "sticky", top: 0,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map(h => (
                      <tr key={h.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.045)" }}>
                        <td style={{ padding: "9px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 11 }}>
                          {fmtTime(h.tetiklenme_zamani)}
                        </td>
                        <td style={{ padding: "9px 16px", color: "#0f172a", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {h.kosul_anlik_deger != null ? h.kosul_anlik_deger : "—"}
                        </td>
                        <td style={{ padding: "9px 16px", color: "#475569", fontSize: 11.5 }}>
                          {h.aksiyon_ozeti || "—"}
                        </td>
                        <td style={{ padding: "9px 16px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {h.etkilenen_sayi > 0
                            ? <span style={{ color: "#10b981" }}>{h.etkilenen_sayi}</span>
                            : <span style={{ color: "#94a3b8" }}>0</span>}
                        </td>
                        <td style={{ padding: "9px 16px" }}>
                          {h.basarili ? (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: "#10b981",
                              background: "rgba(16,185,129,0.1)",
                              border: "1px solid rgba(16,185,129,0.22)",
                              borderRadius: 99, padding: "2px 8px",
                            }}>✓ Başarılı</span>
                          ) : (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: "#ef4444",
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.22)",
                              borderRadius: 99, padding: "2px 8px",
                            }}>✗ Hata</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — Yeni Kural / Düzenle
      ════════════════════════════════════════════════════════════════════ */}
      {modal !== null && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{
            background: "#fff", borderRadius: 16,
            padding: "28px 32px", width: "100%", maxWidth: 520,
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          }}>
            {/* başlık */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 22,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {modal === "create" ? "Yeni Kural Oluştur" : `"${modal.ad}" düzenle`}
              </h2>
              <button
                onClick={() => setModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            {/* form alanları */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Kural Adı">
                <input
                  value={form.ad}
                  onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
                  placeholder="örn. Kuyruk dolunca uyar"
                  style={INPUT}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Koşul">
                  <select
                    value={form.kosul_tipi}
                    onChange={e => setForm(f => ({ ...f, kosul_tipi: e.target.value }))}
                    style={INPUT}
                  >
                    {KOSUL_TIPLERI.map(k => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Eşik Değeri">
                  <input
                    type="number"
                    min={0}
                    value={form.kosul_degeri}
                    onChange={e =>
                      setForm(f => ({ ...f, kosul_degeri: parseFloat(e.target.value) || 0 }))
                    }
                    style={INPUT}
                  />
                </Field>
              </div>

              <Field label="Aksiyon">
                <select
                  value={form.aksiyon_tipi}
                  onChange={e => setForm(f => ({ ...f, aksiyon_tipi: e.target.value }))}
                  style={INPUT}
                >
                  {AKSIYON_TIPLERI.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Aksiyon Detayı (isteğe bağlı)">
                <input
                  value={form.aksiyon_degeri}
                  onChange={e => setForm(f => ({ ...f, aksiyon_degeri: e.target.value }))}
                  placeholder="örn. Ekip A'ya bildir"
                  style={INPUT}
                />
              </Field>

              {/* Aktif toggle */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8,
                background: "#f8fafc", border: "1px solid rgba(0,0,0,0.07)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 }}>
                  Kural durumu
                </span>
                <StatusBadge
                  aktif={form.aktif}
                  onClick={() => setForm(f => ({ ...f, aktif: !f.aktif }))}
                />
              </div>
            </div>

            {/* butonlar */}
            <div style={{
              display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: "9px 20px", borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.1)", background: "#fff",
                  cursor: "pointer", fontSize: 13, color: "#64748b",
                }}
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.ad.trim()}
                style={{
                  padding: "9px 24px", borderRadius: 8, border: "none",
                  background: saving || !form.ad.trim() ? "#93c5fd" : "#3b82f6",
                  color: "#fff",
                  cursor: saving || !form.ad.trim() ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
