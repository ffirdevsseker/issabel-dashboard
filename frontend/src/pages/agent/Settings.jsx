import { useRef, useState } from "react";
import {
  User, Bell, Volume2, Palette, Shield,
  Camera, Check, Eye, EyeOff, Save, ChevronRight,
  Phone, Mail, Hash, Building2, Clock,
  PhoneIncoming, PhoneOff, MessageSquare,
  Moon, Sun, Monitor, Languages,
  Lock, KeyRound, LogOut, Smartphone,
  ToggleLeft, ToggleRight, Sliders, Info,
} from "lucide-react";

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const PAGE_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .st-fade { animation: fadeIn 200ms ease-out both; }
  .premium-card { box-shadow: 0 8px 30px rgba(0,0,0,0.04); border: 1px solid rgba(226,232,240,0.8); }
  .st-scroll::-webkit-scrollbar { width: 4px; }
  .st-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .st-scroll::-webkit-scrollbar-track { background: transparent; }
  .st-toggle { transition: background 200ms, transform 200ms; }
`;

/* ─────────────────────────────── NAV SECTIONS ───────────────────────── */
const SECTIONS = [
  { id: "profil",      label: "Profil & Hesap",  icon: User },
  { id: "bildirimler", label: "Bildirimler",       icon: Bell },
  { id: "ses",         label: "Ses & Çağrı",      icon: Volume2 },
  { id: "gorunum",     label: "Görünüm",           icon: Palette },
  { id: "guvenlik",    label: "Güvenlik",          icon: Shield },
];

/* ─────────────────────────────── HELPERS ────────────────────────────── */
function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-5 w-9 rounded-full st-toggle shrink-0 ${enabled ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-700">{label}</p>
        {desc && <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="premium-card rounded-2xl bg-white overflow-hidden">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-3.5 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
        <span className="text-[13px] font-bold text-white tracking-wide">{title}</span>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-[12px] text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, readOnly }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full h-9 rounded-xl border px-3 text-[12px] text-slate-700 font-medium focus:outline-none transition-all
          ${readOnly
            ? "border-slate-100 bg-slate-50 text-slate-400 cursor-default"
            : "border-slate-200 bg-slate-50/60 focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"}`}
      />
    </div>
  );
}

function VolumeSlider({ label, value, onChange, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-700 mb-1.5">{label}</p>
        <input
          type="range" min={0} max={100} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 accent-emerald-500 cursor-pointer"
        />
      </div>
      <span className="text-[12px] font-mono font-bold text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

/* ─────────────────────────────── SECTIONS ───────────────────────────── */

function ProfilSection() {
  const [name, setName]       = useState("Ahmet Yılmaz");
  const [email, setEmail]     = useState("ahmet.yilmaz@sporthink.com.tr");
  const [phone, setPhone]     = useState("0 232 442 07 07");
  const [saved, setSaved]     = useState(false);
  const avatarRef             = useRef(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar */}
      <SectionCard title="Profil Fotoğrafı" icon={Camera}>
        <div className="py-5 flex items-center gap-5">
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-[0_4px_14px_rgba(16,185,129,0.3)] shrink-0">
            <span className="text-white text-2xl font-bold">AY</span>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <Camera className="h-3.5 w-3.5 text-slate-600" strokeWidth={2} />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-700">Ahmet Yılmaz</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Müşteri Hizmetleri Uzmanı</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Dahili: 204</p>
            <button
              onClick={() => avatarRef.current?.click()}
              className="mt-2 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Fotoğraf değiştir →
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Kişisel bilgiler */}
      <SectionCard title="Kişisel Bilgiler" icon={User}>
        <div className="py-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <InputField label="Ad Soyad" value={name} onChange={setName} placeholder="Adınız" />
            <InputField label="Dahili No" value="204" readOnly />
          </div>
          <div className="flex gap-3">
            <InputField label="E-posta" value={email} onChange={setEmail} type="email" />
            <InputField label="Telefon" value={phone} onChange={setPhone} />
          </div>
          <div className="flex gap-3">
            <InputField label="Departman" value="Müşteri Hizmetleri" readOnly />
            <InputField label="Pozisyon" value="Uzman" readOnly />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              className={`h-9 px-5 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all
                ${saved
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-gradient-to-b from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 shadow-md"}`}
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Kaydedildi</> : <><Save className="h-3.5 w-3.5" /> Kaydet</>}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function BildirimlerSection() {
  const [notifs, setNotifs] = useState({
    incomingCall:  true,
    missedCall:    true,
    breakReminder: true,
    shiftChange:   true,
    ticketReply:   true,
    systemAlert:   false,
    teamMessage:   true,
    kbUpdate:      false,
    dailyReport:   true,
    performanceTip:false,
  });

  const set = (key) => (val) => setNotifs((p) => ({ ...p, [key]: val }));

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Çağrı Bildirimleri" icon={Phone}>
        <SettingRow label="Gelen Çağrı" desc="Yeni çağrı geldiğinde bildirim al">
          <Toggle enabled={notifs.incomingCall} onChange={set("incomingCall")} />
        </SettingRow>
        <SettingRow label="Cevapsız Çağrı" desc="Cevapsız bırakılan çağrılar için uyarı">
          <Toggle enabled={notifs.missedCall} onChange={set("missedCall")} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Ekip & Vardiya" icon={Bell}>
        <SettingRow label="Mola Hatırlatıcı" desc="Planlanmış moladan 5 dk önce uyar">
          <Toggle enabled={notifs.breakReminder} onChange={set("breakReminder")} />
        </SettingRow>
        <SettingRow label="Vardiya Değişikliği" desc="Vardiya güncellemelerini anlık al">
          <Toggle enabled={notifs.shiftChange} onChange={set("shiftChange")} />
        </SettingRow>
        <SettingRow label="Ekip Mesajı" desc="Ekip içi bildirimler">
          <Toggle enabled={notifs.teamMessage} onChange={set("teamMessage")} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Sistem & Raporlar" icon={MessageSquare}>
        <SettingRow label="Sorun Bildirimi Yanıtı" desc="BT tarafından yanıt geldiğinde">
          <Toggle enabled={notifs.ticketReply} onChange={set("ticketReply")} />
        </SettingRow>
        <SettingRow label="Sistem Uyarıları" desc="Altyapı kesintileri ve bakım">
          <Toggle enabled={notifs.systemAlert} onChange={set("systemAlert")} />
        </SettingRow>
        <SettingRow label="Bilgi Bankası Güncellemeleri" desc="Yeni makale ekleneninde haber ver">
          <Toggle enabled={notifs.kbUpdate} onChange={set("kbUpdate")} />
        </SettingRow>
        <SettingRow label="Günlük Performans Raporu" desc="Her sabah özet rapor gönder">
          <Toggle enabled={notifs.dailyReport} onChange={set("dailyReport")} />
        </SettingRow>
        <SettingRow label="Performans İpuçları" desc="Haftalık gelişim önerileri">
          <Toggle enabled={notifs.performanceTip} onChange={set("performanceTip")} />
        </SettingRow>
      </SectionCard>
    </div>
  );
}

function SesSection() {
  const [ringVol,   setRingVol]   = useState(80);
  const [speakVol,  setSpeakVol]  = useState(75);
  const [micVol,    setMicVol]    = useState(70);
  const [notifVol,  setNotifVol]  = useState(50);
  const [ringtone,  setRingtone]  = useState("classic");
  const [inputDev,  setInputDev]  = useState("default");
  const [outputDev, setOutputDev] = useState("default");
  const [autoAnswer,setAutoAnswer]= useState(false);
  const [autoSec,   setAutoSec]   = useState("5");
  const [noiseSuppr,setNoiseSuppr]= useState(true);
  const [echoCancl, setEchoCancl] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Ses Seviyesi" icon={Volume2}>
        <VolumeSlider label="Zil Sesi"         value={ringVol}  onChange={setRingVol}  icon={PhoneIncoming} />
        <VolumeSlider label="Hoparlör"          value={speakVol} onChange={setSpeakVol} icon={Volume2}       />
        <VolumeSlider label="Mikrofon"          value={micVol}   onChange={setMicVol}   icon={Sliders}       />
        <VolumeSlider label="Bildirim Sesi"     value={notifVol} onChange={setNotifVol} icon={Bell}          />
      </SectionCard>

      <SectionCard title="Cihaz Seçimi" icon={Smartphone}>
        <div className="py-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <SelectField
              label="Mikrofon Girişi"
              value={inputDev} onChange={setInputDev}
              options={[
                { value: "default", label: "Varsayılan Mikrofon" },
                { value: "headset", label: "Kulaklık Mikrofonu" },
                { value: "usb",     label: "USB Mikrofon"        },
              ]}
            />
            <SelectField
              label="Ses Çıkışı"
              value={outputDev} onChange={setOutputDev}
              options={[
                { value: "default", label: "Varsayılan Hoparlör" },
                { value: "headset", label: "Kulaklık"            },
                { value: "usb",     label: "USB Kulaklık"        },
              ]}
            />
          </div>
          <SelectField
            label="Zil Melodisi"
            value={ringtone} onChange={setRingtone}
            options={[
              { value: "classic", label: "Klasik"  },
              { value: "pulse",   label: "Pulse"   },
              { value: "digital", label: "Digital" },
              { value: "soft",    label: "Soft"    },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Çağrı Seçenekleri" icon={Phone}>
        <SettingRow label="Otomatik Cevaplama" desc="Belirli süre sonra çağrıyı otomatik cevapla">
          <Toggle enabled={autoAnswer} onChange={setAutoAnswer} />
        </SettingRow>
        {autoAnswer && (
          <SettingRow label="Cevaplama Süresi" desc="Otomatik cevaplama için bekleme süresi">
            <SelectField
              label=""
              value={autoSec} onChange={setAutoSec}
              options={[
                { value: "3",  label: "3 saniye" },
                { value: "5",  label: "5 saniye" },
                { value: "10", label: "10 saniye"},
              ]}
            />
          </SettingRow>
        )}
        <SettingRow label="Gürültü Bastırma" desc="Arka plan seslerini filtrele">
          <Toggle enabled={noiseSuppr} onChange={setNoiseSuppr} />
        </SettingRow>
        <SettingRow label="Yankı İptali" desc="Mikrofon yansımasını önle">
          <Toggle enabled={echoCancl} onChange={setEchoCancl} />
        </SettingRow>
      </SectionCard>
    </div>
  );
}

function GorununSection() {
  const [theme,     setTheme]     = useState("system");
  const [lang,      setLang]      = useState("tr");
  const [density,   setDensity]   = useState("normal");
  const [fontSize,  setFontSize]  = useState("medium");
  const [animations,setAnimations]= useState(true);
  const [sidebarPin,setSidebarPin]= useState(false);
  const [clockFmt,  setClockFmt]  = useState("24");

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Tema & Dil" icon={Palette}>
        <div className="py-4 flex flex-col gap-3">
          {/* Theme buttons */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light",  label: "Açık",   icon: Sun     },
                { id: "dark",   label: "Koyu",   icon: Moon    },
                { id: "system", label: "Sistem", icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1.5 border text-[11px] font-semibold transition-all
                    ${theme === id
                      ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white border-transparent shadow-md"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <SelectField
              label="Dil"
              value={lang} onChange={setLang}
              options={[
                { value: "tr", label: "Türkçe"  },
                { value: "en", label: "English" },
              ]}
            />
            <SelectField
              label="Saat Formatı"
              value={clockFmt} onChange={setClockFmt}
              options={[
                { value: "24", label: "24 saat (13:30)" },
                { value: "12", label: "12 saat (1:30 PM)" },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Arayüz" icon={Sliders}>
        <div className="py-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <SelectField
              label="Yoğunluk"
              value={density} onChange={setDensity}
              options={[
                { value: "compact", label: "Sıkışık"  },
                { value: "normal",  label: "Normal"   },
                { value: "spacious",label: "Geniş"    },
              ]}
            />
            <SelectField
              label="Yazı Boyutu"
              value={fontSize} onChange={setFontSize}
              options={[
                { value: "small",  label: "Küçük"  },
                { value: "medium", label: "Orta"   },
                { value: "large",  label: "Büyük"  },
              ]}
            />
          </div>
        </div>
        <SettingRow label="Animasyonlar" desc="Geçiş ve mikro animasyonları etkinleştir">
          <Toggle enabled={animations} onChange={setAnimations} />
        </SettingRow>
        <SettingRow label="Kenar Çubuğunu Sabitle" desc="Kenar çubuğunu her zaman açık tut">
          <Toggle enabled={sidebarPin} onChange={setSidebarPin} />
        </SettingRow>
      </SectionCard>
    </div>
  );
}

function GuvenlikSection() {
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [oldPw,    setOldPw]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confPw,   setConfPw]   = useState("");
  const [pwSaved,  setPwSaved]  = useState(false);
  const [pwError,  setPwError]  = useState("");
  const [twoFa,    setTwoFa]    = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [lockMin,  setLockMin]  = useState("15");

  const sessions = [
    { id: 1, device: "Windows 11 · Chrome",   loc: "İzmir, TR",    time: "Şu an aktif",     current: true  },
    { id: 2, device: "iPhone 14 · Safari",     loc: "İzmir, TR",    time: "2 saat önce",     current: false },
    { id: 3, device: "Windows 10 · Edge",      loc: "İstanbul, TR", time: "Dün 14:22",       current: false },
  ];

  const handlePwChange = () => {
    if (!oldPw || !newPw || !confPw) { setPwError("Tüm alanları doldurun."); return; }
    if (newPw !== confPw) { setPwError("Yeni şifreler eşleşmiyor."); return; }
    if (newPw.length < 8) { setPwError("Şifre en az 8 karakter olmalı."); return; }
    setPwError("");
    setPwSaved(true);
    setOldPw(""); setNewPw(""); setConfPw("");
    setTimeout(() => setPwSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Şifre Değiştir" icon={KeyRound}>
        <div className="py-4 flex flex-col gap-3">
          {[
            { label: "Mevcut Şifre",    val: oldPw, set: setOldPw, show: showOld, toggle: setShowOld },
            { label: "Yeni Şifre",      val: newPw, set: setNewPw, show: showNew, toggle: setShowNew },
            { label: "Yeni Şifre (Tekrar)", val: confPw, set: setConfPw, show: showConf, toggle: setShowConf },
          ].map(({ label, val, set, show, toggle }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 pr-10 text-[12px] text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
                />
                <button
                  onClick={() => toggle((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          {pwError && (
            <div className="flex items-center gap-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {pwError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handlePwChange}
              className={`h-9 px-5 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all
                ${pwSaved
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-gradient-to-b from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 shadow-md"}`}
            >
              {pwSaved ? <><Check className="h-3.5 w-3.5" /> Şifre güncellendi</> : <><Lock className="h-3.5 w-3.5" /> Şifreyi Güncelle</>}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Erişim Güvenliği" icon={Shield}>
        <SettingRow label="İki Faktörlü Doğrulama" desc="SMS veya uygulama ile ekstra güvenlik katmanı">
          <Toggle enabled={twoFa} onChange={setTwoFa} />
        </SettingRow>
        <SettingRow label="Otomatik Kilit" desc="Hareketsizlik sonrası ekranı kilitle">
          <Toggle enabled={autoLock} onChange={setAutoLock} />
        </SettingRow>
        {autoLock && (
          <SettingRow label="Kilit Süresi" desc="">
            <SelectField
              label=""
              value={lockMin} onChange={setLockMin}
              options={[
                { value: "5",  label: "5 dakika"  },
                { value: "10", label: "10 dakika" },
                { value: "15", label: "15 dakika" },
                { value: "30", label: "30 dakika" },
              ]}
            />
          </SettingRow>
        )}
      </SectionCard>

      <SectionCard title="Aktif Oturumlar" icon={Monitor}>
        <div className="py-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${s.current ? "bg-emerald-50" : "bg-slate-50"}`}>
                <Monitor className={`h-4 w-4 ${s.current ? "text-emerald-600" : "text-slate-400"}`} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate">{s.device}</p>
                <p className="text-[11px] text-slate-400">{s.loc} · {s.time}</p>
              </div>
              {s.current ? (
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5">Aktif</span>
              ) : (
                <button className="h-7 px-3 rounded-lg text-[10px] font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1">
                  <LogOut className="h-3 w-3" />
                  Çıkış
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────── MAIN ───────────────────────────────── */
export default function Settings() {
  const [activeSection, setActiveSection] = useState("profil");

  const CONTENT = {
    profil:      <ProfilSection />,
    bildirimler: <BildirimlerSection />,
    ses:         <SesSection />,
    gorunum:     <GorununSection />,
    guvenlik:    <GuvenlikSection />,
  };

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="p-3 flex flex-col gap-3 min-h-full">

        {/* Header */}
        <div className="premium-card rounded-2xl bg-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">Ayarlar</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Hesap ve uygulama tercihlerinizi yönetin</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <Sliders className="h-4 w-4 text-slate-500" strokeWidth={2} />
          </div>
        </div>

        {/* Body */}
        <div className="flex gap-3 flex-1">

          {/* Nav */}
          <div className="w-[200px] shrink-0 flex flex-col gap-1.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all text-left
                  ${activeSection === id
                    ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-md"
                    : "premium-card bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{label}</span>
                {activeSection !== id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-300 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div key={activeSection} className="flex-1 min-w-0 st-fade">
            {CONTENT[activeSection]}
          </div>

        </div>
      </div>
    </>
  );
}
