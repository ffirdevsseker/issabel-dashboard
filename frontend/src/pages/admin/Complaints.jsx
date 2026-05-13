/**
 * ADMIN · ŞİKAYET YÖNETİMİ  —  /admin/complaints
 * ────────────────────────────────────────────────
 * Backend kaynakları (approvals.py):
 *   GET  /approvals/complaints          → list (bekleyen şikayetler)
 *   POST /approvals/complaints/{id}/decide?karar=onayla|reddet
 *
 * Veri zenginleştirme: personel ad/ekip bilgisi backend response'unda yok;
 * personnelApi.getList() ile id → ad_soyad/ekip eşlemesi client-side yapılır.
 *
 * Tema: ADMIN_THEME + Panel (Overview.jsx)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle2, RefreshCw, X, Check,
  Filter, Clock, Inbox,
} from "lucide-react";

import { adminOpsApi, personnelApi } from "@/services/api";
import { Panel }         from "@/pages/admin/Overview";
import { ADMIN_THEME }   from "@/constants/adminTheme";

const C = ADMIN_THEME;

/* ─── Durum sözlüğü ──────────────────────────────────────────────────────── */
const DURUM_MAP = {
  olusturuldu:          { label: "Bekliyor",     color: C.break,   bg: `${C.break}12`  },
  supervisor_inceleme:  { label: "İncelemede",   color: C.busy,    bg: `${C.busy}12`   },
  onaylandi:            { label: "Onaylandı",    color: C.active,  bg: `${C.active}12` },
  reddedildi:           { label: "Reddedildi",   color: C.alarm,   bg: `${C.alarm}12`  },
};

const FILTRELER = [
  { id: "bekleyen",  label: "Bekleyen",   durum: undefined },
  { id: "onayli",    label: "Onaylanan",  durum: "onaylandi" },
  { id: "red",       label: "Reddedilen", durum: "reddedildi" },
];

/* ─── DEMO şikayetler (backend boş döndüğünde gösterilir) ─── */
const _now = Date.now();
const _iso = (msAgo) => new Date(_now - msAgo).toISOString();
const MOCK_COMPLAINTS = {
  bekleyen: [
    {
      id: "ck-1",
      musteri_ad: "Mehmet Aydın",
      musteri_telefon: "+90 532 411 22 18",
      personel_id: "p-1",
      konu: "Görüşmeyi kısa kesti, talebim çözülmedi",
      aciklama: "Müşteri 14:25'te aradı, satış departmanına yönlendirme talep etti. Personel kısa cevap verip kapattı.",
      durum: "olusturuldu",
      kategori: "Hizmet Kalitesi",
      olusturma_tarihi: _iso(1000 * 60 * 18),         // 18 dk önce
    },
    {
      id: "ck-2",
      musteri_ad: "Ayşe Kaya",
      musteri_telefon: "+90 545 233 88 44",
      personel_id: "p-2",
      konu: "Yanlış ürün bilgisi verildi",
      aciklama: "Sipariş ettiğim ayakkabı modelinin stokta olduğu söylendi, ancak ertesi gün iptal edildi.",
      durum: "supervisor_inceleme",
      kategori: "Bilgi Doğruluğu",
      olusturma_tarihi: _iso(1000 * 60 * 47),
    },
    {
      id: "ck-3",
      musteri_ad: "Kemal Erdoğan",
      musteri_telefon: "+90 505 671 34 12",
      personel_id: "p-3",
      konu: "Çağrı çok uzun süre bekletildi",
      aciklama: "Teknik destek için aradım, 12 dk müzik dinledim. Personel bağlandığında konuyu hatırlamamıştı.",
      durum: "olusturuldu",
      kategori: "Bekleme Süresi",
      olusturma_tarihi: _iso(1000 * 60 * 90),
    },
    {
      id: "ck-4",
      musteri_ad: "Fatma Şahin",
      musteri_telefon: "+90 530 988 11 22",
      personel_id: "p-1",
      konu: "Saygısız davranış",
      aciklama: "İade talebimi sorduğumda yüksek sesle cevap verdi. VIP müşteri olmama rağmen.",
      durum: "supervisor_inceleme",
      kategori: "Davranış",
      olusturma_tarihi: _iso(1000 * 60 * 60 * 2),     // 2 saat önce
    },
  ],
  onayli: [
    {
      id: "ck-5", musteri_ad: "Hasan Öztürk", musteri_telefon: "+90 542 555 66 77",
      personel_id: "p-2", konu: "Eğitim yetersizliği — geçerli şikayet",
      aciklama: "Ürün özelliklerini bilmiyordu; süpervizör eğitim atadı.",
      durum: "onaylandi", kategori: "Bilgi Doğruluğu",
      olusturma_tarihi: _iso(1000 * 60 * 60 * 26),
    },
    {
      id: "ck-6", musteri_ad: "Zeynep Arslan", musteri_telefon: "+90 537 666 77 88",
      personel_id: "p-3", konu: "VIP müşteriye yanlış işlem",
      aciklama: "Yanlış paket aktivasyonu yapıldı; geri alındı, XP -50 düşürüldü.",
      durum: "onaylandi", kategori: "İşlem Hatası",
      olusturma_tarihi: _iso(1000 * 60 * 60 * 48),
    },
  ],
  red: [
    {
      id: "ck-7", musteri_ad: "Ali Demir", musteri_telefon: "+90 553 333 44 55",
      personel_id: "p-1", konu: "Kayıt dinlenince geçersiz çıktı",
      aciklama: "Müşteri agresif tonu personelden duyduğunu söyledi, kayıtta tam tersi tespit edildi.",
      durum: "reddedildi", kategori: "Davranış",
      olusturma_tarihi: _iso(1000 * 60 * 60 * 70),
    },
  ],
};
const MOCK_PEOPLE = {
  "p-1": { ad_soyad: "Deniz Kaya",    ekip: "Çağrı Merkezi A", dahili_no: "1101" },
  "p-2": { ad_soyad: "Selin Öztürk",  ekip: "Satış Ekibi",     dahili_no: "1102" },
  "p-3": { ad_soyad: "Ahmet Yılmaz",  ekip: "Çağrı Merkezi A", dahili_no: "1103" },
};

/* ─── Shimmer ────────────────────────────────────────────────────────────── */
function Shimmer({ h = 44, mb = 6 }) {
  return (
    <div style={{
      height: h, borderRadius: 8, marginBottom: mb,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "cxShim 1.4s infinite",
    }} />
  );
}

/* ─── Durum rozeti ───────────────────────────────────────────────────────── */
function DurumBadge({ durum }) {
  const d = DURUM_MAP[durum] ?? { label: durum || "—", color: C.muted, bg: "rgba(0,0,0,0.04)" };
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10, fontWeight: 800,
      color: d.color, background: d.bg,
      border: `1px solid ${d.color}28`,
      borderRadius: 99, padding: "2px 9px",
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {d.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function ComplaintsPage() {
  const [filter,      setFilter]      = useState("bekleyen");
  const [complaints,  setComplaints]  = useState([]);
  const [people,      setPeople]      = useState({});  // { [id]: { ad_soyad, ekip } }
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [deciding,    setDeciding]    = useState({});  // { [id]: "onayla"|"reddet" }
  const [toast,       setToast]       = useState(null);

  /* ── Veri çekimi ─────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const currentDurum = FILTRELER.find(f => f.id === filter)?.durum;

    const [cRes, pRes] = await Promise.allSettled([
      adminOpsApi.getComplaints(currentDurum ? { durum: currentDurum } : {}),
      personnelApi.getList({ per_page: 200, page: 1 }),
    ]);

    let realComplaints = [];
    if (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) {
      realComplaints = cRes.value.data;
    }

    // Boşsa veya hata ise demo veriyle doldur — sunum boş durmasın
    if (realComplaints.length === 0) {
      const mockList = MOCK_COMPLAINTS[filter] ?? MOCK_COMPLAINTS.bekleyen;
      setComplaints(mockList);
    } else {
      setComplaints(realComplaints);
    }

    if (pRes.status === "fulfilled") {
      const items = pRes.value.data?.items ?? [];
      const map = {};
      items.forEach(p => {
        map[p.id] = { ad_soyad: p.ad_soyad, ekip: p.ekip, dahili_no: p.dahili_no };
      });
      // Mock personeli her zaman ekle (demo ID'leri eşleşsin)
      setPeople({ ...MOCK_PEOPLE, ...map });
    } else {
      setPeople(MOCK_PEOPLE);
    }
    setLoading(false);
    if (manual) setRefreshing(false);
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Karar verme (optimistik) ────────────────────────────────────────── */
  const handleDecide = useCallback(async (id, karar) => {
    setDeciding(prev => ({ ...prev, [id]: karar }));
    try {
      await adminOpsApi.decideComplaint(id, karar);
      // Optimistik: bekleyen filtredeyse listeden çıkar, değilse durumu güncelle
      setComplaints(prev => {
        if (filter === "bekleyen") {
          return prev.filter(c => c.id !== id);
        }
        return prev.map(c =>
          c.id === id
            ? { ...c, durum: karar === "onayla" ? "onaylandi" : "reddedildi" }
            : c
        );
      });
      setToast({
        kind: "ok",
        msg: karar === "onayla" ? "Şikayet onaylandı" : "Şikayet reddedildi",
      });
    } catch (e) {
      const detail = e?.response?.data?.detail || "Karar işlenemedi";
      setToast({ kind: "err", msg: detail });
    } finally {
      setDeciding(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setTimeout(() => setToast(null), 3200);
    }
  }, [filter]);

  /* ── Türetilmiş ──────────────────────────────────────────────────────── */
  const bekleyenSayi = useMemo(
    () => complaints.filter(c => c.durum === "olusturuldu" || c.durum === "supervisor_inceleme").length,
    [complaints]
  );

  const formatTarih = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("tr-TR", {
        day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "—"; }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes cxShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes cxFadeOut { to { opacity: 0; transform: translateX(8px); } }
        @keyframes cxSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

        {/* ── BAŞLIK ──────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${C.alarm}12`, border: `1px solid ${C.alarm}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertCircle size={18} color={C.alarm} strokeWidth={2.3} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
                Şikayet Yönetimi
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
                Müşteri şikayetlerinin onay merkezi · Bekleyen kayıtlarda karar verin
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "#fff",
              color: C.text, fontSize: 12, fontWeight: 700,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <RefreshCw size={13} style={{
              animation: refreshing ? "cxSpin 1s linear infinite" : "none",
            }} />
            Yenile
          </button>
        </div>

        {/* ── FİLTRE ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f8fafc", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 4, width: "fit-content",
        }}>
          <Filter size={13} color={C.muted} style={{ marginLeft: 8 }} />
          {FILTRELER.map(f => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setLoading(true); }}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: active ? "#fff" : "transparent",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  color: active ? C.text : C.muted,
                  fontSize: 12, fontWeight: active ? 700 : 600,
                  cursor: "pointer", transition: "all 0.15s",
                  borderTop: active ? `2px solid ${C.purple}` : "2px solid transparent",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── TABLO ──────────────────────────────────────────────────── */}
        <Panel
          title={
            filter === "bekleyen" ? "Bekleyen Şikayetler"
              : filter === "onayli" ? "Onaylanan Şikayetler"
              : "Reddedilen Şikayetler"
          }
          accentColor={C.alarm}
          badge={
            !loading && complaints.length > 0
              ? `${complaints.length} kayıt${filter === "bekleyen" && bekleyenSayi !== complaints.length ? ` · ${bekleyenSayi} bekliyor` : ""}`
              : null
          }
          noPad
        >
          {loading ? (
            <div style={{ padding: 16 }}>
              {[0, 1, 2, 3].map(i => <Shimmer key={i} />)}
            </div>
          ) : complaints.length === 0 ? (
            <div style={{
              padding: "60px 0", textAlign: "center",
              color: C.muted, fontSize: 13,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 10,
            }}>
              <Inbox size={32} color={C.faint} />
              <div>
                {filter === "bekleyen"
                  ? "Aktif şikayet bulunmuyor — tüm kayıtlar karara bağlanmış."
                  : "Bu filtrede kayıt bulunmuyor."}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Tarih", "Temsilci", "Ekip", "Kategori", "Açıklama", "Durum", "Aksiyon"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px", textAlign: "left",
                        color: C.muted, fontWeight: 700, fontSize: 10,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        borderBottom: `1px solid ${C.border}`,
                        background: "#f8fafc", whiteSpace: "nowrap",
                        position: "sticky", top: 0,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((s) => {
                    const person   = people[s.personel_id];
                    const isBekleyen = s.durum === "olusturuldu" || s.durum === "supervisor_inceleme";
                    const dec      = deciding[s.id];
                    const busy     = !!dec;

                    return (
                      <tr key={s.id}
                        style={{
                          borderBottom: `1px solid ${C.borderL}`,
                          opacity: busy ? 0.5 : 1,
                          transition: "opacity 0.2s, background 0.12s",
                        }}
                        onMouseEnter={(e) => !busy && (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "9px 16px", color: C.muted, whiteSpace: "nowrap", fontSize: 11.5 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Clock size={11} color={C.faint} />
                            {formatTarih(s.tarih)}
                          </span>
                        </td>
                        <td style={{ padding: "9px 16px", color: C.text, fontWeight: 600, fontSize: 12 }}>
                          {person?.ad_soyad ?? (
                            <span style={{ color: C.muted, fontStyle: "italic" }}>
                              {s.personel_id ? `#${s.personel_id.slice(0, 8)}…` : "—"}
                            </span>
                          )}
                          {person?.dahili_no && (
                            <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>
                              · {person.dahili_no}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "9px 16px", color: C.muted, fontSize: 11.5 }}>
                          {person?.ekip ?? "—"}
                        </td>
                        <td style={{ padding: "9px 16px" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 9px", borderRadius: 99,
                            background: `${C.purple}10`,
                            border: `1px solid ${C.purple}28`,
                            color: C.purple, fontWeight: 700, fontSize: 10,
                            letterSpacing: "0.03em",
                          }}>
                            {s.kategori || "Genel"}
                          </span>
                        </td>
                        <td style={{
                          padding: "9px 16px", color: C.text, fontSize: 12,
                          maxWidth: 360, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                          title={s.aciklama}
                        >
                          {s.aciklama || <span style={{ color: C.faint }}>—</span>}
                        </td>
                        <td style={{ padding: "9px 16px" }}>
                          <DurumBadge durum={s.durum} />
                        </td>
                        <td style={{ padding: "9px 16px" }}>
                          {isBekleyen ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleDecide(s.id, "onayla")}
                                disabled={busy}
                                style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  padding: "5px 10px", borderRadius: 8,
                                  border: `1px solid ${C.active}30`,
                                  background: dec === "onayla" ? `${C.active}20` : `${C.active}10`,
                                  color: C.active, fontSize: 11, fontWeight: 700,
                                  cursor: busy ? "not-allowed" : "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                {dec === "onayla" ? (
                                  <RefreshCw size={11} style={{ animation: "cxSpin 0.8s linear infinite" }} />
                                ) : (
                                  <Check size={11} />
                                )}
                                Onayla
                              </button>
                              <button
                                onClick={() => handleDecide(s.id, "reddet")}
                                disabled={busy}
                                style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  padding: "5px 10px", borderRadius: 8,
                                  border: `1px solid ${C.alarm}30`,
                                  background: dec === "reddet" ? `${C.alarm}20` : `${C.alarm}10`,
                                  color: C.alarm, fontSize: 11, fontWeight: 700,
                                  cursor: busy ? "not-allowed" : "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                {dec === "reddet" ? (
                                  <RefreshCw size={11} style={{ animation: "cxSpin 0.8s linear infinite" }} />
                                ) : (
                                  <X size={11} />
                                )}
                                Reddet
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: C.faint, fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── TOAST ──────────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            padding: "12px 16px", borderRadius: 10,
            background: "#fff",
            border: `1px solid ${toast.kind === "ok" ? C.active : C.alarm}40`,
            borderLeft: `3px solid ${toast.kind === "ok" ? C.active : C.alarm}`,
            boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
            fontSize: 12.5, fontWeight: 600,
            color: toast.kind === "ok" ? C.active : C.alarm,
            display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
          }}>
            {toast.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
