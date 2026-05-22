import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell, MessageCircle, PhoneIncoming, Radio, Users, Phone,
  CheckCircle2, PhoneMissed, Clock,
} from "lucide-react";
import { useQueueStatus } from "@/context/QueueStatusContext";
import { useCall } from "@/context/CallContext";
import { useAuth } from "@/context/AuthContext";
import { agentApi, cdrApi } from "@/services/api";

const VARDIYA_BASLANGIC = 9;
const VARDIYA_BITIS     = 17;

export default function Header() {
  const { queue, connectionState } = useQueueStatus();
  const { simulateIncomingCall, incomingAlert } = useCall();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [stats, setStats]     = useState(null);

  const isOffline = connectionState === "disconnected";
  const queueWaiting = queue?.waiting ?? 0;

  /* Kişisel günlük istatistikleri 30 sn'de bir tazele */
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      agentApi.getTodayStats()
        .then((res) => { if (!cancelled) setStats(res.data); })
        .catch(() => {
          // Fallback: /cdr/stats?today=true
          cdrApi.getStats(true)
            .then((res) => { if (!cancelled) setStats(res.data); })
            .catch(() => {});
        });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  /* Saat tick — vardiya geri sayımı için */
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  /* Vardiya hesabı */
  const now = new Date(nowTick);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(VARDIYA_BITIS, 0, 0, 0);
  const remainingMs = Math.max(0, shiftEnd.getTime() - now.getTime());
  const remTotalMin = Math.floor(remainingMs / 60_000);
  const remH = Math.floor(remTotalMin / 60);
  const remM = remTotalMin % 60;
  const shiftLabel = `${String(VARDIYA_BASLANGIC).padStart(2, "0")}:00-${String(VARDIYA_BITIS).padStart(2, "0")}:00`;

  /* KPI değerleri */
  const myTotal     = stats?.total_calls      ?? 0;
  const myAnswered  = stats?.answered_calls   ?? 0;
  const teamMissed  = stats ? (stats.no_answer_calls || 0) + (stats.busy_calls || 0) : 0;

  /* Kuyruk renk tonu */
  const queueTone =
    isOffline           ? "text-slate-300"
    : queueWaiting >= 10 ? "text-rose-400"
    : queueWaiting >= 5  ? "text-amber-400"
    : queueWaiting > 0   ? "text-sky-400"
    :                      "text-emerald-400";

  const queueIconBg =
    isOffline           ? "bg-slate-500/15"
    : queueWaiting >= 10 ? "bg-rose-500/15"
    : queueWaiting >= 5  ? "bg-amber-500/15"
    : queueWaiting > 0   ? "bg-sky-500/15"
    :                      "bg-emerald-500/15";

  /* Stat strip — admin/supervisor tarzı */
  const STAT_ITEMS = [
    {
      label:   "Çağrılarım",
      value:   myTotal,
      icon:    Phone,
      color:   "text-blue-400",
      bg:      "bg-blue-500/12",
      onClick: () => navigate("/calls"),
    },
    {
      label:   "Cevapladım",
      value:   myAnswered,
      icon:    CheckCircle2,
      color:   "text-emerald-400",
      bg:      "bg-emerald-500/12",
      onClick: () => navigate("/calls"),
    },
    {
      label:   "Ekip Cevapsız",
      value:   teamMissed,
      icon:    PhoneMissed,
      color:   teamMissed > 0 ? "text-rose-400" : "text-slate-300",
      bg:      teamMissed > 0 ? "bg-rose-500/12" : "bg-slate-500/10",
      onClick: () => navigate("/"),
    },
    {
      label:   "Kuyruk",
      value:   isOffline ? "—" : queueWaiting,
      icon:    Users,
      color:   queueTone,
      bg:      queueIconBg,
      onClick: () => navigate("/"),
    },
  ];

  return (
    <header className="relative z-50 mb-3">
      <div
        className="
          flex items-center justify-between gap-3
          h-[68px] px-4
          rounded-2xl
          border border-white/5
          bg-[linear-gradient(180deg,#132334_0%,#18293a_60%,#102131_100%)]
          shadow-[0_8px_32px_rgba(0,0,0,0.15)]
        "
      >
        {/* ── Sol: Kişisel + Ekip stat şeridi ─────────────────────────── */}
        <div className="flex items-center min-w-0">
          {STAT_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`
                  group flex items-center gap-2.5 px-3.5 py-1 h-full
                  ${i < STAT_ITEMS.length - 1 ? "border-r border-white/7" : ""}
                  hover:bg-white/[0.03] transition-colors
                  cursor-pointer
                `}
              >
                <div className={`h-9 w-9 rounded-full ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-[18px] w-[18px] ${item.color}`} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] font-medium text-slate-400/90">
                    {item.label}
                  </span>
                  <span className={`text-[20px] font-bold tabular-nums ${item.color} mt-0.5`}>
                    {item.value}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Sağ: Vardiya · Test · Bildirim · Mesaj · AMI ───────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Vardiya kartı */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Vardiya {shiftLabel}
              </span>
              <span className="text-[12px] font-semibold text-slate-100 tabular-nums mt-0.5">
                Kalan {remH}s {String(remM).padStart(2, "0")}d
              </span>
            </div>
          </div>

          {/* Test Çağrısı */}
          <button
            type="button"
            disabled={!!incomingAlert}
            onClick={simulateIncomingCall}
            title={incomingAlert ? "Zaten çağrı var" : "Test gelen çağrı simüle et"}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all
              ${incomingAlert
                ? "bg-slate-500/10 text-slate-400 border border-white/5 cursor-not-allowed"
                : "bg-sky-400/10 text-sky-300 border border-sky-400/20 hover:bg-sky-400/20 hover:text-sky-200 active:scale-95"
              }
            `}
          >
            <PhoneIncoming className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Test Çağrısı</span>
            {incomingAlert && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* Bildirim */}
          <button
            type="button"
            title="Bildirimler"
            className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-cyan-400 text-cyan-950 text-[10px] font-bold flex items-center justify-center px-1 border-2 border-[#132334]">
              3
            </span>
          </button>

          {/* Mesaj */}
          <button
            type="button"
            title="Mesajlar"
            className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-sky-300 text-slate-950 text-[10px] font-bold flex items-center justify-center px-1 border-2 border-[#132334]">
              12
            </span>
          </button>

          {/* AMI Bağlı */}
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.55)]" />
            </span>
            <Radio className="h-3.5 w-3.5 text-emerald-300" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-bold text-emerald-300 tracking-wide">
                AMI
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70 mt-0.5">
                Bağlı
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
