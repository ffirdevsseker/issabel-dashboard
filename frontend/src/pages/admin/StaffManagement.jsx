/**
 * Personel Yönetim Merkezi – Müşteri Hizmetleri Departmanı
 * ─────────────────────────────────────────────────────────
 * Sekme 1 : Ekip & Rol Matrisi (filtreli data-grid + slide-over düzenle)
 * Sekme 2 : Vardiya & Devamlılık Panosu (haftalık kalender matris)
 *
 * Mock data ile çalışır; gerçek API bağlantısı için staffApi kullanılır.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Search, Edit2, X, ChevronLeft, ChevronRight,
  Users, Shield, UserCheck, AlertTriangle, Clock,
  CheckCircle2, XCircle, TrendingUp, Filter, TriangleAlert,
  Info, ChevronDown,
} from "lucide-react";

// ─── Utility ────────────────────────────────────────────────────────────────
const cn = (...args) => twMerge(clsx(args));

// ═══════════════════════════ Mock Data ══════════════════════════════════════

const TEAMS  = ["A Ekibi", "B Ekibi", "Şikayet Ekibi", "VIP Ekibi"];
const QUEUES = ["Genel Destek", "Şikayet Hattı", "VIP Destek", "Teknik Destek"];

export const MOCK_PERSONNEL = [
  { id:"1", name:"Ayşe Erdoğan",  initials:"AE", color:"#6366f1", ext:"101", role:"supervisor", team:"A Ekibi",        queue:"Genel Destek",  status:"active"   },
  { id:"2", name:"Emre Koç",      initials:"EK", color:"#10b981", ext:"102", role:"agent",      team:"A Ekibi",        queue:"Genel Destek",  status:"active"   },
  { id:"3", name:"Zeynep Arslan", initials:"ZA", color:"#f59e0b", ext:"103", role:"agent",      team:"Şikayet Ekibi",  queue:"Şikayet Hattı", status:"active"   },
  { id:"4", name:"Murat Şahin",  initials:"MŞ", color:"#3b82f6", ext:"104", role:"supervisor", team:"Şikayet Ekibi",  queue:"Şikayet Hattı", status:"active"   },
  { id:"5", name:"Fatma Yıldız", initials:"FY", color:"#ec4899", ext:"105", role:"agent",      team:"B Ekibi",        queue:"Genel Destek",  status:"active"   },
  { id:"6", name:"Can Demir",    initials:"CD", color:"#8b5cf6", ext:"106", role:"agent",      team:"B Ekibi",        queue:"VIP Destek",    status:"inactive" },
  { id:"7", name:"Selin Kaya",   initials:"SK", color:"#06b6d4", ext:"107", role:"agent",      team:"A Ekibi",        queue:"Teknik Destek", status:"active"   },
  { id:"8", name:"Burak Aydın",  initials:"BA", color:"#f97316", ext:"108", role:"agent",      team:"Şikayet Ekibi",  queue:"Şikayet Hattı", status:"active"   },
];

// Hafta: 04 May 2026 (Pzt) – 10 May 2026 (Paz)  |  Bugün = Cuma 08 May
// Her satır: { planned, actual_in, actual_out, late, early, bov, brk }
// planned=null → mesai yok (izin/hafta sonu) | actual_in=null → devamsız
const ATTENDANCE = {
  "1": [ // Ayşe Erdoğan – mola aşımı (Seed senaryosu)
    { planned:"09:00-18:00", actual_in:"09:15", actual_out:"18:00", late:15, early:0,  bov:true,  brk:75 },
    { planned:"09:00-18:00", actual_in:"08:58", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:02", actual_out:"17:45", late:0,  early:15, bov:false, brk:55 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:20", actual_out:"18:00", late:20, early:0,  bov:true,  brk:83 },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
  ],
  "2": [ // Emre Koç – geç giriş (Seed senaryosu)
    { planned:"08:00-17:00", actual_in:"08:22", actual_out:"17:00", late:22, early:0,  bov:false, brk:65 },
    { planned:"08:00-17:00", actual_in:"08:00", actual_out:"17:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"08:00-17:00", actual_in:"08:05", actual_out:"17:00", late:0,  early:0,  bov:true,  brk:78 },
    { planned:"08:00-17:00", actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
    { planned:"08:00-17:00", actual_in:"08:10", actual_out:"16:45", late:10, early:15, bov:false, brk:60 },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
  ],
  "3": [ // Zeynep Arslan
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:30", actual_out:"18:00", late:30, early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"10:00-16:00", actual_in:"10:00", actual_out:"16:00", late:0,  early:0,  bov:false, brk:30 },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
  ],
  "4": [ // Murat Şahin – mükemmel devam
    ...[0,1,2,3,4].map(() => ({ planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0, early:0, bov:false, brk:60 })),
    { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 },
    { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 },
  ],
  "5": [ // Fatma Yıldız
    { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"10:00-19:00", actual_in:"10:12", actual_out:"19:00", late:12, early:0,  bov:false, brk:60 },
    { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:true,  brk:90 },
    { planned:"10:00-19:00", actual_in:"10:00", actual_out:"18:30", late:0,  early:30, bov:false, brk:60 },
    { planned:"10:00-19:00", actual_in:"10:00", actual_out:"19:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
  ],
  "6": [ // Can Demir – çoğu günü devamsız (inactive)
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0, early:0, bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
    { planned:"09:00-18:00", actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
    { planned:"09:00-18:00", actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
    { planned:"09:00-18:00", actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0, early:0, bov:false, brk:0  },
  ],
  "7": [ // Selin Kaya
    { planned:"09:00-18:00", actual_in:"09:05", actual_out:"18:00", late:5,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:false, brk:60 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"18:00", late:0,  early:0,  bov:true,  brk:72 },
    { planned:"09:00-18:00", actual_in:"09:00", actual_out:"17:50", late:0,  early:10, bov:false, brk:60 },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
    { planned:null,           actual_in:null,    actual_out:null,    late:0,  early:0,  bov:false, brk:0  },
  ],
  "8": [ // Burak Aydın – temiz hafta
    ...[0,1,2,3,4].map(() => ({ planned:"08:00-17:00", actual_in:"08:00", actual_out:"17:00", late:0, early:0, bov:false, brk:60 })),
    { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 },
    { planned:null, actual_in:null, actual_out:null, late:0, early:0, bov:false, brk:0 },
  ],
};

// Bugün = Cuma 08 May 2026 → index 4 (0-tabanlı, Pzt=0)
const WEEK_DAYS = [
  { label:"Pzt", date:"04.05", todayIdx:false },
  { label:"Sal", date:"05.05", todayIdx:false },
  { label:"Çar", date:"06.05", todayIdx:false },
  { label:"Per", date:"07.05", todayIdx:false },
  { label:"Cum", date:"08.05", todayIdx:true  }, // BUGÜN
  { label:"Cmt", date:"09.05", todayIdx:false },
  { label:"Paz", date:"10.05", todayIdx:false },
];


// ═══════════════════════════ Küçük Bileşenler ════════════════════════════════

function Avatar({ initials, color, size = 36 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }) {
  return role === "supervisor" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
      <Shield size={10} /> Süpervizör
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
      <UserCheck size={10} /> Personel
    </span>
  );
}

function StatusDot({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 line-through decoration-gray-300">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" /> Silinmiş
    </span>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none w-full py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ═══════════════════════════ Edit Slide-Over ══════════════════════════════════

function EditSlideOver({ person, onClose, onSave }) {
  const [form, setForm] = useState({
    role:  person.role,
    team:  person.team,
    queue: person.queue,
    ext:   person.ext,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...person, ...form });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar initials={person.initials} color={person.color} size={40} />
            <div>
              <p className="font-semibold text-gray-900 text-sm">{person.name}</p>
              <p className="text-xs text-gray-400">Dahili: {person.ext}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Yetki & Atama</p>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {["supervisor","agent"].map(r => (
                <button
                  key={r}
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={cn(
                    "py-2.5 rounded-lg border text-sm font-medium transition-all",
                    form.role === r
                      ? r === "supervisor"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                        : "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {r === "supervisor" ? "Süpervizör" : "Personel"}
                </button>
              ))}
            </div>
          </div>

          {/* Ekip */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bağlı Ekip</label>
            <SelectField label="Ekip seçin" value={form.team} onChange={v => setForm(f => ({...f, team:v}))} options={TEAMS} />
          </div>

          {/* Kuyruk */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Varsayılan Kuyruk</label>
            <SelectField label="Kuyruk seçin" value={form.queue} onChange={v => setForm(f => ({...f, queue:v}))} options={QUEUES} />
          </div>

          {/* Dahili No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dahili Numara</label>
            <input
              type="text"
              value={form.ext}
              onChange={e => setForm(f => ({...f, ext:e.target.value}))}
              placeholder="Dahili no"
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>

          {/* Info note */}
          <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Rol değişikliği anlık olarak geçerli olur. Personel aktif çağrıdaysa sonraki oturumda uygulanır.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
            )}
          >
            {saved ? "✓ Kaydedildi" : "Kaydet"}
          </button>
        </div>
      </div>
    </>
  );
}


// ═══════════════════════════ SEKME 1 – Ekip & Rol Matrisi ════════════════════

function RoleMatrix() {
  const [search,   setSearch]   = useState("");
  const [roleF,    setRoleF]    = useState("");
  const [teamF,    setTeamF]    = useState("");
  const [statusF,  setStatusF]  = useState("");
  const [editPerson, setEditPerson] = useState(null);
  const [data, setData] = useState(MOCK_PERSONNEL);

  const filtered = data.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.ext.includes(q)) return false;
    if (roleF   && p.role   !== roleF)   return false;
    if (teamF   && p.team   !== teamF)   return false;
    if (statusF && p.status !== statusF) return false;
    return true;
  });

  const handleSave = (updated) => {
    setData(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  return (
    <div className="space-y-4">
      {/* Filtre çubuğu */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Arama */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim veya dahili no ara…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-gray-400"
            />
          </div>

          {/* Filtreler */}
          <div className="flex gap-2 flex-wrap">
            <SelectField
              label="Tüm Roller"
              value={roleF}
              onChange={setRoleF}
              options={["supervisor","agent"]}
            />
            <SelectField
              label="Tüm Ekipler"
              value={teamF}
              onChange={setTeamF}
              options={TEAMS}
            />
            <SelectField
              label="Tüm Durumlar"
              value={statusF}
              onChange={setStatusF}
              options={["active","inactive"]}
            />
            {(search || roleF || teamF || statusF) && (
              <button
                onClick={() => { setSearch(""); setRoleF(""); setTeamF(""); setStatusF(""); }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={12} /> Temizle
              </button>
            )}
          </div>

          <div className="ml-auto text-xs text-gray-400 font-medium">
            {filtered.length} / {data.length} personel
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Profil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dahili</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ekip</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Varsayılan Kuyruk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    Filtrelere uyan personel bulunamadı
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr
                  key={p.id}
                  className={cn(
                    "group hover:bg-indigo-50/30 transition-colors",
                    p.status === "inactive" && "opacity-60"
                  )}
                >
                  {/* Profil */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar initials={p.initials} color={p.color} size={36} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.team}</p>
                      </div>
                    </div>
                  </td>

                  {/* Dahili */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      {p.ext}
                    </span>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3.5">
                    <RoleBadge role={p.role} />
                  </td>

                  {/* Ekip */}
                  <td className="px-4 py-3.5 text-gray-600 text-sm">{p.team}</td>

                  {/* Kuyruk */}
                  <td className="px-4 py-3.5 text-gray-500 text-sm">{p.queue}</td>

                  {/* Durum */}
                  <td className="px-4 py-3.5">
                    <StatusDot status={p.status} />
                  </td>

                  {/* Aksiyon */}
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setEditPerson(p)}
                      className="p-1.5 rounded-lg text-gray-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Düzenle"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Toplam <strong className="text-gray-600">{data.filter(p=>p.status==="active").length}</strong> aktif,&nbsp;
            <strong className="text-gray-600">{data.filter(p=>p.status==="inactive").length}</strong> pasif personel
          </span>
          <span className="text-xs text-gray-400">Müşteri Hizmetleri Departmanı</span>
        </div>
      </div>

      {/* Slide-over */}
      {editPerson && (
        <EditSlideOver
          person={editPerson}
          onClose={() => setEditPerson(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}


// ═══════════════════════════ SEKME 2 – Vardiya Panosu ════════════════════════

function AttendanceCell({ day, dayData, isToday, personName, onClick, isSelected }) {
  // 1. Mesai yok (hafta sonu / izin)
  if (!dayData.planned) {
    return (
      <div className="h-[76px] rounded-lg border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center">
        <span className="text-gray-300 text-sm">—</span>
      </div>
    );
  }

  // 2. Devamsız
  if (!dayData.actual_in) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "h-[76px] rounded-lg border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-1 cursor-pointer",
          "hover:border-red-300 hover:bg-red-100/70 transition-all",
          isSelected && "ring-2 ring-red-400 ring-offset-1"
        )}
      >
        <XCircle size={20} className="text-red-400" />
        <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Devamsız</span>
      </div>
    );
  }

  // 3. Çalışma günü (göstergeler ile)
  const hasLate  = dayData.late  > 5;
  const hasEarly = dayData.early > 10;
  const hasBov   = dayData.bov;
  const hasAny   = hasLate || hasEarly || hasBov;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative h-[76px] rounded-lg border p-2 cursor-pointer transition-all select-none",
        hasAny
          ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300"
          : "border-gray-100 bg-white hover:bg-indigo-50/30 hover:border-indigo-200",
        isToday && !hasAny && "border-indigo-200 bg-indigo-50/20",
        isSelected && "ring-2 ring-indigo-400 ring-offset-1"
      )}
    >
      {/* Mola aşımı rozeti – sağ üst köşe */}
      {hasBov && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm z-10">
          <span className="text-white text-[10px] font-bold leading-none">!</span>
        </span>
      )}

      {/* Planlanan vardiya */}
      <p className="text-[11px] font-semibold text-gray-600 leading-tight">{dayData.planned}</p>

      {/* Göstergeler */}
      <div className="mt-1 space-y-0.5">
        {hasLate && (
          <div className="flex items-center gap-0.5">
            <span className="text-red-500 text-[10px] font-bold">▲</span>
            <span className="text-red-500 text-[10px] font-semibold">+{dayData.late}dk geç</span>
          </div>
        )}
        {hasEarly && (
          <div className="flex items-center gap-0.5">
            <span className="text-orange-400 text-[10px] font-bold">▼</span>
            <span className="text-orange-500 text-[10px] font-semibold">-{dayData.early}dk erken</span>
          </div>
        )}
        {hasBov && !hasLate && !hasEarly && (
          <div className="flex items-center gap-0.5">
            <Clock size={9} className="text-red-400" />
            <span className="text-red-400 text-[10px] font-semibold">{dayData.brk}dk mola</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DayDetailPanel({ selection, onClose }) {
  if (!selection) return null;
  const { person, dayData, dayLabel } = selection;

  const hasLate  = dayData.late  > 5;
  const hasEarly = dayData.early > 10;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 sticky top-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar initials={person.initials} color={person.color} size={34} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{person.name}</p>
            <p className="text-xs text-gray-400">{dayLabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors">
          <X size={15} />
        </button>
      </div>

      <hr className="border-gray-100" />

      {/* Giriş / Çıkış */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Giriş</p>
          <p className={cn("text-base font-bold", hasLate ? "text-red-600" : "text-gray-800")}>
            {dayData.actual_in || "—"}
          </p>
          {hasLate && <p className="text-[10px] text-red-500 font-medium">+{dayData.late}dk gecikme</p>}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Çıkış</p>
          <p className={cn("text-base font-bold", hasEarly ? "text-orange-500" : "text-gray-800")}>
            {dayData.actual_out || "—"}
          </p>
          {hasEarly && <p className="text-[10px] text-orange-500 font-medium">-{dayData.early}dk erken</p>}
        </div>
      </div>

      {/* Mola */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Toplam Mola</p>
        <div className="flex items-center justify-between">
          <p className={cn("text-base font-bold", dayData.bov ? "text-red-600" : "text-gray-800")}>
            {dayData.brk} dk
          </p>
          {dayData.bov
            ? <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Süre Aşıldı</span>
            : <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">Normal</span>
          }
        </div>
      </div>

      {/* Planlanan vardiya */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock size={12} className="text-gray-400" />
        Planlanan vardiya: <strong className="text-gray-700">{dayData.planned}</strong>
      </div>
    </div>
  );
}

function AttendanceBoard() {
  const [selected, setSelected] = useState(null); // { personId, dayIdx }

  // Haftalık ihlal sayısı
  const totalViolations = MOCK_PERSONNEL.reduce((sum, p) => {
    const days = ATTENDANCE[p.id] || [];
    return sum + days.filter(d => d.planned && (d.late > 5 || d.early > 10 || d.bov || !d.actual_in)).length;
  }, 0);

  const handleCellClick = (person, dayIdx, dayData) => {
    if (!dayData.planned) return; // mesai yok, tıklanamaz
    const key = `${person.id}-${dayIdx}`;
    if (selected?.key === key) { setSelected(null); return; }

    const dayInfo = WEEK_DAYS[dayIdx];
    setSelected({
      key,
      person,
      dayData,
      dayLabel: `${dayInfo.label} ${dayInfo.date}.2026`,
      dayIdx,
    });
  };

  return (
    <div className="flex gap-5">
      {/* Sol: Tablo */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Hafta başlığı + navigation */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">04 – 10 Mayıs 2026</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Bu hafta <strong className="text-red-500">{totalViolations}</strong> devam ihlali tespit edildi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-medium text-gray-500 px-1">Bu Hafta</span>
            <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-gray-400 px-1">
          <span className="flex items-center gap-1"><span className="text-red-500 font-bold">▲</span> Geç Giriş (&gt;5dk)</span>
          <span className="flex items-center gap-1"><span className="text-orange-400 font-bold">▼</span> Erken Çıkış (&gt;10dk)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">!</span> Mola Aşımı</span>
          <span className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /> Devamsız</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-gray-300 inline-block" /> Mesai Yok</span>
        </div>

        {/* Matrix */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 860 }}>
              {/* Gün başlıkları */}
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-gray-50/80 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100 w-[180px]">
                    Personel
                  </th>
                  {WEEK_DAYS.map((d, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider w-[108px]",
                        d.todayIdx ? "text-indigo-600 bg-indigo-50/40" : "text-gray-500 bg-gray-50/80"
                      )}
                    >
                      <p>{d.label}</p>
                      <p className={cn("text-[10px] font-medium mt-0.5", d.todayIdx ? "text-indigo-400" : "text-gray-400")}>
                        {d.date}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Satırlar */}
              <tbody className="divide-y divide-gray-50">
                {MOCK_PERSONNEL.map(person => {
                  const days = ATTENDANCE[person.id] || Array(7).fill({ planned:null });
                  return (
                    <tr key={person.id} className="hover:bg-gray-50/30 transition-colors">
                      {/* Personel isim sütunu (yapışık) */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={person.initials} color={person.color} size={30} />
                          <div>
                            <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">{person.name}</p>
                            <p className="text-[10px] text-gray-400">{person.team}</p>
                          </div>
                        </div>
                      </td>

                      {/* Gün hücreleri */}
                      {days.map((dayData, dayIdx) => {
                        const cellKey = `${person.id}-${dayIdx}`;
                        return (
                          <td key={dayIdx} className={cn("p-1.5", WEEK_DAYS[dayIdx].todayIdx && "bg-indigo-50/10")}>
                            <AttendanceCell
                              day={WEEK_DAYS[dayIdx]}
                              dayData={dayData}
                              isToday={WEEK_DAYS[dayIdx].todayIdx}
                              personName={person.name}
                              isSelected={selected?.key === cellKey}
                              onClick={() => handleCellClick(person, dayIdx, dayData)}
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

      {/* Sağ: Detay Paneli */}
      <div className="w-[240px] flex-shrink-0">
        {selected ? (
          <DayDetailPanel
            selection={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Clock size={24} className="opacity-30" />
            <p className="text-xs text-center">Detayları görmek için<br />bir hücreye tıklayın</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════ Ana Bileşen ══════════════════════════════════════

const TABS = [
  { id: "matrix",     label: "Ekip & Rol Matrisi",         icon: Users },
  { id: "attendance", label: "Vardiya & Devamlılık Panosu", icon: Clock },
];

export default function StaffManagement() {
  const [activeTab, setActiveTab] = useState("matrix");

  // Hızlı özet istatistikler
  const stats = {
    total:       MOCK_PERSONNEL.length,
    active:      MOCK_PERSONNEL.filter(p => p.status === "active").length,
    supervisors: MOCK_PERSONNEL.filter(p => p.role === "supervisor").length,
    violations:  MOCK_PERSONNEL.reduce((s, p) => {
      const days = ATTENDANCE[p.id] || [];
      return s + days.filter(d => d.planned && (!d.actual_in || d.late > 5 || d.early > 10 || d.bov)).length;
    }, 0),
  };

  const StatCard = ({ icon: Icon, label, value, color }) => {
    const colors = {
      indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  val: "text-indigo-700"  },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600", val: "text-emerald-700" },
      blue:    { bg: "bg-blue-50",    text: "text-blue-600",    val: "text-blue-700"    },
      red:     { bg: "bg-red-50",     text: "text-red-500",     val: "text-red-600"     },
    };
    const c = colors[color];
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", c.bg)}>
          <Icon size={18} className={c.text} />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className={cn("text-2xl font-bold mt-0.5", c.val)}>{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full space-y-5 pb-8">
      {/* Sayfa Başlığı */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Personel Yönetim Merkezi</h1>
          <p className="text-sm text-gray-400 mt-0.5">Müşteri Hizmetleri · Ekip, rol ve vardiya yönetimi</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full ring-1 ring-inset ring-indigo-700/10">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Canlı Veri
        </span>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Toplam Personel"  value={stats.total}       color="indigo"  />
        <StatCard icon={CheckCircle2}  label="Aktif Personel"   value={stats.active}      color="emerald" />
        <StatCard icon={Shield}        label="Süpervizör"        value={stats.supervisors} color="blue"    />
        <StatCard icon={AlertTriangle} label="Bu Hafta İhlal"   value={stats.violations}  color="red"     />
      </div>

      {/* Sekme Çubuğu */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* İçerik */}
      {activeTab === "matrix"     && <RoleMatrix />}
      {activeTab === "attendance" && <AttendanceBoard />}
    </div>
  );
}
