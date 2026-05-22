import { useEffect, useMemo, useRef, useState } from "react";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Mic, MicOff, Pause, Play, Users2, ArrowRightLeft,
  X, Delete, ChevronRight, Radio,
  Grid3X3, Clock, BookUser, Search, Shield, UserCog, User, Wrench,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { agentApi } from "@/services/api";

/* ─── Rol → softphone başlık renkleri & etiket ─── */
const ROLE_HEADER = {
  admin:      { label: "Yönetim",     dot: "bg-rose-400",    text: "text-rose-300",    badge: "bg-rose-500/15 border-rose-400/30" },
  supervisor: { label: "Süpervizör",  dot: "bg-violet-400",  text: "text-violet-300",  badge: "bg-violet-500/15 border-violet-400/30" },
  personel:   { label: "Personel",    dot: "bg-emerald-400", text: "text-emerald-300", badge: "bg-emerald-500/15 border-emerald-400/30" },
  bt:         { label: "Bilgi İşlem", dot: "bg-amber-400",   text: "text-amber-300",   badge: "bg-amber-500/15 border-amber-400/30" },
};

/* ─── Yardımcı: çağrı süresi formatla ─── */
function formatDuration(startedAt) {
  if (!startedAt) return "00:00";
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* ─── Yardımcı: isim baş harfleri ─── */
function getInitials(name = "") {
  const tokens = String(name).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toLocaleUpperCase('tr-TR');
}

/* ─── Dial pad anahtarları ─── */
const DIAL_KEYS = [
  ["1", ""],     ["2", "ABC"],  ["3", "DEF"],
  ["4", "GHI"],  ["5", "JKL"],  ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"],  ["9", "WXYZ"],
  ["*", ""],     ["0", "+"],    ["#", ""],
];

/* ─── Sol menü sekmeleri ─── */
const SP_TABS = [
  { id: "dial",      label: "Tuş Takımı",   icon: Grid3X3 },
  { id: "recent",    label: "Son Aramalar", icon: Clock },
  { id: "directory", label: "Rehber",       icon: BookUser },
];

/* ─── Rol stil haritası (Rehber) ─── */
const ROLE_STYLE = {
  admin:      { icon: Shield,  cls: "bg-rose-100 text-rose-700",       label: "Yönetim" },
  supervisor: { icon: UserCog, cls: "bg-violet-100 text-violet-700",   label: "Süpervizör" },
  personel:   { icon: User,    cls: "bg-emerald-100 text-emerald-700", label: "Personel" },
  bt:         { icon: Wrench,  cls: "bg-amber-100 text-amber-700",     label: "BT" },
};

const STATUS_TONE = {
  online:  "bg-emerald-500",
  mola:    "bg-amber-500",
  break:   "bg-amber-500",
  offline: "bg-slate-300",
};

/* ──────────────────────────────────────────────────────────── */
export default function Softphone() {
  const {
    softphoneOpen, softphoneNumber, softphoneCall,
    softphoneMuted, softphoneOnHold,
    openSoftphone, closeSoftphone,
    setSoftphoneNumber, setSoftphoneMuted, setSoftphoneOnHold,
    dial, hangupSoftphone, recentCalls,
  } = useCall();
  const { user } = useAuth();

  const role = String(user?.role || "personel").toLocaleLowerCase('tr-TR');
  const roleStyle = ROLE_HEADER[role] || ROLE_HEADER.personel;

  // Admin/Süpervizör için varsayılan açılış sekmesi Rehber, Personel için Tuş Takımı
  const defaultTab = (role === "admin" || role === "supervisor") ? "directory" : "dial";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Çağrı sayacı (1 sn'de bir tick)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!softphoneCall) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [softphoneCall]);

  // Esc ile kapat
  useEffect(() => {
    if (!softphoneOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") closeSoftphone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [softphoneOpen, closeSoftphone]);

  const panelRef = useRef(null);
  const handleAddDigit = (d) => setSoftphoneNumber((softphoneNumber || "") + d);
  const handleBackspace = () => setSoftphoneNumber((softphoneNumber || "").slice(0, -1));
  const handleDial = () => {
    if (!softphoneNumber || softphoneNumber.trim().length < 3) return;
    dial();
  };

  // Rehberden / son aramalardan tıklanan numara → tuş takımına geç ve numarayı yaz
  const callExtension = (ext) => {
    if (!ext) return;
    setSoftphoneNumber(String(ext));
    setActiveTab("dial");
    // Otomatik aramayı tetikle (kısa numaralar için 3+ karakter şartını aşar)
    setTimeout(() => dial(String(ext)), 60);
  };

  return (
    <>
      {/* ── PEEK HANDLE (her zaman görünür kenar şeridi) ── */}
      {!softphoneOpen && (
        <button
          onClick={openSoftphone}
          title="Softphone'u aç (Ctrl+P)"
          className="
            fixed top-1/2 right-0 -translate-y-1/2 z-40
            h-32 w-[14px] rounded-l-2xl
            bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
            border-l border-y border-white/10
            flex flex-col items-center justify-center gap-2
            shadow-[-6px_0_22px_rgba(15,23,42,0.18)]
            hover:w-[22px] hover:bg-gradient-to-b hover:from-emerald-700 hover:via-emerald-800 hover:to-emerald-900
            transition-all duration-200 group
          "
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          <Phone className="h-3 w-3 text-emerald-300 group-hover:text-white transition-colors" strokeWidth={2.5} />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          {softphoneCall && (
            <span className="absolute -left-1 top-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
          )}
        </button>
      )}

      {/* ── BACKDROP (açıkken arka plan blur) ── */}
      {softphoneOpen && (
        <div
          onClick={closeSoftphone}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[3px] transition-opacity duration-300 sp-fade"
        />
      )}

      {/* ── SLIDE PANEL ── */}
      <aside
        ref={panelRef}
        className={`
          fixed top-3 bottom-3 right-3 w-[380px] z-50
          rounded-2xl overflow-hidden
          bg-white border border-slate-200
          shadow-[0_24px_60px_rgba(15,23,42,0.32)]
          transform transition-transform duration-300 ease-out
          ${softphoneOpen ? "translate-x-0" : "translate-x-[calc(100%+16px)]"}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-8 w-8 rounded-xl ${roleStyle.badge} border flex items-center justify-center shrink-0`}>
              <Phone className={`h-4 w-4 ${roleStyle.text}`} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-white leading-tight">Softphone</p>
                {user?.extension && (
                  <span className="text-[10px] font-mono text-slate-400 leading-tight">· {user.extension}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${roleStyle.dot} opacity-75`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${roleStyle.dot}`} />
                </span>
                <span className={`text-[10px] uppercase tracking-[0.14em] font-semibold ${roleStyle.text}`}>
                  {roleStyle.label}
                </span>
                <span className="text-[9px] text-slate-500">·</span>
                <span className="text-[9px] uppercase tracking-wide text-slate-400">AMI Bağlı</span>
              </div>
            </div>
          </div>
          <button
            onClick={closeSoftphone}
            className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
            title="Kapat (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — aktif çağrı varsa tek görünüm; yoksa sol menü + içerik */}
        <div className="flex h-[calc(100%-60px)] bg-gradient-to-b from-slate-50/50 to-white">
          {softphoneCall ? (
            <ActiveCallView
              call={softphoneCall}
              muted={softphoneMuted}
              onHold={softphoneOnHold}
              setMuted={setSoftphoneMuted}
              setOnHold={setSoftphoneOnHold}
              onHangup={hangupSoftphone}
            />
          ) : (
            <>
              {/* Sol dikey ikon menüsü */}
              <SideTabs active={activeTab} onChange={setActiveTab} />

              {/* Aktif sekmenin içeriği */}
              <div className="flex-1 min-w-0 flex flex-col">
                {activeTab === "dial" && (
                  <DialPadTab
                    number={softphoneNumber}
                    onAdd={handleAddDigit}
                    onBackspace={handleBackspace}
                    onDial={handleDial}
                  />
                )}
                {activeTab === "recent" && (
                  <RecentTab recentCalls={recentCalls} onPick={callExtension} />
                )}
                {activeTab === "directory" && (
                  <DirectoryTab onCall={callExtension} />
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes sp-fade-in { from { opacity: 0 } to { opacity: 1 } }
        .sp-fade { animation: sp-fade-in 200ms ease-out both; }
        .sp-scroll::-webkit-scrollbar { width: 4px }
        .sp-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px }
        .sp-scroll::-webkit-scrollbar-track { background: transparent }
      `}</style>
    </>
  );
}

/* ─── Sol dikey ikon menüsü ─── */
function SideTabs({ active, onChange }) {
  return (
    <div className="w-[60px] shrink-0 border-r border-slate-200 bg-slate-50/80 flex flex-col items-center py-3 gap-1.5">
      {SP_TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.label}
            className={`relative w-[48px] py-2 rounded-xl flex flex-col items-center gap-0.5 transition-all
              ${isActive
                ? "bg-white border border-slate-200 shadow-sm text-emerald-600"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-700"}`}
          >
            {isActive && (
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-emerald-500" />
            )}
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className={`text-[9px] font-semibold leading-tight text-center ${isActive ? "text-emerald-700" : ""}`}>
              {t.label.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Aktif çağrı görünümü ─── */
function ActiveCallView({ call, muted, onHold, setMuted, setOnHold, onHangup }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Caller card */}
      <div className="px-4 pt-5 pb-4 text-center">
        <div className="mx-auto h-[72px] w-[72px] relative flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-60" />
          <div className="relative h-[72px] w-[72px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
            {call.direction === "inbound" ? (
              <PhoneIncoming className="h-8 w-8 text-white" strokeWidth={2} />
            ) : (
              <PhoneOutgoing className="h-8 w-8 text-white" strokeWidth={2} />
            )}
          </div>
        </div>
        <p className="mt-3 text-[16px] font-bold text-slate-800 truncate">
          {call.name || call.number}
        </p>
        {call.name && (
          <p className="text-[12px] text-slate-500 font-mono mt-0.5">{call.number}</p>
        )}
        <div className="inline-flex mt-2 items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums">
            {formatDuration(call.startedAt)}
          </span>
        </div>
      </div>

      {/* Action grid */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <CallActionBtn
          icon={muted ? MicOff : Mic}
          label={muted ? "Sessiz" : "Mikrofon"}
          active={muted}
          onClick={() => setMuted(!muted)}
        />
        <CallActionBtn
          icon={onHold ? Play : Pause}
          label={onHold ? "Devam" : "Beklet"}
          active={onHold}
          onClick={() => setOnHold(!onHold)}
        />
        <CallActionBtn icon={ArrowRightLeft} label="Aktar" />
        <CallActionBtn icon={Users2} label="Konferans" />
        <CallActionBtn icon={Radio} label="Kayıt" />
        <CallActionBtn icon={ChevronRight} label="DTMF" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Hangup */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <button
          onClick={onHangup}
          className="w-full h-12 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(244,63,94,0.35)] transition-all"
        >
          <PhoneOff className="h-4.5 w-4.5" strokeWidth={2.4} />
          Çağrıyı Sonlandır
        </button>
      </div>
    </div>
  );
}

/* ─── Sekme: Tuş Takımı ─── */
function DialPadTab({ number, onAdd, onBackspace, onDial }) {
  return (
    <>
      {/* Number display */}
      <div className="px-3 pt-3">
        <div className="relative h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          <span className="text-[20px] font-mono font-bold text-slate-700 tabular-nums truncate px-10">
            {number || <span className="text-slate-300 text-[14px] font-sans font-normal">Numara girin…</span>}
          </span>
          {number && (
            <button
              onClick={onBackspace}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500"
              title="Sil"
            >
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dial pad */}
      <div className="px-3 pt-3 grid grid-cols-3 gap-1.5">
        {DIAL_KEYS.map(([key, sub]) => (
          <button
            key={key}
            onClick={() => onAdd(key)}
            className="h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-emerald-300 active:scale-[0.97] transition-all flex flex-col items-center justify-center"
          >
            <span className="text-[18px] font-bold text-slate-700 leading-none">{key}</span>
            {sub && <span className="text-[8px] uppercase tracking-wide text-slate-400 mt-0.5">{sub}</span>}
          </button>
        ))}
      </div>

      {/* Dial button */}
      <div className="px-3 pt-3 pb-3">
        <button
          onClick={onDial}
          disabled={!number || number.trim().length < 3}
          className="w-full h-11 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all"
        >
          <Phone className="h-4 w-4" strokeWidth={2.4} />
          Ara
        </button>
      </div>
    </>
  );
}

/* ─── Sekme: Son Aramalar ─── */
function RecentTab({ recentCalls, onPick }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Çağrı Geçmişi
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">{recentCalls?.length || 0}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sp-scroll p-2">
        {(!recentCalls || recentCalls.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8 gap-2">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-[12px] font-semibold text-slate-600">Geçmiş çağrı yok</p>
            <p className="text-[10px] text-slate-400">Yapılan/gelen çağrılar burada listelenir.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {recentCalls.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c.number)}
                className="group flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-colors text-left"
              >
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${c.dir === "in" ? "bg-emerald-50" : "bg-sky-50"}`}>
                  {c.dir === "in"
                    ? <PhoneIncoming className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                    : <PhoneOutgoing className="h-4 w-4 text-sky-600"     strokeWidth={2} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700 truncate">{c.name || "Bilinmeyen"}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{c.number}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">{c.at}</span>
                  <Phone className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sekme: Rehber ─── */
function DirectoryTab({ onCall }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    agentApi.getDirectory()
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Filtreleme: isim VEYA dahili numara
  const filtered = useMemo(() => {
    if (!data) return null;
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const groups = ["admin", "supervisor", "personel", "bt"];
    const out = {};
    for (const g of groups) {
      const list = Array.isArray(data[g]) ? data[g] : [];
      out[g] = q
        ? list.filter((u) =>
            (u.name || "").toLocaleLowerCase('tr-TR').includes(q) ||
            String(u.extension || "").includes(q)
          )
        : list;
    }
    return out;
  }, [data, query]);

  const totalFiltered = filtered
    ? Object.values(filtered).reduce((a, l) => a + l.length, 0)
    : 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header + arama */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Şirket Rehberi
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {loading ? "…" : `${totalFiltered} kişi`}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim veya dahili ara…"
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-[12px] focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto sp-scroll px-2 py-2">
        {loading && (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !data && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8 gap-2">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <BookUser className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-[12px] font-semibold text-slate-600">Rehber yüklenemedi</p>
            <p className="text-[10px] text-slate-400">Sunucu bağlantısını kontrol edin.</p>
          </div>
        )}

        {!loading && data && totalFiltered === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8 gap-2">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-[12px] font-semibold text-slate-600">Eşleşme yok</p>
            <p className="text-[10px] text-slate-400">"{query}" için kullanıcı bulunamadı.</p>
          </div>
        )}

        {!loading && filtered && totalFiltered > 0 && (
          <div className="space-y-3">
            {["admin", "supervisor", "personel", "bt"].map((role) => {
              const list = filtered[role] || [];
              if (list.length === 0) return null;
              const style = ROLE_STYLE[role] || ROLE_STYLE.personel;
              return (
                <div key={role}>
                  <div className="flex items-center gap-1.5 px-1 mb-1">
                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full ${style.cls}`}>
                      <style.icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                      {style.label}
                    </span>
                    <span className="text-[9px] text-slate-400 tabular-nums">· {list.length}</span>
                    <span className="flex-1 h-px bg-slate-100 ml-1" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {list.map((u) => (
                      <ContactRow
                        key={u.id}
                        contact={u}
                        roleStyle={style}
                        onCall={onCall}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Rehber satırı ─── */
function ContactRow({ contact, roleStyle, onCall }) {
  const hasExt = !!contact.extension;
  const statusTone = STATUS_TONE[contact.anlik_durum] || STATUS_TONE.offline;

  return (
    <div className={`group flex items-center gap-2 px-2 py-2 rounded-xl border transition-all
      ${contact.isMe
        ? "bg-amber-50/50 border-amber-200"
        : "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40"}`}
    >
      {/* Avatar + durum noktası */}
      <div className="relative shrink-0">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold ${roleStyle.cls}`}>
          {getInitials(contact.name)}
        </div>
        <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${statusTone}`} />
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-semibold text-slate-800 truncate">
            {contact.name}
          </span>
          {contact.isMe && (
            <span className="text-[8px] font-bold uppercase text-amber-700 bg-amber-100 px-1 py-0.5 rounded">
              Ben
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {hasExt ? (
            <span className="text-[10px] font-mono text-slate-500 tabular-nums">
              ☎ {contact.extension}
            </span>
          ) : (
            <span className="text-[9px] text-slate-400 italic">dahili tanımlı değil</span>
          )}
          {contact.unvan && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
              <span className="text-[9px] text-slate-400 truncate">{contact.unvan}</span>
            </>
          )}
        </div>
      </div>

      {/* Ara butonu */}
      <button
        type="button"
        disabled={!hasExt || contact.isMe}
        onClick={() => onCall(contact.extension)}
        title={
          contact.isMe ? "Kendinizi arayamazsınız" :
          !hasExt     ? "Dahili numara tanımlı değil" :
          `${contact.name} (${contact.extension})`
        }
        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all
          ${(!hasExt || contact.isMe)
            ? "bg-slate-50 text-slate-300 cursor-not-allowed"
            : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-sm opacity-70 group-hover:opacity-100"}`}
      >
        <Phone className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ─── Aktif çağrı için aksiyon butonu ─── */
function CallActionBtn({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        h-[58px] rounded-xl flex flex-col items-center justify-center gap-1
        border transition-all
        ${active
          ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}
      `}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
