import { useEffect, useRef, useState } from "react";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Mic, MicOff, Pause, Play, Users2, ArrowRightLeft,
  X, Delete, ChevronRight, Radio,
} from "lucide-react";
import { useCall } from "@/context/CallContext";

/* ─── Yardımcı: çağrı süresi formatla ─── */
function formatDuration(startedAt) {
  if (!startedAt) return "00:00";
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* ─── Dial pad anahtarları ─── */
const DIAL_KEYS = [
  ["1", ""],     ["2", "ABC"],  ["3", "DEF"],
  ["4", "GHI"],  ["5", "JKL"],  ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"],  ["9", "WXYZ"],
  ["*", ""],     ["0", "+"],    ["#", ""],
];

/* ──────────────────────────────────────────────────────────── */
export default function Softphone() {
  const {
    softphoneOpen, softphoneNumber, softphoneCall,
    softphoneMuted, softphoneOnHold,
    openSoftphone, closeSoftphone,
    setSoftphoneNumber, setSoftphoneMuted, setSoftphoneOnHold,
    dial, hangupSoftphone, recentCalls,
  } = useCall();

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
          fixed top-3 bottom-3 right-3 w-[340px] z-50
          rounded-2xl overflow-hidden
          bg-white border border-slate-200
          shadow-[0_24px_60px_rgba(15,23,42,0.32)]
          transform transition-transform duration-300 ease-out
          ${softphoneOpen ? "translate-x-0" : "translate-x-[calc(100%+16px)]"}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Phone className="h-4 w-4 text-emerald-300" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Softphone</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-emerald-300">
                  AMI Bağlı
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={closeSoftphone}
            className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Kapat (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — 2 mod: aktif çağrı | dial pad */}
        <div className="flex flex-col h-[calc(100%-60px)] bg-gradient-to-b from-slate-50/50 to-white">
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
            <DialPadView
              number={softphoneNumber}
              onAdd={handleAddDigit}
              onBackspace={handleBackspace}
              onDial={handleDial}
              recentCalls={recentCalls}
              onPickRecent={(num) => setSoftphoneNumber(num)}
            />
          )}
        </div>
      </aside>

      <style>{`
        @keyframes sp-fade-in { from { opacity: 0 } to { opacity: 1 } }
        .sp-fade { animation: sp-fade-in 200ms ease-out both; }
      `}</style>
    </>
  );
}

/* ─── Aktif çağrı görünümü ─── */
function ActiveCallView({ call, muted, onHold, setMuted, setOnHold, onHangup }) {
  return (
    <>
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
    </>
  );
}

/* ─── Dial pad görünümü ─── */
function DialPadView({ number, onAdd, onBackspace, onDial, recentCalls, onPickRecent }) {
  return (
    <>
      {/* Number display */}
      <div className="px-4 pt-4">
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
      <div className="px-4 pt-3 grid grid-cols-3 gap-1.5">
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
      <div className="px-4 pt-3">
        <button
          onClick={onDial}
          disabled={!number || number.trim().length < 3}
          className="w-full h-11 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all"
        >
          <Phone className="h-4 w-4" strokeWidth={2.4} />
          Ara
        </button>
      </div>

      {/* Recent calls */}
      <div className="px-4 pt-4 pb-2 flex-1 overflow-y-auto sp-scroll">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
          Son Aramalar
        </p>
        <div className="flex flex-col gap-1">
          {recentCalls.map((c) => (
            <button
              key={c.id}
              onClick={() => onPickRecent(c.number)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${c.dir === "in" ? "bg-emerald-50" : "bg-sky-50"}`}>
                {c.dir === "in"
                  ? <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
                  : <PhoneOutgoing className="h-3.5 w-3.5 text-sky-600"     strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate">{c.name}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate">{c.number}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{c.at}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .sp-scroll::-webkit-scrollbar { width: 4px }
        .sp-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px }
        .sp-scroll::-webkit-scrollbar-track { background: transparent }
      `}</style>
    </>
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
