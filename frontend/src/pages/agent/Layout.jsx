import { useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Phone, PhoneIncoming, PhoneOff } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Softphone from "@/components/Softphone";
import { useCall } from "@/context/CallContext";
import { QueueStatusProvider } from "@/context/QueueStatusContext";

export default function Layout() {
  const {
    incomingAlert, incomingElapsed, signalAnswer, dismissIncoming,
    toggleSoftphone,
  } = useCall();
  const location = useLocation();
  const navigate = useNavigate();

  // ActiveCalls handles its own incoming UI; Layout only covers other pages
  const isOnActiveCalls = location.pathname === "/active-calls";
  const showOverlay = !!incomingAlert && !isOnActiveCalls;
  // Softphone: ActiveCalls'ta zaten ana panel softphone yerine geçiyor → çakışma
  const showSoftphone = !isOnActiveCalls;

  // Ctrl+P (veya Cmd+P) → softphone aç/kapat
  useEffect(() => {
    if (!showSoftphone) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        toggleSoftphone();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSoftphone, toggleSoftphone]);

  const handleAnswer = () => {
    signalAnswer();
    navigate("/active-calls");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-[#edf3f8] to-[#e6eef6] p-3 gap-3">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <QueueStatusProvider>
          <Header />
          <main className="flex-1 overflow-x-hidden relative">
            <Outlet />
          </main>
        </QueueStatusProvider>
      </div>

      {/* ── Global incoming call overlay (all pages except /active-calls) ── */}
      {showOverlay && (
        <>
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 z-[45] backdrop-blur-[3px] bg-black/25 transition-all duration-300"
            onClick={() => {}} // prevent click-through closing
          />

          {/* Alert card */}
          <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[min(520px,94vw)]
              ${incomingElapsed >= 25 ? "animate-shakeAlert" : "animate-slideDown"}`}
            style={{
              animation: incomingElapsed >= 25
                ? "shakeAlert 0.5s"
                : "slideDown 0.3s ease-out",
            }}
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
              {/* Dark header */}
              <div className="rounded-t-2xl px-5 py-3.5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
                    Gelen Çağrı
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {incomingAlert.vip && (
                    <span className="text-[9px] font-bold bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      VIP
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {String(Math.floor(incomingElapsed / 60)).padStart(2, "0")}:
                    {String(incomingElapsed % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Animated ring */}
                <div className="relative h-[56px] w-[56px] shrink-0 flex items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full border-2 border-emerald-300/50"
                    style={{ animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
                  />
                  <span className="absolute inset-[6px] rounded-full border border-emerald-200/30" />
                  <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.4)] flex items-center justify-center">
                    <PhoneIncoming className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* Caller info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-bold text-slate-800 leading-tight truncate">
                    {incomingAlert.name || incomingAlert.number}
                  </div>
                  {incomingAlert.name && (
                    <div className="text-[12px] text-slate-500 font-mono mt-0.5">
                      {incomingAlert.number}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                      IVR: {incomingAlert.ivr}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={handleAnswer}
                    className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[12px] font-bold transition-colors flex items-center gap-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Cevapla
                  </button>
                  <button
                    onClick={() => dismissIncoming()}
                    className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 text-slate-600 text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <PhoneOff className="h-3.5 w-3.5" strokeWidth={2} />
                    Reddet
                  </button>
                </div>
              </div>

              {/* Progress bar (30s countdown) */}
              <div className="h-0.5 bg-slate-100 rounded-b-2xl overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-none"
                  style={{ width: `${Math.max(0, 100 - (incomingElapsed / 30) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slideDown {
              from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
              to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
            }
            @keyframes shakeAlert {
              0%,100%{ transform: translateX(-50%) translateX(0); }
              20%    { transform: translateX(-50%) translateX(-6px); }
              40%    { transform: translateX(-50%) translateX(6px); }
              60%    { transform: translateX(-50%) translateX(-6px); }
              80%    { transform: translateX(-50%) translateX(6px); }
            }
            @keyframes ping {
              75%,100%{ transform: scale(2); opacity: 0; }
            }
          `}</style>
        </>
      )}

      {/* ── Softphone (ActiveCalls hariç tüm sayfalarda) ── */}
      {showSoftphone && <Softphone />}
    </div>
  );
}
