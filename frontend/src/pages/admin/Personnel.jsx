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
import { clsx }      from "clsx";
import { twMerge }   from "tailwind-merge";
import {
  Search, RefreshCw, Plus, Users, Headphones, Coffee, PowerOff,
  AlertTriangle, MoreVertical, ExternalLink, KeyRound, Lock, UserMinus,
  Edit2, X, ChevronDown, ChevronLeft, ChevronRight,
  Shield, UserCheck, Clock, XCircle, Info, WifiOff,
} from "lucide-react";
import { personnelApi, staffApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

/* ── Utility ──────────────────────────────────────────────────────────────── */
const cn = (...a) => twMerge(clsx(a));
const PER_PAGE = 25;
const TEAMS  = ["A Ekibi", "B Ekibi", "Şikayet Ekibi", "VIP Ekibi"];
const QUEUES = ["Genel Destek", "Şikayet Hattı", "VIP Destek", "Teknik Destek"];

/* ══════════════════════════════ Mock Veriler ═════════════════════════════════
   API yanıt vermediğinde fallback; gerçek ortamda personnelApi.getList sonucu
   aynı sütun isimlerini döner.
═══════════════════════════════════════════════════════════════════════════════ */
const MOCK_PERSONS = [
  { id:"1", ad_soyad:"Ayşe Erdoğan",  kullanici_adi:"ayse.erdogan",  dahili_no:"101", rol:"supervisor", ekip:"A Ekibi",       departman:"Müşteri Hizmetleri", anlik_durum:"mola",    mola_asimi_dk:15, bugun_cagri:23, xp:2450, seviye:4, unvan:"Uzman",   sip_durumu:"normal", _c:"#6366f1" },
  { id:"2", ad_soyad:"Emre Koç",      kullanici_adi:"emre.koc",      dahili_no:"102", rol:"agent",      ekip:"A Ekibi",       departman:"Müşteri Hizmetleri", anlik_durum:"aktif",   mola_asimi_dk:0,  bugun_cagri:31, xp:1820, seviye:3, unvan:"Kıdemli", sip_durumu:"normal", _c:"#10b981" },
  { id:"3", ad_soyad:"Zeynep Arslan", kullanici_adi:"zeynep.arslan", dahili_no:"103", rol:"agent",      ekip:"Şikayet Ekibi", departman:"Müşteri Hizmetleri", anlik_durum:"mesgul",  mola_asimi_dk:0,  bugun_cagri:18, xp:980,  seviye:2, unvan:null,      sip_durumu:"normal", _c:"#f59e0b" },
  { id:"4", ad_soyad:"Murat Şahin",  kullanici_adi:"murat.sahin",   dahili_no:"104", rol:"supervisor", ekip:"Şikayet Ekibi", departman:"Müşteri Hizmetleri", anlik_durum:"aktif",   mola_asimi_dk:0,  bugun_cagri:9,  xp:3100, seviye:5, unvan:"Lider",   sip_durumu:"normal", _c:"#3b82f6" },
  { id:"5", ad_soyad:"Fatma Yıldız", kullanici_adi:"fatma.yildiz",  dahili_no:"105", rol:"agent",      ekip:"B Ekibi",       departman:"Müşteri Hizmetleri", anlik_durum:"mola",    mola_asimi_dk:0,  bugun_cagri:24, xp:1450, seviye:3, unvan:"Kıdemli", sip_durumu:"normal", _c:"#ec4899" },
  { id:"6", ad_soyad:"Can Demir",    kullanici_adi:"can.demir",     dahili_no:"106", rol:"agent",      ekip:"B Ekibi",       departman:"Müşteri Hizmetleri", anlik_durum:"offline",  mola_asimi_dk:0,  bugun_cagri:0,  xp:540,  seviye:1, unvan:null,      sip_durumu:"koptu",  _c:"#8b5cf6" },
  { id:"7", ad_soyad:"Selin Kaya",   kullanici_adi:"selin.kaya",    dahili_no:"107", rol:"agent",      ekip:"A Ekibi",       departman:"Müşteri Hizmetleri", anlik_durum:"aktif",   mola_asimi_dk:0,  bugun_cagri:27, xp:2100, seviye:4, unvan:"Uzman",   sip_durumu:"normal", _c:"#06b6d4" },
  { id:"8", ad_soyad:"Burak Aydın",  kullanici_adi:"burak.aydin",   dahili_no:"108", rol:"agent",      ekip:"Şikayet Ekibi", departman:"Müşteri Hizmetleri", anlik_durum:"aktif",   mola_asimi_dk:0,  bugun_cagri:20, xp:1250, seviye:2, unvan:null,      sip_durumu:"normal", _c:"#f97316" },
];

/* Haftalık devam verileri — 04 May (Pzt) → 10 May 2026 (Paz), bugün = Cum 08 */
const ATTENDANCE = {
  "1": [ { planned:"09:00-18:00", actual_in:"09:15", actual_out:"18:00", late:15, early:0,  bov:true,  brk:75 }, { planned:"09:00-18:00", actual_in:"08:58", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:02", actual_out:"17:45", late:0,  early:15, bov:false, brk:55 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:20", actual_out:"18:00", late:20, early:0,  bov:true,  brk:83 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "2": [ { planned:"08:00-17:00", actual_in:"08:22", actual_out:"17:00", late:22, early:0,  bov:false, brk:65 }, { planned:"08:00-17:00", actual_in:"08:00", actual_out:"17:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"08:00-17:00", actual_in:"08:05", actual_out:"17:00", late:0,  early:0,  bov:true,  brk:78 }, { planned:"08:00-17:00", actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  }, { planned:"08:00-17:00", actual_in:"08:10", actual_out:"16:45", late:10, early:15, bov:false, brk:60 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "3": [ { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:30", actual_out:"18:00", late:30, early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"10:00-16:00", actual_in:"10:00", actual_out:"16:00", late:0,  early:0,  bov:false, brk:30 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "4": [ ...Array(5).fill(null).map(() => ({ planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0, early:0, bov:false, brk:60 })), { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "5": [ { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"10:00-19:00", actual_in:"10:12", actual_out:"19:00", late:12, early:0,  bov:false, brk:60 }, { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:true,  brk:90 }, { planned:"10:00-19:00", actual_in:"10:00", actual_out:"18:30", late:0,  early:30, bov:false, brk:60 }, { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:false, brk:60 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "6": [ { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0, early:0, bov:false, brk:60 }, ...Array(4).fill(null).map(() => ({ planned:"09:00-18:00", actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 })), { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "7": [ { planned:"09:00-18:00", actual_in:"09:05", actual_out:"18:00", late:5,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:true,  brk:72 }, { planned:"09:00-18:00", actual_in:"09:00", actual_out:"17:50", late:0,  early:10, bov:false, brk:60 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
  "8": [ ...Array(5).fill(null).map(() => ({ planned:"08:00-17:00", actual_in:"08:00", actual_out:"17:00", late:0, early:0, bov:false, brk:60 })), { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 }, { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 } ],
};

const WEEK_DAYS = [
  { label:"Pzt", date:"04.05", today:false }, { label:"Sal", date:"05.05", today:false },
  { label:"Çar", date:"06.05", today:false }, { label:"Per", date:"07.05", today:false },
  { label:"Cum", date:"08.05", today:true  }, { label:"Cmt", date:"09.05", today:false },
  { label:"Paz", date:"10.05", today:false },
];


/* ══════════════════════════════ Atom Bileşenler ═════════════════════════════ */

function Avatar({ name, color, size = 34 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, color, background: `${color}1a`, border: `1.5px solid ${color}30` }}
    >
      {initial}
    </div>
  );
}

function RoleBadge({ rol }) {
  return rol === "supervisor"
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/15"><Shield size={9}/> Süpervizör</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"><UserCheck size={9}/> Personel</span>;
}

function AnlikDurumBadge({ durum, mola_asimi_dk }) {
  if ((mola_asimi_dk || 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        +{mola_asimi_dk}dk Aşım
      </span>
    );
  }
  const MAP = {
    aktif:   { cls:"bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot:"bg-emerald-500", label:"Aktif"      },
    mesgul:  { cls:"bg-blue-50   text-blue-700    ring-blue-600/15",     dot:"bg-blue-500",    label:"Görüşmede"  },
    mola:    { cls:"bg-amber-50  text-amber-700   ring-amber-600/15",    dot:"bg-amber-500",   label:"Molada"     },
    offline: { cls:"bg-gray-50   text-gray-500    ring-gray-500/15",     dot:"bg-gray-400",    label:"Offline"    },
  };
  const m = MAP[durum] || MAP.offline;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function XpBar({ xp = 0, seviye = 1 }) {
  const pct = Math.min(100, Math.round((xp % 500) / 500 * 100));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-extrabold text-violet-600 bg-violet-50 border border-violet-200/60 rounded px-1.5 py-0.5 whitespace-nowrap leading-none">
        Lv {seviye}
      </span>
      <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden min-w-[28px]">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width:`${pct}%` }} />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none w-full py-2 pl-3 pr-7 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 cursor-pointer">
        <option value="">{label}</option>
        {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}


/* ══════════════════════════ Edit Slide-Over ══════════════════════════════════ */
function EditSlideOver({ person, onClose, onSave }) {
  const [form, setForm] = useState({ rol: person.rol, ekip: person.ekip, dahili_no: person.dahili_no, queue: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await staffApi.updateRole(person.id, {
        rol_id:    form.rol    !== person.rol    ? form.rol    : undefined,
        ekip_id:   form.ekip   !== person.ekip   ? form.ekip   : undefined,
        dahili_no: form.dahili_no !== person.dahili_no ? form.dahili_no : undefined,
      });
    } catch { /* mock — API yokken sessiz geç */ }
    setDone(true);
    setTimeout(() => { onSave({ ...person, ...form }); onClose(); }, 800);
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar name={person.ad_soyad} color={person._c || "#6366f1"} size={38} />
            <div>
              <p className="text-sm font-bold text-gray-900">{person.ad_soyad}</p>
              <p className="text-xs text-gray-400">@{person.kullanici_adi} · {person.dahili_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yetki & Atama</p>

          {/* Rol toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {["supervisor","agent"].map(r => (
                <button key={r} onClick={() => setForm(f => ({...f, rol:r}))}
                  className={cn("py-2.5 rounded-lg border text-sm font-semibold transition-all",
                    form.rol === r
                      ? r === "supervisor"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400"
                        : "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                  {r === "supervisor" ? "Süpervizör" : "Personel"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ekip</label>
            <SelectField label="Ekip seçin" value={form.ekip} onChange={v => setForm(f=>({...f,ekip:v}))} options={TEAMS} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Varsayılan Kuyruk</label>
            <SelectField label="Kuyruk seçin" value={form.queue} onChange={v => setForm(f=>({...f,queue:v}))} options={QUEUES} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dahili Numara</label>
            <input value={form.dahili_no || ""} onChange={e => setForm(f=>({...f,dahili_no:e.target.value}))}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-mono" />
          </div>

          <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <Info size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">Rol değişikliği sonraki oturumda geçerli olur. Aktif çağrı etkilenmez.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            İptal
          </button>
          <button onClick={handleSave} disabled={saving}
            className={cn("flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
              done ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95",
              saving && "opacity-70 cursor-not-allowed"
            )}>
            {done ? "✓ Kaydedildi" : saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </>
  );
}


/* ══════════════════════════ Üç Nokta Aksiyon Menüsü ═════════════════════════ */
function ThreeDotsMenu({ person, isAdmin, onEdit, onDetail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden w-48">
          <div className="px-3 py-2 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50">
            {person.ad_soyad}
          </div>
          {[
            { label:"Detaya Git",    Icon:ExternalLink, color:"text-blue-600",   fn: onDetail },
            { label:"Düzenle",       Icon:Edit2,        color:"text-gray-700",   fn: onEdit   },
            { label:"Şifre Sıfırla", Icon:KeyRound,     color:"text-amber-600",  fn: () => alert("TODO: Şifre sıfırlama") },
            { label:"Hesabı Kilitle",Icon:Lock,         color:"text-gray-500",   fn: () => alert("TODO: Hesap kilitleme") },
          ].map(({ label, Icon, color, fn }) => (
            <button key={label} onClick={() => { fn(); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors ${color}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
          {isAdmin && (
            <>
              <div className="h-px bg-gray-50 mx-2" />
              <button onClick={() => {
                if (window.confirm(`${person.ad_soyad} pasif edilecek. Onaylıyor musunuz?`)) {
                  alert("TODO: soft delete API");
                }
                setOpen(false);
              }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
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
  const [items,    setItems]    = useState(MOCK_PERSONS);
  const [total,    setTotal]    = useState(MOCK_PERSONS.length);
  const [stats,    setStats]    = useState(null);
  const [filters,  setFilters]  = useState({ ekipler:[], roller:[] });
  const [loading,  setLoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [page,     setPage]     = useState(1);
  const [params,   setParams]   = useState({ q:"", ekip_id:"", rol:"", durum:"" });
  const pollRef = useRef(null);

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
      /* mock fallback: client-side filtrele */
      const q = params.q.toLowerCase();
      const filtered = MOCK_PERSONS.filter(p => {
        if (q && !p.ad_soyad.toLowerCase().includes(q) && !p.dahili_no?.includes(q)) return false;
        if (params.ekip_id && p.ekip !== params.ekip_id) return false;
        if (params.rol     && p.rol  !== params.rol)     return false;
        if (params.durum   && p.anlik_durum !== params.durum) return false;
        return true;
      });
      setItems(filtered.slice((page-1)*PER_PAGE, page*PER_PAGE));
      setTotal(filtered.length);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [page, params]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const overrun    = stats?.mola_asimi || MOCK_PERSONS.filter(p => p.mola_asimi_dk > 0).length;

  /* Mock stats */
  const liveStats = stats ?? {
    toplam: MOCK_PERSONS.length,
    aktif:  MOCK_PERSONS.filter(p => p.anlik_durum === "aktif").length,
    mesgul: MOCK_PERSONS.filter(p => p.anlik_durum === "mesgul").length,
    mola:   MOCK_PERSONS.filter(p => p.anlik_durum === "mola").length,
    offline:MOCK_PERSONS.filter(p => p.anlik_durum === "offline").length,
  };

  const STAT_CARDS = [
    { label:"Tümü",       key:"",       val: liveStats.toplam,  color:"slate"   },
    { label:"Aktif",      key:"aktif",  val: liveStats.aktif,   color:"emerald" },
    { label:"Görüşmede",  key:"mesgul", val: liveStats.mesgul,  color:"blue"    },
    { label:"Molada",     key:"mola",   val: liveStats.mola,    color:"amber"   },
    { label:"Offline",    key:"offline",val: liveStats.offline, color:"slate"   },
  ];
  const colorMap = {
    slate:{ icon:"text-slate-500",  bg:"bg-slate-50",   ring:"ring-slate-500/10", val:"text-slate-800", activeBg:"bg-slate-100"   },
    emerald:{icon:"text-emerald-600",bg:"bg-emerald-50",ring:"ring-emerald-500/15",val:"text-emerald-700",activeBg:"bg-emerald-100" },
    blue:  { icon:"text-blue-600",   bg:"bg-blue-50",   ring:"ring-blue-500/15",  val:"text-blue-700",  activeBg:"bg-blue-100"    },
    amber: { icon:"text-amber-600",  bg:"bg-amber-50",  ring:"ring-amber-500/15", val:"text-amber-700", activeBg:"bg-amber-100"   },
  };

  return (
    <div className="space-y-4">
      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(c => {
          const s = colorMap[c.color] || colorMap.slate;
          const active = params.durum === c.key;
          return (
            <button key={c.key} onClick={() => { setParams(p=>({...p,durum:c.key})); setPage(1); }}
              className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                active && "ring-2 ring-indigo-400 border-indigo-200")}>
              <p className={cn("text-2xl font-extrabold", s.val)}>{c.val ?? "—"}</p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Mola aşımı alarm banner */}
      {overrun > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 animate-pulse" />
          <p className="text-sm font-semibold text-red-700">
            <strong>{overrun} personel</strong> mola süresini aşıyor — kırmızı satırları inceleyin.
          </p>
        </div>
      )}

      {/* ── Filtre + Tablo Kartı ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filtre çubuğu */}
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={params.q} onChange={e => { setParams(p=>({...p,q:e.target.value})); setPage(1); }}
              placeholder="Ad, kullanıcı adı veya dahili..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-gray-400" />
          </div>
          <SelectField label="Ekip" value={params.ekip_id}
            onChange={v => { setParams(p=>({...p,ekip_id:v})); setPage(1); }}
            options={(filters.ekipler || TEAMS).map(e => typeof e==="string" ? {v:e,l:e} : {v:e.id,l:e.ad})} />
          <SelectField label="Rol" value={params.rol}
            onChange={v => { setParams(p=>({...p,rol:v})); setPage(1); }}
            options={(filters.roller||[{ad:"supervisor"},{ad:"agent"}]).map(r => ({v:r.ad||r,l:r.ad||r}))} />
          {(params.q||params.ekip_id||params.rol||params.durum) && (
            <button onClick={() => { setParams({q:"",ekip_id:"",rol:"",durum:""}); setPage(1); }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={11} /> Temizle
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">{loading ? "…" : `${total} personel`}</span>
            <button onClick={() => fetchList(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
              Yenile
            </button>
            {isAdmin && (
              <button onClick={() => alert("TODO: Yeni personel modalı")}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                <Plus size={12} /> Yeni Personel
              </button>
            )}
          </div>
        </div>

        {/* Tablo başlığı */}
        <div className="hidden md:grid px-5 py-2.5 bg-gray-50/70 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
          style={{ gridTemplateColumns:"minmax(200px,2.5fr) 90px 120px 90px 120px 100px 60px 40px" }}>
          <span>Personel</span><span>Dahili</span><span>Ekip</span><span>Rol</span>
          <span>Durum</span><span>XP / Seviye</span><span className="text-right">Çağrı</span><span />
        </div>

        {/* Satırlar */}
        <div className="divide-y divide-gray-50">
          {loading ? (
            Array.from({length:5}).map((_,i) => (
              <div key={i} className="h-[58px] mx-4 my-2 rounded-lg bg-gray-100/60 animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">Filtrelere uyan personel bulunamadı</p>
            </div>
          ) : items.map(p => {
            const overrunRow = (p.mola_asimi_dk || 0) > 0;
            return (
              <div key={p.id}
                className={cn(
                  "group hidden md:grid items-center px-5 py-3 cursor-pointer transition-colors",
                  "hover:bg-indigo-50/20",
                  overrunRow ? "border-l-2 border-red-400 bg-red-50/20" : "border-l-2 border-transparent"
                )}
                style={{ gridTemplateColumns:"minmax(200px,2.5fr) 90px 120px 90px 120px 100px 60px 40px" }}
                onClick={() => navigate(`/admin/personnel/${p.id}`)}
              >
                {/* Personel */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={p.ad_soyad} color={p._c || "#6366f1"} size={34} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-gray-900 truncate">{p.ad_soyad}</span>
                      {p.unvan && (
                        <span className="text-[9px] font-extrabold text-violet-600 bg-violet-50 border border-violet-200/50 rounded px-1.5 whitespace-nowrap">
                          {p.unvan.toUpperCase()}
                        </span>
                      )}
                      {overrunRow && (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 whitespace-nowrap animate-pulse">
                          +{p.mola_asimi_dk}DK AŞIM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">@{p.kullanici_adi || "—"}</p>
                  </div>
                </div>

                {/* Dahili */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {p.dahili_no || "—"}
                  </span>
                  {p.sip_durumu === "koptu" && <WifiOff size={10} className="text-red-400" />}
                </div>

                {/* Ekip */}
                <span className="text-xs text-gray-600 font-medium truncate">{p.ekip || "—"}</span>

                {/* Rol */}
                <RoleBadge rol={p.rol} />

                {/* Anlık Durum */}
                <AnlikDurumBadge durum={p.anlik_durum} mola_asimi_dk={p.mola_asimi_dk} />

                {/* XP */}
                <div>
                  <p className="text-[11px] font-bold text-violet-600 mb-1">{(p.xp||0).toLocaleString("tr-TR")} XP</p>
                  <XpBar xp={p.xp} seviye={p.seviye} />
                </div>

                {/* Bugün Çağrı */}
                <p className="text-sm font-bold text-gray-800 text-right">{p.bugun_cagri ?? 0}</p>

                {/* Aksiyonlar */}
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <ThreeDotsMenu
                    person={p} isAdmin={isAdmin}
                    onDetail={() => navigate(`/admin/personnel/${p.id}`)}
                    onEdit={() => setEditPerson(p)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              <strong className="text-gray-600">{total}</strong> personelden&nbsp;
              {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,total)} gösteriliyor
            </span>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={() => setPage(p=>Math.max(1,p-1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg = page<=3 ? i+1 : page-2+i;
                if (pg<1||pg>totalPages) return null;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-colors border",
                      pg===page ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-100")}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page===totalPages} onClick={() => setPage(p=>Math.min(totalPages,p+1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Slide-Over */}
      {editPerson && (
        <EditSlideOver person={editPerson} onClose={() => setEditPerson(null)}
          onSave={updated => setItems(prev => prev.map(p => p.id===updated.id ? {...p,...updated} : p))} />
      )}
    </div>
  );
}


/* ══════════════════════════ SEKME 2 – Vardiya Panosu ════════════════════════ */
function AttendanceCell({ dayData, isToday, isSelected, onClick }) {
  if (!dayData.planned) {
    return (
      <div className="h-[72px] rounded-lg border border-dashed border-gray-200 bg-gray-50/60 flex items-center justify-center">
        <span className="text-gray-300 text-xs">—</span>
      </div>
    );
  }
  if (!dayData.actual_in) {
    return (
      <div onClick={onClick} className={cn("h-[72px] rounded-lg border border-red-100 bg-red-50 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-red-200 transition-all", isSelected && "ring-2 ring-red-400 ring-offset-1")}>
        <XCircle size={18} className="text-red-300" />
        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Devamsız</span>
      </div>
    );
  }
  const hasAny = dayData.late > 5 || dayData.early > 10 || dayData.bov;
  return (
    <div onClick={onClick}
      className={cn(
        "relative h-[72px] rounded-lg border p-2 cursor-pointer select-none transition-all",
        hasAny ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50" : "border-gray-100 bg-white hover:bg-indigo-50/20",
        isToday && !hasAny && "border-indigo-200 bg-indigo-50/20",
        isSelected && "ring-2 ring-indigo-400 ring-offset-1"
      )}>
      {dayData.bov && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shadow z-10">
          <span className="text-white text-[9px] font-bold">!</span>
        </span>
      )}
      <p className="text-[11px] font-semibold text-gray-600 leading-tight">{dayData.planned}</p>
      <div className="mt-1 space-y-0.5">
        {dayData.late > 5  && <div className="flex items-center gap-0.5"><span className="text-red-500 text-[10px] font-bold">▲</span><span className="text-red-500 text-[10px] font-semibold">+{dayData.late}dk</span></div>}
        {dayData.early > 10 && <div className="flex items-center gap-0.5"><span className="text-orange-400 text-[10px] font-bold">▼</span><span className="text-orange-500 text-[10px] font-semibold">-{dayData.early}dk</span></div>}
        {dayData.bov && !dayData.late && !dayData.early && <div className="flex items-center gap-0.5"><Clock size={9} className="text-red-400"/><span className="text-red-400 text-[10px] font-semibold">{dayData.brk}dk mola</span></div>}
      </div>
    </div>
  );
}

function DayDetailPanel({ sel, onClose }) {
  if (!sel) return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 h-44 flex flex-col items-center justify-center gap-2 text-gray-400">
      <Clock size={22} className="opacity-30" />
      <p className="text-xs text-center">Hücreye tıklayın</p>
    </div>
  );
  const { person, dayData, dayLabel } = sel;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={person.ad_soyad} color={person._c || "#6366f1"} size={32} />
          <div>
            <p className="text-sm font-bold text-gray-900">{person.ad_soyad}</p>
            <p className="text-[10px] text-gray-400">{dayLabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-gray-500"><X size={13}/></button>
      </div>
      <hr className="border-gray-100" />
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Giriş</p>
          <p className={cn("text-base font-extrabold", dayData.late>5 ? "text-red-600" : "text-gray-800")}>{dayData.actual_in||"—"}</p>
          {dayData.late>5 && <p className="text-[10px] text-red-500 font-semibold">+{dayData.late}dk gecikme</p>}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Çıkış</p>
          <p className={cn("text-base font-extrabold", dayData.early>10 ? "text-orange-500" : "text-gray-800")}>{dayData.actual_out||"—"}</p>
          {dayData.early>10 && <p className="text-[10px] text-orange-500 font-semibold">-{dayData.early}dk erken</p>}
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mola</p>
          <p className={cn("text-base font-extrabold", dayData.bov ? "text-red-600" : "text-gray-800")}>{dayData.brk}dk</p></div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", dayData.bov ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
          {dayData.bov ? "Süre Aşıldı" : "Normal"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <Clock size={10} className="text-gray-300"/> Planlanan: <strong className="text-gray-600">{dayData.planned}</strong>
      </div>
    </div>
  );
}

function VardiyaTab() {
  const [selected, setSelected] = useState(null);
  const totalViol = MOCK_PERSONS.reduce((s,p) => {
    const days = ATTENDANCE[p.id] || [];
    return s + days.filter(d => d.planned && (!d.actual_in || d.late>5 || d.early>10 || d.bov)).length;
  }, 0);

  return (
    <div className="flex gap-5">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Hafta başlığı */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">04 – 10 Mayıs 2026</p>
            <p className="text-xs text-gray-400 mt-0.5">Bu hafta <strong className="text-red-500">{totalViol}</strong> devam ihlali</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"><ChevronLeft size={14}/></button>
            <span className="text-xs font-semibold text-gray-500 px-1">Bu Hafta</span>
            <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"><ChevronRight size={14}/></button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-gray-400 px-1 flex-wrap">
          <span className="flex items-center gap-1"><span className="text-red-500 font-bold">▲</span> Geç (&gt;5dk)</span>
          <span className="flex items-center gap-1"><span className="text-orange-400 font-bold">▼</span> Erken (&gt;10dk)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">!</span> Mola Aşımı</span>
          <span className="flex items-center gap-1"><XCircle size={11} className="text-red-400"/> Devamsız</span>
        </div>

        {/* Matris tablosu */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth:800, width:"100%" }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-gray-50/80 px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100 w-[176px]">Personel</th>
                  {WEEK_DAYS.map((d,i) => (
                    <th key={i} className={cn("px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider w-[104px]", d.today ? "text-indigo-600 bg-indigo-50/40" : "text-gray-500 bg-gray-50/80")}>
                      <p>{d.label}</p>
                      <p className={cn("text-[9px] font-medium mt-0.5", d.today ? "text-indigo-400":"text-gray-400")}>{d.date}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_PERSONS.map(person => {
                  const days = ATTENDANCE[person.id] || Array(7).fill({planned:null});
                  return (
                    <tr key={person.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <Avatar name={person.ad_soyad} color={person._c||"#6366f1"} size={28}/>
                          <div>
                            <p className="text-[11px] font-bold text-gray-800 whitespace-nowrap">{person.ad_soyad}</p>
                            <p className="text-[9px] text-gray-400">{person.ekip}</p>
                          </div>
                        </div>
                      </td>
                      {days.map((dayData, dayIdx) => {
                        const key = `${person.id}-${dayIdx}`;
                        return (
                          <td key={dayIdx} className={cn("p-1.5", WEEK_DAYS[dayIdx].today && "bg-indigo-50/10")}>
                            <AttendanceCell
                              dayData={dayData}
                              isToday={WEEK_DAYS[dayIdx].today}
                              isSelected={selected?.key === key}
                              onClick={() => {
                                if (!dayData.planned) return;
                                if (selected?.key === key) { setSelected(null); return; }
                                setSelected({ key, person, dayData, dayLabel:`${WEEK_DAYS[dayIdx].label} ${WEEK_DAYS[dayIdx].date}.2026` });
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
        </div>
      </div>

      {/* Detay paneli */}
      <div className="w-[220px] flex-shrink-0">
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
    <div className="min-h-full pb-8 space-y-5">
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Personel Yönetim Merkezi</h1>
          <p className="text-sm text-gray-400 mt-0.5">Müşteri Hizmetleri · ekip, rol, vardiya ve devamlılık yönetimi</p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-full ring-1 ring-inset ring-red-500/20">
            <Shield size={11} /> Admin Override Aktif
          </span>
        )}
      </div>

      {/* Sekme çubuğu */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50")}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* İçerik */}
      {tab === "matris"  && <MatrisTab isAdmin={isAdmin} />}
      {tab === "vardiya" && <VardiyaTab />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
