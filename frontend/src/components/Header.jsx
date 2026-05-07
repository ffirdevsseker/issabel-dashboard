import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Radio, Users } from "lucide-react";
import { useQueueStatus } from "@/context/QueueStatusContext";

const statusItems = [
  {
    label: "Bildirim",
    icon: Bell,
    count: "3",
    badgeClass: "bg-cyan-400 text-cyan-950 shadow-[0_0_14px_rgba(34,211,238,0.35)]",
  },
  {
    label: "Mesaj",
    icon: MessageCircle,
    count: "12",
    badgeClass: "bg-sky-300 text-slate-950 shadow-[0_0_14px_rgba(125,211,252,0.28)]",
  },
];

export default function Header() {
  const { queue, connectionState } = useQueueStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [nowTick, setNowTick] = useState(() => Date.now());

  const isDashboard = location.pathname === "/";
  const showQueueShortcut = !isDashboard;
  const queueWaiting = queue?.waiting ?? 0;
  const isOffline = connectionState === "disconnected";

  // Kuyruk yoğunluğuna göre renk tonu — pill ve badge için ayrı
  const queueTone = isOffline
    ? {
        pill: "bg-slate-500/15 text-slate-200 hover:bg-slate-500/25",
        badge: "border-slate-300/30 bg-slate-400/30 text-slate-50",
        ring: "bg-slate-300",
      }
    : queueWaiting >= 10
      ? {
          pill: "bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
          badge: "border-rose-300/30 bg-rose-400/25 text-rose-50",
          ring: "bg-rose-400",
        }
      : queueWaiting >= 5
        ? {
            pill: "bg-amber-400/15 text-amber-100 hover:bg-amber-400/25",
            badge: "border-amber-300/30 bg-amber-400/30 text-amber-950",
            ring: "bg-amber-400",
          }
        : queueWaiting > 0
          ? {
              pill: "bg-sky-400/15 text-sky-100 hover:bg-sky-400/25",
              badge: "border-sky-300/30 bg-sky-400/30 text-sky-950",
              ring: "bg-sky-400",
            }
          : {
              pill: "bg-emerald-400/12 text-emerald-100 hover:bg-emerald-400/22",
              badge: "border-emerald-300/30 bg-emerald-400/30 text-emerald-950",
              ring: "bg-emerald-400",
            };

  const shiftStartHour = 9;
  const shiftEndHour = 17;
  const now = new Date(nowTick);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(shiftEndHour, 0, 0, 0);
  const remainingMs = Math.max(0, shiftEnd.getTime() - now.getTime());
  const remainingTotalMin = Math.floor(remainingMs / 60000);
  const remainingHours = Math.floor(remainingTotalMin / 60);
  const remainingMinutes = remainingTotalMin % 60;
  const shiftLabel = `${String(shiftStartHour).padStart(2, "0")}:00-${String(shiftEndHour).padStart(2, "0")}:00`;

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-50 flex min-h-14 items-center justify-end px-2 py-2">
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#132334] via-[#18293a] to-[#102131] px-2 py-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-white/5 backdrop-blur-xl">
        <div className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
          <span className="font-semibold text-slate-100">Vardiya {shiftLabel}</span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold tabular-nums">Kalan {remainingHours}s {remainingMinutes}d</span>
        </div>

        {showQueueShortcut && (
          <button
            type="button"
            onClick={() => navigate("/")}
            title={
              isOffline
                ? "Kuyruk bağlantısı yok"
                : `Kuyrukta ${queueWaiting} çağrı bekliyor — Genel Bakış'a git`
            }
            className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${queueTone.pill}`}
          >
            <span className="relative flex h-2 w-2">
              {!isOffline && queueWaiting > 0 && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${queueTone.ring}`} />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${queueTone.ring}`} />
            </span>
            <Users className="h-3.5 w-3.5" />
            <span>Kuyruk</span>
            <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border px-1 text-[10px] font-bold tabular-nums ${queueTone.badge}`}>
              {isOffline ? "—" : queueWaiting}
            </span>
          </button>
        )}

        {statusItems.map(({ label, icon: Icon, count, badgeClass }) => (
          <button
            key={label}
            type="button"
            className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-100 transition-all duration-200 hover:bg-white/8 hover:text-white"
          >
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-100 shadow-inner ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-105 group-hover:bg-white/12">
              <Icon className="h-4 w-4" />
              <span className={`absolute -right-1 -bottom-1 inline-flex min-w-[14px] items-center justify-center rounded-full border border-white/20 px-1 py-0.5 text-[9px] font-bold leading-none ${badgeClass}`}>
                {count}
              </span>
            </span>
            <span>{label}</span>
          </button>
        ))}

        <button
          type="button"
          className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-all duration-200 hover:bg-emerald-400/15 hover:text-emerald-100"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.55)]" />
          </span>
          <Radio className="h-4 w-4" />
          <span className="flex flex-col items-start leading-none">
            <span className="text-xs font-semibold tracking-wide">AMI</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-emerald-200/80">
              Bağlı
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
