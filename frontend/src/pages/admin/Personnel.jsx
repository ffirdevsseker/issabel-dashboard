/**
 * PERSONEL YÖNETİM MERKEZİ  –  /admin/personnel
 * ─────────────────────────────────────────────────
 * Sekme 1 · Ekip & Rol Matrisi
 *   • Canlı stats bar (20 sn polling) → durum filtresi olarak çalışır
 *   • Filtre çubuğu: arama · ekip · rol · durum
 *   • Data-grid: Avatar · Ad/unvan/aşım · Dahili · Ekip · Rol badge ·
 *                Anlık Durum · XP+bar · Bugün Çağrı · Aksiyonlar
 *   • Mola aşımı → kırmızı sol kenarlık
 *   • Sağdan kayan EditSlideOver (rol/ekip/kuyruk/dahili)
 *   • Üç-nokta menü (Detaya Git · Şifre Sıfırla · Kilitle · Soft Delete)
 *   • Sayfalama
 *
 * Sekme 2 · Vardiya & Devamlılık Panosu
 *   • Haftalık matris: geç giriş ▲ · erken çıkış ▼ · mola aşımı ! · devamsız ✕
 *   • Sağ panel: seçili hücre detayı (giriş/çıkış/mola/gecikme)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RefreshCw, Plus, Users, Headphones, Coffee, PowerOff,
  AlertTriangle, MoreVertical, ExternalLink, KeyRound, Lock, UserMinus,
  Edit2, X, ChevronDown, ChevronLeft, ChevronRight,
  Shield, UserCheck, Clock, XCircle, Info, WifiOff, CheckCircle2,
} from "lucide-react";
import { personnelApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_THEME } from "@/constants/adminTheme";

/* ── Utility ──────────────────────────────────────────────────────────────── */
const C = ADMIN_THEME;
const PER_PAGE = 25;
const TEAMS  = ["A Ekibi", "B Ekibi", "Şikayet Ekibi", "VIP Ekibi"];
const QUEUES = ["Genel Destek", "Şikayet Hattı", "VIP Destek", "Teknik Destek"];

const WEEK_DAYS = [
  { label:"Pzt", date:"04.05", today:false }, { label:"Sal", date:"05.05", today:false },
  { label:"Çar", date:"06.05", today:false }, { label:"Per", date:"07.05", today:false },
  { label:"Cum", date:"08.05", today:true  }, { label:"Cmt", date:"09.05", today:false },
  { label:"Paz", date:"10.05", today:false },
];

/* ── Shared style objects ─────────────────────────────────────────────────── */
const S = {
  card: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
};


/* ══════════════════════════════ Atom Bileşenler ═════════════════════════════ */

function Avatar({ name, color, size = 34 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, fontSize: size * 0.38, color,
        background: `${color}1a`, border: `1.5px solid ${color}30`,
        borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 700, flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initial}
    </div>
  );
}

function RoleBadge({ rol }) {
  if (rol === "supervisor") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: "50%", fontSize: 10, fontWeight: 700,
        background: "#eef2ff", color: "#4338ca",
        boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.15)",
        borderRadius: 20,
      }}>
        <Shield size={9} /> Süpervizör
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: "#ecfdf5", color: "#065f46",
      boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.15)",
    }}>
      <UserCheck size={9} /> Personel
    </span>
  );
}

function AnlikDurumBadge({ durum, mola_asimi_dk }) {
  if ((mola_asimi_dk || 0) > 0) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
        background: "rgba(239,68,68,0.08)", color: "#dc2626",
        boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.2)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        +{mola_asimi_dk}dk Aşım
      </span>
    );
  }
  const MAP = {
    aktif:   { bg: "rgba(16,185,129,0.08)",  text: "#065f46", dot: "#10b981", label: "Aktif"      },
    mesgul:  { bg: "rgba(59,130,246,0.08)",  text: "#1d4ed8", dot: "#3b82f6", label: "Görüşmede"  },
    mola:    { bg: "rgba(245,158,11,0.08)",  text: "#b45309", dot: "#f59e0b", label: "Molada"     },
    offline: { bg: "rgba(148,163,184,0.08)", text: "#64748b", dot: "#94a3b8", label: "Offline"    },
  };
  const m = MAP[durum] || MAP.offline;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: m.bg, color: m.text,
      boxShadow: `inset 0 0 0 1px ${m.dot}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot }} />
      {m.label}
    </span>
  );
}

function XpBar({ xp = 0, seviye = 1 }) {
  const pct = Math.min(100, Math.round((xp % 500) / 500 * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontSize: 9, fontWeight: 800, color: "#7c3aed",
        background: "#f5f3ff", border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap", lineHeight: 1,
      }}>
        Lv {seviye}
      </span>
      <div style={{
        flex: 1, height: 3, background: "#f1f5f9", borderRadius: 4,
        overflow: "hidden", minWidth: 28,
      }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: "linear-gradient(to right, #8b5cf6, #6366f1)",
          width: `${pct}%`,
        }} />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: "none", width: "100%", padding: "8px 28px 8px 12px",
          fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8,
          background: "#ffffff", color: "#374151",
          outline: "none", cursor: "pointer",
        }}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
      <ChevronDown size={11} style={{
        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        color: "#94a3b8", pointerEvents: "none",
      }} />
    </div>
  );
}


/* ══════════════════════════ Edit Slide-Over ══════════════════════════════════ */
function EditSlideOver({ person, filters, onClose, onSave }) {
  const [form, setForm] = useState({
    rol:      person.rol       || "personel",
    ekip_id:  person.ekip_id   || "",
    dahili_no: person.dahili_no || "",
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [err,    setErr]    = useState(null);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const payload = {};
      if (form.rol       !== (person.rol       || "personel"))  payload.rol       = form.rol;
      if (form.ekip_id   !== (person.ekip_id   || ""))          payload.ekip_id   = form.ekip_id   || null;
      if (form.dahili_no !== (person.dahili_no || ""))          payload.dahili_no = form.dahili_no || null;

      if (Object.keys(payload).length === 0) {
        setDone(true);
        setTimeout(() => { onSave({ ...person }); onClose(); }, 600);
        setSaving(false);
        return;
      }

      const res = await personnelApi.update(person.id, payload);
      setDone(true);
      setTimeout(() => { onSave(res.data); onClose(); }, 600);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Güncelleme başarısız. Sunucu hatası.");
      setSaving(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.10)",
          backdropFilter: "blur(2px)", zIndex: 40,
        }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", right: 0, top: 0, height: "100%", width: 400,
        background: "#ffffff", borderLeft: "1px solid #f1f5f9",
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)", zIndex: 50,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={person.ad_soyad} color={person._c || "#6366f1"} size={38} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{person.ad_soyad}</p>
              <p style={{ fontSize: 11, color: "#94a3b8" }}>@{person.kullanici_adi} · {person.dahili_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 6, borderRadius: 8, color: "#94a3b8", background: "none",
              border: "none", cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Yetki & Atama
          </p>

          {err && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: 12,
            }}>
              <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: "#b91c1c", fontWeight: 600 }}>{err}</p>
            </div>
          )}

          {/* Rol toggle */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Rol</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["supervisor","Süpervizör"],["personel","Personel"]].map(([r, label]) => {
                const isActive = form.rol === r;
                const activeStyle = r === "supervisor"
                  ? { borderColor: "#6366f1", background: "#eef2ff", color: "#4338ca", boxShadow: "inset 0 0 0 1px #818cf8" }
                  : { borderColor: "#10b981", background: "#ecfdf5", color: "#065f46", boxShadow: "inset 0 0 0 1px #34d399" };
                return (
                  <button key={r} onClick={() => setForm(f => ({...f, rol:r}))}
                    style={{
                      padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      border: "1px solid",
                      ...(isActive ? activeStyle : {
                        borderColor: "#e2e8f0", background: "#ffffff", color: "#64748b",
                      }),
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Ekip</label>
            <SelectField
              label="Ekip seçin"
              value={form.ekip_id}
              onChange={v => setForm(f=>({...f, ekip_id:v}))}
              options={(filters?.ekipler || []).map(e => ({ v: e.id, l: e.ad }))}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Dahili Numara</label>
            <input
              value={form.dahili_no}
              onChange={e => setForm(f=>({...f,dahili_no:e.target.value}))}
              placeholder="Örn: 109"
              style={{
                width: "100%", padding: "8px 12px", fontSize: 13,
                border: "1px solid #e2e8f0", borderRadius: 8,
                fontFamily: "monospace", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{
            display: "flex", gap: 8, background: "#fffbeb",
            border: "1px solid #fef3c7", borderRadius: 8, padding: 12,
          }}>
            <Info size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: "#b45309" }}>Rol değişikliği sonraki oturumda geçerli olur. Aktif çağrı etkilenmez.</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #f1f5f9",
          display: "flex", gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
              color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8,
              background: "#ffffff", cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700,
              borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              background: done ? "#10b981" : "#6366f1",
              color: "#ffffff",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {done ? "✓ Kaydedildi" : saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </>
  );
}


/* ══════════════════════════ Toast ═══════════════════════════════════════════ */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isOk = toast.type === "success";
  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 10,
        background: isOk ? "#ecfdf5" : "#fef2f2",
        border: `1px solid ${isOk ? "#6ee7b7" : "#fca5a5"}`,
        borderRadius: 12, padding: "12px 18px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        minWidth: 280, maxWidth: 400,
        animation: "slideUp 0.25s ease",
      }}
    >
      {isOk
        ? <CheckCircle2 size={18} style={{ color: "#10b981", flexShrink: 0 }} />
        : <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
      }
      <span style={{ fontSize: 13, fontWeight: 600, color: isOk ? "#065f46" : "#991b1b", flex: 1 }}>
        {toast.msg}
      </span>
      <button onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af" }}>
        <X size={14} />
      </button>
    </div>
  );
}


/* ══════════════════════════ Yeni Personel Modal ════════════════════════════ */
function YeniPersonelModal({ filters, onClose, onSuccess }) {
  const [form, setForm] = useState({
    ad_soyad: "", kullanici_adi: "", dahili_no: "", rol: "personel", ekip_id: "", sifre: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState(null);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ad_soyad.trim() || !form.kullanici_adi.trim() || !form.sifre.trim()) {
      setErr("Ad soyad, kullanıcı adı ve şifre zorunludur."); return;
    }
    if (form.sifre.length < 6) {
      setErr("Şifre en az 6 karakter olmalıdır."); return;
    }
    setSaving(true); setErr(null);
    try {
      await personnelApi.create({
        ad_soyad:     form.ad_soyad.trim(),
        kullanici_adi: form.kullanici_adi.trim(),
        dahili_no:    form.dahili_no.trim() || null,
        rol:          form.rol,
        ekip_id:      form.ekip_id || null,
        sifre:        form.sifre,
      });
      onSuccess("Personel başarıyla oluşturuldu.");
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Personel oluşturulamadı. Sunucu hatası.");
      setSaving(false);
    }
  }

  const overlay = { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
    display:"flex", alignItems:"center", justifyContent:"flex-end" };
  const drawer  = { width: 420, height:"100%", background:"#fff", boxShadow:"-8px 0 32px rgba(0,0,0,0.15)",
    display:"flex", flexDirection:"column" };
  const hdr     = { padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
    display:"flex", alignItems:"center", justifyContent:"space-between" };
  const body    = { flex:1, overflowY:"auto", padding:"24px" };
  const ftr     = { padding:"16px 24px", borderTop:"1px solid #f1f5f9",
    display:"flex", gap:10, justifyContent:"flex-end" };
  const lbl     = { display:"block", fontSize:11, fontWeight:700, color:"#475569",
    textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 };
  const inp     = { width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0",
    borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc", boxSizing:"border-box",
    outline:"none" };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={drawer} onClick={e => e.stopPropagation()}>
        <div style={hdr}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>Yeni Personel Ekle</p>
            <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Müşteri Hizmetleri departmanına</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        <div style={body}>
          {err && (
            <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8,
              padding:"10px 14px", marginBottom:16, fontSize:12, color:"#991b1b", fontWeight:600 }}>
              {err}
            </div>
          )}
          <form id="yeni-personel-form" onSubmit={handleSubmit}>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              <div>
                <label style={lbl}>Ad Soyad *</label>
                <input style={inp} value={form.ad_soyad} autoFocus
                  onChange={e => setF("ad_soyad", e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz" />
              </div>

              <div>
                <label style={lbl}>Kullanıcı Adı *</label>
                <input style={inp} value={form.kullanici_adi}
                  onChange={e => setF("kullanici_adi", e.target.value.toLowerCase().replace(/\s/g,""))}
                  placeholder="Örn: ahmet.yilmaz" />
              </div>

              <div>
                <label style={lbl}>Dahili No</label>
                <input style={inp} value={form.dahili_no}
                  onChange={e => setF("dahili_no", e.target.value)}
                  placeholder="Örn: 109" />
              </div>

              <div>
                <label style={lbl}>Rol *</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["personel","supervisor"].map(r => (
                    <button key={r} type="button"
                      onClick={() => setF("rol", r)}
                      style={{
                        flex:1, padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:700,
                        cursor:"pointer", transition:"all 0.15s",
                        background: form.rol === r ? "#6366f1" : "#f8fafc",
                        color:      form.rol === r ? "#fff"    : "#64748b",
                        border:     form.rol === r ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
                      }}>
                      {r === "personel" ? "Personel" : "Supervisor"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Ekip</label>
                <select style={inp} value={form.ekip_id} onChange={e => setF("ekip_id", e.target.value)}>
                  <option value="">— Ekip seçin (opsiyonel) —</option>
                  {(filters?.ekipler || []).map(e => (
                    <option key={e.id} value={e.id}>{e.ad}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={lbl}>Şifre *</label>
                <input style={inp} type="password" value={form.sifre}
                  onChange={e => setF("sifre", e.target.value)}
                  placeholder="En az 6 karakter" />
              </div>

            </div>
          </form>
        </div>

        <div style={ftr}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e2e8f0",
              background:"#f8fafc", fontSize:13, fontWeight:600, cursor:"pointer", color:"#64748b" }}>
            İptal
          </button>
          <button form="yeni-personel-form" type="submit" disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, border:"none",
              background: saving ? "#a5b4fc" : "#6366f1",
              color:"#fff", fontSize:13, fontWeight:700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Kaydediliyor…" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════ Şifre Sıfırlama Modal ══════════════════════════ */
function SifreSifirlaModal({ person, onClose, onSuccess }) {
  const [yeni, setYeni]     = useState("");
  const [konfirm, setKonfirm] = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (yeni.length < 6) { setErr("Şifre en az 6 karakter olmalıdır."); return; }
    if (yeni !== konfirm) { setErr("Şifreler eşleşmiyor."); return; }
    setSaving(true); setErr(null);
    try {
      await personnelApi.resetPassword(person.id, { yeni_sifre: yeni });
      onSuccess(`${person.ad_soyad} için şifre başarıyla sıfırlandı.`);
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Şifre sıfırlanamadı.");
      setSaving(false);
    }
  }

  const overlay = { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
    display:"flex", alignItems:"center", justifyContent:"center" };
  const modal   = { background:"#fff", borderRadius:16, width:400, padding:28,
    boxShadow:"0 20px 60px rgba(0,0,0,0.2)" };
  const lbl     = { display:"block", fontSize:11, fontWeight:700, color:"#475569",
    textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 };
  const inp     = { width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0",
    borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc", boxSizing:"border-box" };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>Şifre Sıfırla</p>
            <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{person?.ad_soyad}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}>
            <X size={18} />
          </button>
        </div>

        {err && (
          <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8,
            padding:"10px 14px", marginBottom:16, fontSize:12, color:"#991b1b", fontWeight:600 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={lbl}>Yeni Şifre</label>
              <input style={inp} type="password" value={yeni} autoFocus
                onChange={e => setYeni(e.target.value)} placeholder="En az 6 karakter" />
            </div>
            <div>
              <label style={lbl}>Şifre Tekrar</label>
              <input style={inp} type="password" value={konfirm}
                onChange={e => setKonfirm(e.target.value)} placeholder="Aynı şifreyi girin" />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #e2e8f0",
                background:"#f8fafc", fontSize:13, fontWeight:600, cursor:"pointer", color:"#64748b" }}>
              İptal
            </button>
            <button type="submit" disabled={saving}
              style={{ padding:"9px 18px", borderRadius:8, border:"none",
                background: saving ? "#fbbf24" : "#f59e0b",
                color:"#fff", fontSize:13, fontWeight:700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Kaydediliyor…" : "Şifreyi Sıfırla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ══════════════════════════ Üç Nokta Aksiyon Menüsü ═════════════════════════ */
function ThreeDotsMenu({ person, isAdmin, onEdit, onDetail, onSifreSifirla, onKilitle, onSoftDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const menuItems = [
    { label:"Detaya Git",    Icon:ExternalLink, color:"#2563eb",  fn: onDetail },
    { label:"Düzenle",       Icon:Edit2,        color:"#374151",  fn: onEdit   },
    { label:"Şifre Sıfırla", Icon:KeyRound,     color:"#d97706", fn: () => { onSifreSifirla(person); setOpen(false); } },
    {
      label: person.kilitli ? "Kilidi Aç" : "Hesabı Kilitle",
      Icon: Lock,
      color: person.kilitli ? "#059669" : "#64748b",
      fn: () => { onKilitle(person); setOpen(false); }
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: 6, borderRadius: 8, color: "#cbd5e1", background: "none",
          border: "none", cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "#f1f5f9"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "none"; }}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 50,
          background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.12)", overflow: "hidden", width: 192,
        }}>
          <div style={{
            padding: "8px 12px", fontSize: 9, fontWeight: 800, color: "#94a3b8",
            textTransform: "uppercase", letterSpacing: "0.08em",
            borderBottom: "1px solid #f8fafc",
          }}>
            {person.ad_soyad}
          </div>
          {menuItems.map(({ label, Icon, color, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", fontSize: 12, fontWeight: 600,
                color, background: "none", border: "none", cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
          {isAdmin && (
            <>
              <div style={{ height: 1, background: "#f8fafc", margin: "0 8px" }} />
              <button
                onClick={() => {
                  setOpen(false);
                  if (window.confirm(`${person.ad_soyad} pasif edilecek. Onaylıyor musunuz?`)) {
                    onSoftDelete(person.id);
                  }
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", fontSize: 12, fontWeight: 700,
                  color: "#ef4444", background: "none", border: "none", cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <UserMinus size={12} /> Soft Delete (Pasif Et)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════ SEKME 1 – Ekip & Rol Matrisi ════════════════════ */
function MatrisTab({ isAdmin }) {
  const navigate   = useNavigate();
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [stats,    setStats]    = useState(null);
  const [filters,  setFilters]  = useState({ ekipler:[], roller:[] });
  const [loading,  setLoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [page,     setPage]     = useState(1);
  const [params,   setParams]   = useState({ q:"", ekip_id:"", rol:"", durum:"" });
  const pollRef = useRef(null);

  // Modal & toast state
  const [yeniPersonelOpen,   setYeniPersonelOpen]   = useState(false);
  const [sifreSifirlaKisi,   setSifreSifirlaKisi]   = useState(null);
  const [toast,              setToast]              = useState(null);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  /* Filter options */
  useEffect(() => {
    personnelApi.getFilters()
      .then(r => setFilters(r.data))
      .catch(() => {});
  }, []);

  /* Stats polling (20 sn) */
  const fetchStats = useCallback(async () => {
    try { const r = await personnelApi.getStats?.(); if (r?.data) setStats(r.data); }
    catch { /* API yokken mock stats */ }
  }, []);
  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchStats]);

  /* Liste çekimi */
  const fetchList = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const p = { page, per_page: PER_PAGE, ...params };
      Object.keys(p).forEach(k => !p[k] && delete p[k]);
      const r = await personnelApi.getList(p);
      setItems(r.data.items || []);
      setTotal(r.data.toplam ?? r.data.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [page, params]);

  useEffect(() => { fetchList(); }, [fetchList]);

  /* ── Kilitle / Kilidi Aç ─────────────────────────────────────────────────── */
  const handleKilitle = useCallback(async (person) => {
    const yeniKilitli = !person.kilitli;
    try {
      await personnelApi.lock(person.id, { kilitli: yeniKilitli });
      setItems(prev => prev.map(p => p.id === person.id ? { ...p, kilitli: yeniKilitli } : p));
      showToast(yeniKilitli
        ? `${person.ad_soyad} hesabı kilitlendi.`
        : `${person.ad_soyad} kilidi açıldı.`
      );
    } catch (ex) {
      showToast(ex?.response?.data?.detail || "İşlem başarısız.", "error");
    }
  }, []);

  /* ── Soft Delete ─────────────────────────────────────────────────────────── */
  const handleSoftDelete = useCallback(async (userId) => {
    try {
      await personnelApi.softDelete(userId);
      setItems(prev => prev.filter(p => p.id !== userId));
      setTotal(t => Math.max(0, t - 1));
      showToast("Personel pasife alındı.");
    } catch (ex) {
      showToast(ex?.response?.data?.detail || "Silme işlemi başarısız.", "error");
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const overrun    = stats?.mola_asimi ?? 0;

  const liveStats = stats ?? {
    toplam: 0, aktif: 0, mesgul: 0, mola: 0, offline: 0,
  };

  const STAT_CARDS = [
    { label:"Tümü",       key:"",       val: liveStats.toplam,  textColor:"#1e293b"  },
    { label:"Aktif",      key:"aktif",  val: liveStats.aktif,   textColor:"#065f46"  },
    { label:"Görüşmede",  key:"mesgul", val: liveStats.mesgul,  textColor:"#1d4ed8"  },
    { label:"Molada",     key:"mola",   val: liveStats.mola,    textColor:"#b45309"  },
    { label:"Offline",    key:"offline",val: liveStats.offline, textColor:"#475569"  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {STAT_CARDS.map(c => {
          const active = params.durum === c.key;
          return (
            <button
              key={c.key}
              onClick={() => { setParams(p=>({...p,durum:c.key})); setPage(1); }}
              style={{
                ...S.card,
                padding: 16, textAlign: "left", cursor: "pointer",
                transition: "all 0.15s", border: "1px solid",
                borderColor: active ? "#818cf8" : "#f1f5f9",
                boxShadow: active
                  ? "0 0 0 2px rgba(99,102,241,0.25), 0 1px 3px rgba(0,0,0,0.06)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = active ? "0 0 0 2px rgba(99,102,241,0.25), 0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.06)"; }}
            >
              <p style={{ fontSize: 24, fontWeight: 800, color: c.textColor }}>{c.val ?? "—"}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginTop: 2 }}>{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Mola aşımı alarm banner */}
      {overrun > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 12, padding: "12px 16px",
        }}>
          <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0, animation: "pulse 2s ease-in-out infinite" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#b91c1c" }}>
            <strong>{overrun} personel</strong> mola süresini aşıyor — kırmızı satırları inceleyin.
          </p>
        </div>
      )}

      {/* ── Filtre + Tablo Kartı ────────────────────────────────────────── */}
      <div style={{ ...S.card, overflow: "hidden" }}>
        {/* Filtre çubuğu */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #f8fafc",
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
        }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={params.q}
              onChange={e => { setParams(p=>({...p,q:e.target.value})); setPage(1); }}
              placeholder="Ad, kullanıcı adı veya dahili..."
              style={{
                width: "100%", paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8,
                background: "rgba(248,250,252,0.5)", outline: "none",
                boxSizing: "border-box", color: "#0f172a",
              }}
            />
          </div>
          <SelectField label="Ekip" value={params.ekip_id}
            onChange={v => { setParams(p=>({...p,ekip_id:v})); setPage(1); }}
            options={(filters.ekipler || TEAMS).map(e => typeof e==="string" ? {v:e,l:e} : {v:e.id,l:e.ad})} />
          <SelectField label="Rol" value={params.rol}
            onChange={v => { setParams(p=>({...p,rol:v})); setPage(1); }}
            options={(filters.roller||[{ad:"supervisor"},{ad:"agent"}]).map(r => ({v:r.ad||r,l:r.ad||r}))} />
          {(params.q||params.ekip_id||params.rol||params.durum) && (
            <button
              onClick={() => { setParams({q:"",ekip_id:"",rol:"",durum:""}); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748b",
                background: "none", border: "none", borderRadius: 8, cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "none"; }}
            >
              <X size={11} /> Temizle
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{loading ? "…" : `${total} personel`}</span>
            <button
              onClick={() => fetchList(true)}
              disabled={refreshing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748b",
                border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff",
                cursor: "pointer", opacity: refreshing ? 0.5 : 1,
              }}
              onMouseEnter={e => !refreshing && (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
              Yenile
            </button>
            {isAdmin && (
              <button
                onClick={() => setYeniPersonelOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#ffffff",
                  background: "#059669", border: "none", borderRadius: 8, cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#047857"}
                onMouseLeave={e => e.currentTarget.style.background = "#059669"}
              >
                <Plus size={12} /> Yeni Personel
              </button>
            )}
          </div>
        </div>

        {/* Tablo başlığı */}
        <div
          style={{
            display: "grid", padding: "10px 20px",
            background: "rgba(248,250,252,0.7)", borderBottom: "1px solid #f1f5f9",
            fontSize: 10, fontWeight: 700, color: "#94a3b8",
            textTransform: "uppercase", letterSpacing: "0.06em",
            gridTemplateColumns: "minmax(200px,2.5fr) 90px 120px 90px 120px 100px 60px 40px",
          }}
        >
          <span>Personel</span><span>Dahili</span><span>Ekip</span><span>Rol</span>
          <span>Durum</span><span>XP / Seviye</span><span style={{ textAlign: "right" }}>Çağrı</span><span />
        </div>

        {/* Satırlar */}
        <div>
          {loading ? (
            Array.from({length:5}).map((_,i) => (
              <div key={i} style={{
                height: 58, margin: "8px 16px", borderRadius: 8,
                background: "rgba(241,245,249,0.6)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
            ))
          ) : items.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <Users size={36} style={{ display: "block", margin: "0 auto 12px", color: "#e2e8f0" }} />
              <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Filtrelere uyan personel bulunamadı</p>
            </div>
          ) : items.map(p => {
            const overrunRow = (p.mola_asimi_dk || 0) > 0;
            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,2.5fr) 90px 120px 90px 120px 100px 60px 40px",
                  alignItems: "center",
                  padding: "12px 20px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f8fafc",
                  borderLeft: `2px solid ${overrunRow ? "#f87171" : "transparent"}`,
                  background: overrunRow ? "rgba(239,68,68,0.04)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = overrunRow ? "rgba(239,68,68,0.07)" : "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = overrunRow ? "rgba(239,68,68,0.04)" : "transparent"}
                onClick={() => navigate(`/admin/personnel/${p.id}`)}
              >
                {/* Personel */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar name={p.ad_soyad} color={p._c || "#6366f1"} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: "#0f172a",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{p.ad_soyad}</span>
                      {p.unvan && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: "#7c3aed",
                          background: "#f5f3ff", border: "1px solid rgba(139,92,246,0.3)",
                          borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap",
                        }}>
                          {p.unvan.toUpperCase()}
                        </span>
                      )}
                      {overrunRow && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: "#dc2626",
                          background: "#fef2f2", border: "1px solid #fca5a5",
                          borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap",
                          animation: "pulse 2s ease-in-out infinite",
                        }}>
                          +{p.mola_asimi_dk}DK AŞIM
                        </span>
                      )}
                      {p.kilitli && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: "#64748b",
                          background: "#f1f5f9", border: "1px solid #cbd5e1",
                          borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap",
                        }}>
                          🔒 KİLİTLİ
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>@{p.kullanici_adi || "—"}</p>
                  </div>
                </div>

                {/* Dahili */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#4f46e5",
                    background: "#eef2ff", padding: "2px 8px", borderRadius: 6,
                  }}>
                    {p.dahili_no || "—"}
                  </span>
                  {p.sip_durumu === "koptu" && <WifiOff size={10} style={{ color: "#f87171" }} />}
                </div>

                {/* Ekip */}
                <span style={{
                  fontSize: 11, color: "#475569", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{p.ekip || "—"}</span>

                {/* Rol */}
                <RoleBadge rol={p.rol} />

                {/* Anlık Durum */}
                <AnlikDurumBadge durum={p.anlik_durum} mola_asimi_dk={p.mola_asimi_dk} />

                {/* XP */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>
                    {(p.xp||0).toLocaleString("tr-TR")} XP
                  </p>
                  <XpBar xp={p.xp} seviye={p.seviye} />
                </div>

                {/* Bugün Çağrı */}
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "right" }}>{p.bugun_cagri ?? 0}</p>

                {/* Aksiyonlar */}
                <div
                  style={{ display: "flex", justifyContent: "flex-end" }}
                  className="_three-dots-wrap"
                >
                  <ThreeDotsMenu
                    person={p} isAdmin={isAdmin}
                    onDetail={() => navigate(`/admin/personnel/${p.id}`)}
                    onEdit={() => setEditPerson(p)}
                    onSifreSifirla={setSifreSifirlaKisi}
                    onKilitle={handleKilitle}
                    onSoftDelete={handleSoftDelete}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div style={{
            padding: "12px 20px", borderTop: "1px solid #f8fafc",
            background: "rgba(248,250,252,0.5)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              <strong style={{ color: "#475569" }}>{total}</strong> personelden&nbsp;
              {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,total)} gösteriliyor
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                disabled={page===1}
                onClick={() => setPage(p=>Math.max(1,p-1))}
                style={{
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b",
                  background: "#ffffff", cursor: page===1 ? "not-allowed" : "pointer",
                  opacity: page===1 ? 0.3 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg = page<=3 ? i+1 : page-2+i;
                if (pg<1||pg>totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", transition: "colors 0.1s",
                      border: "1px solid",
                      borderColor: pg===page ? "#6366f1" : "#e2e8f0",
                      background: pg===page ? "#6366f1" : "#ffffff",
                      color: pg===page ? "#ffffff" : "#475569",
                    }}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page===totalPages}
                onClick={() => setPage(p=>Math.min(totalPages,p+1))}
                style={{
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b",
                  background: "#ffffff", cursor: page===totalPages ? "not-allowed" : "pointer",
                  opacity: page===totalPages ? 0.3 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Slide-Over */}
      {editPerson && (
        <EditSlideOver
          person={editPerson}
          filters={filters}
          onClose={() => setEditPerson(null)}
          onSave={updated => {
            setItems(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            showToast(`${updated.ad_soyad || editPerson.ad_soyad} güncellendi.`);
          }}
        />
      )}

      {/* Yeni Personel Modal */}
      {yeniPersonelOpen && (
        <YeniPersonelModal
          filters={filters}
          onClose={() => setYeniPersonelOpen(false)}
          onSuccess={msg => { showToast(msg); fetchList(true); }}
        />
      )}

      {/* Şifre Sıfırla Modal */}
      {sifreSifirlaKisi && (
        <SifreSifirlaModal
          person={sifreSifirlaKisi}
          onClose={() => setSifreSifirlaKisi(null)}
          onSuccess={msg => showToast(msg)}
        />
      )}

      {/* Toast Bildirimi */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}


/* ══════════════════════════ SEKME 2 – Vardiya Panosu ════════════════════════ */
function AttendanceCell({ dayData, isToday, isSelected, onClick }) {
  if (!dayData.planned) {
    return (
      <div style={{
        height: 72, borderRadius: 8, border: "1px dashed #e2e8f0",
        background: "rgba(248,250,252,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
      </div>
    );
  }
  if (!dayData.actual_in) {
    return (
      <div
        onClick={onClick}
        style={{
          height: 72, borderRadius: 8, border: "1px solid #fca5a5",
          background: "#fef2f2", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 2,
          cursor: "pointer",
          boxShadow: isSelected ? "0 0 0 2px #f87171, 0 0 0 3px #fff0f0" : "none",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#f87171"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#fca5a5"}
      >
        <XCircle size={18} style={{ color: "#fca5a5" }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em" }}>Devamsız</span>
      </div>
    );
  }
  const hasAny = dayData.late > 5 || dayData.early > 10 || dayData.bov;
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative", height: 72, borderRadius: 8, padding: 8,
        cursor: "pointer", userSelect: "none", transition: "all 0.15s",
        border: "1px solid",
        borderColor: hasAny ? "#fcd34d" : isToday && !hasAny ? "#a5b4fc" : "#f1f5f9",
        background: hasAny ? "rgba(245,158,11,0.05)" : isToday && !hasAny ? "rgba(99,102,241,0.05)" : "#ffffff",
        boxShadow: isSelected ? "0 0 0 2px #6366f1, 0 0 0 3px #eef2ff" : "none",
      }}
    >
      {dayData.bov && (
        <span style={{
          position: "absolute", top: -6, right: -6, width: 16, height: 16,
          borderRadius: "50%", background: "#ef4444",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", zIndex: 10,
        }}>
          <span style={{ color: "#ffffff", fontSize: 9, fontWeight: 700 }}>!</span>
        </span>
      )}
      <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{dayData.planned}</p>
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
        {dayData.late > 5  && <div style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>▲</span><span style={{ color: "#ef4444", fontSize: 10, fontWeight: 600 }}>+{dayData.late}dk</span></div>}
        {dayData.early > 10 && <div style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ color: "#f97316", fontSize: 10, fontWeight: 700 }}>▼</span><span style={{ color: "#f97316", fontSize: 10, fontWeight: 600 }}>-{dayData.early}dk</span></div>}
        {dayData.bov && !dayData.late && !dayData.early && <div style={{ display: "flex", alignItems: "center", gap: 2 }}><Clock size={9} style={{ color: "#f87171" }}/><span style={{ color: "#f87171", fontSize: 10, fontWeight: 600 }}>{dayData.brk}dk mola</span></div>}
      </div>
    </div>
  );
}

function DayDetailPanel({ sel, onClose }) {
  if (!sel) return (
    <div style={{
      ...S.card,
      border: "1px dashed #e2e8f0", height: 176,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8",
    }}>
      <Clock size={22} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: 11, textAlign: "center" }}>Hücreye tıklayın</p>
    </div>
  );
  const { person, dayData, dayLabel } = sel;
  return (
    <div style={{ ...S.card, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={person.ad_soyad} color={person._c || "#6366f1"} size={32} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{person.ad_soyad}</p>
            <p style={{ fontSize: 10, color: "#94a3b8" }}>{dayLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ padding: 4, borderRadius: 4, color: "#cbd5e1", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.color = "#64748b"}
          onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}
        >
          <X size={13}/>
        </button>
      </div>
      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Giriş</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: dayData.late>5 ? "#dc2626" : "#1e293b" }}>{dayData.actual_in||"—"}</p>
          {dayData.late>5 && <p style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>+{dayData.late}dk gecikme</p>}
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Çıkış</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: dayData.early>10 ? "#f97316" : "#1e293b" }}>{dayData.actual_out||"—"}</p>
          {dayData.early>10 && <p style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>-{dayData.early}dk erken</p>}
        </div>
      </div>
      <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Mola</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: dayData.bov ? "#dc2626" : "#1e293b" }}>{dayData.brk}dk</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: dayData.bov ? "#fef2f2" : "#ecfdf5",
          color: dayData.bov ? "#dc2626" : "#059669",
        }}>
          {dayData.bov ? "Süre Aşıldı" : "Normal"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#94a3b8" }}>
        <Clock size={10} style={{ color: "#cbd5e1" }}/> Planlanan: <strong style={{ color: "#475569" }}>{dayData.planned}</strong>
      </div>
    </div>
  );
}

/* ── Haftalık tarih yardımcıları ────────────────────────────────────────── */
const DAY_NAMES = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const AVATAR_COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899","#8b5cf6","#06b6d4","#f97316"];
function avatarColor(id) {
  if (!id) return "#6366f1";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getWeekMeta(offset) {
  const today = new Date();
  const dow = today.getDay();  // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;  // distance to Monday
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff + offset * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt  = (d) => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
  const fmtY = (d) => `${String(d.getDate()).padStart(2,'0')} ${d.toLocaleString("tr-TR",{month:"short"})} ${d.getFullYear()}`;
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return {
      label: DAY_NAMES[i],
      date:  fmt(d),
      today: d.toDateString() === today.toDateString(),
    };
  });
  return { weekLabel: `${fmtY(mon)} – ${fmtY(sun)}`, weekOffset: offset, days };
}

function VardiyaTab() {
  const [selected,    setSelected]    = useState(null);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [personList,  setPersonList]  = useState([]);
  const [attendance,  setAttendance]  = useState({});
  const [loading,     setLoading]     = useState(true);

  const { weekLabel, days: weekDays } = getWeekMeta(weekOffset);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    Promise.allSettled([
      personnelApi.getList({ per_page: 50 }),
      personnelApi.getAttendance(weekOffset),
    ]).then(([personRes, attRes]) => {
      if (personRes.status === "fulfilled") {
        setPersonList(personRes.value.data?.items || []);
      }
      if (attRes.status === "fulfilled") {
        setAttendance(attRes.value.data?.attendance || {});
      }
      setLoading(false);
    });
  }, [weekOffset]);

  const totalViol = personList.reduce((s, p) => {
    const days = attendance[p.id] || [];
    return s + days.filter(d => d.planned && (!d.actual_in || d.late > 5 || d.bov)).length;
  }, 0);

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Hafta başlığı */}
        <div style={{ ...S.card, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{weekLabel}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {loading ? "Yükleniyor…" : <><strong style={{ color: "#ef4444" }}>{totalViol}</strong> devam ihlali</>}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              style={{
                padding: 6, borderRadius: 8, border: "1px solid #e2e8f0",
                color: "#94a3b8", background: "#ffffff", cursor: "pointer",
                display: "flex", alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#475569"}
              onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
            >
              <ChevronLeft size={14}/>
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8,
                border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                borderColor: weekOffset === 0 ? "#a5b4fc" : "#e2e8f0",
                background: weekOffset === 0 ? "#eef2ff" : "#ffffff",
                color: weekOffset === 0 ? "#4f46e5" : "#64748b",
              }}
            >
              {weekOffset === 0 ? "Bu Hafta" : weekOffset < 0 ? `${-weekOffset} hafta önce` : `${weekOffset} hafta sonra`}
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              style={{
                padding: 6, borderRadius: 8, border: "1px solid #e2e8f0",
                color: "#94a3b8", background: "#ffffff", cursor: "pointer",
                display: "flex", alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#475569"}
              onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
            >
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 10, color: "#94a3b8", padding: "0 4px", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#ef4444", fontWeight: 700 }}>▲</span> Geç (&gt;5dk)</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#f97316", fontWeight: 700 }}>▼</span> Erken (&gt;10dk)</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>!</span>
            Mola Aşımı
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><XCircle size={11} style={{ color: "#f87171" }}/> Devamsız</span>
        </div>

        {/* Matris tablosu */}
        <div style={{ ...S.card, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              <RefreshCw size={18} style={{ display: "block", margin: "0 auto 8px", color: "#cbd5e1", animation: "spin 0.8s linear infinite" }} />
              Yükleniyor…
            </div>
          ) : personList.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              <Users size={28} style={{ display: "block", margin: "0 auto 8px", color: "#e2e8f0" }} />
              Personel bulunamadı
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: 800, width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{
                      position: "sticky", left: 0, zIndex: 10, background: "rgba(248,250,252,0.9)",
                      padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em",
                      borderRight: "1px solid #f1f5f9", width: 176,
                    }}>Personel</th>
                    {weekDays.map((d,i) => (
                      <th key={i} style={{
                        padding: "12px 8px", textAlign: "center", fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.06em", width: 104,
                        color: d.today ? "#4f46e5" : "#64748b",
                        background: d.today ? "rgba(99,102,241,0.05)" : "rgba(248,250,252,0.9)",
                      }}>
                        <p>{d.label}</p>
                        <p style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color: d.today ? "#818cf8" : "#94a3b8" }}>{d.date}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {personList.map(person => {
                    const days = attendance[person.id] || Array(7).fill({ planned: null });
                    const color = person._c || avatarColor(person.id);
                    return (
                      <tr
                        key={person.id}
                        style={{ borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(248,250,252,0.5)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{
                          position: "sticky", left: 0, zIndex: 10, background: "#ffffff",
                          padding: "10px 16px", borderRight: "1px solid #f1f5f9",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={person.ad_soyad} color={color} size={28}/>
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>{person.ad_soyad}</p>
                              <p style={{ fontSize: 9, color: "#94a3b8" }}>{person.ekip || "—"}</p>
                            </div>
                          </div>
                        </td>
                        {days.map((dayData, dayIdx) => {
                          const key = `${person.id}-${dayIdx}`;
                          return (
                            <td
                              key={dayIdx}
                              style={{
                                padding: 6,
                                background: weekDays[dayIdx].today ? "rgba(99,102,241,0.04)" : "transparent",
                              }}
                            >
                              <AttendanceCell
                                dayData={dayData}
                                isToday={weekDays[dayIdx].today}
                                isSelected={selected?.key === key}
                                onClick={() => {
                                  if (!dayData.planned) return;
                                  if (selected?.key === key) { setSelected(null); return; }
                                  setSelected({
                                    key,
                                    person: { ...person, _c: color },
                                    dayData,
                                    dayLabel: `${weekDays[dayIdx].label} ${weekDays[dayIdx].date}`,
                                  });
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detay paneli */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <DayDetailPanel sel={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}


/* ══════════════════════════════ ANA SAYFA ═══════════════════════════════════ */
const TABS = [
  { id:"matris",  label:"Ekip & Rol Matrisi",          icon: Users },
  { id:"vardiya", label:"Vardiya & Devamlılık Panosu",  icon: Clock },
];

export default function PersonnelPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const [tab, setTab] = useState("matris");

  return (
    <div style={{ minHeight: "100%", paddingBottom: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", margin: 0 }}>
            Personel Yönetim Merkezi
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
            Müşteri Hizmetleri · ekip, rol, vardiya ve devamlılık yönetimi
          </p>
        </div>
        {isAdmin && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", fontSize: 11, fontWeight: 700,
            background: "#fef2f2", color: "#dc2626", borderRadius: 20,
            boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.2)",
          }}>
            <Shield size={11} /> Admin Override Aktif
          </span>
        )}
      </div>

      {/* Sekme çubuğu */}
      <div style={{
        ...S.card,
        padding: 6, display: "flex", gap: 4, width: "fit-content",
      }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s", border: "none",
                background: active ? "#6366f1" : "transparent",
                color: active ? "#ffffff" : "#64748b",
                boxShadow: active ? "0 1px 3px rgba(99,102,241,0.25)" : "none",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#f8fafc"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "transparent"; } }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* İçerik */}
      {tab === "matris"  && <MatrisTab isAdmin={isAdmin} />}
      {tab === "vardiya" && <VardiyaTab />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  );
}
