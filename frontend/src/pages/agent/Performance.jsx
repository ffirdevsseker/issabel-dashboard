import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import {
  Award, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Star, Target, TrendingDown, TrendingUp, X,
  Minus, PhoneCall, Zap, Trophy, Moon, ArrowUpRight,
  Flame, Sparkles, Activity, Shield, Crown
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const PAGE_STYLES = `
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes float-slow {
    0%,100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-3px) scale(1.02); }
  }
  @keyframes xpFill {
    from { width: 0; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rowIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes badgePop {
    0%   { opacity: 0; transform: scale(0.88); }
    60%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
  .animate-float      { animation: float 3s ease-in-out infinite; }
  .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
  .animate-xpFill     { animation: xpFill 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-countUp    { animation: countUp 500ms ease-out both; }
  .animate-badgePop   { animation: badgePop 350ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .premium-glow       { box-shadow: 0 0 30px -10px rgba(29, 185, 84, 0.2); }
  .premium-card       { box-shadow: 0 8px 30px rgba(0,0,0,0.04); border: 1px solid rgba(226, 232, 240, 0.8); }
  .shimmer-effect {
    position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    animation: shimmer 3s infinite;
  }
`;

/* ─────────────────────────────── MOCK DATA ──────────────────────────── */
function genDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  });
}

const DAYS_30 = genDays(30);

const mockLevel = {
  currentLevel: 12, levelName: "Gümüş Ajan", tier: "gumus",
  currentXP: 2340, levelStartXP: 2000, levelEndXP: 3000,
  todayXP: 120, weekXP: 840, totalXP: 24680,
};

const mockCharts = {
  dailyCalls: DAYS_30.map((date) => ({ date, count: Math.floor(Math.random() * 15) + 8, target: 20 })),
  avgDuration: DAYS_30.map((date) => ({ date, avgSeconds: Math.floor(Math.random() * 120) + 200, targetMin: 180, targetMax: 360 })),
  csat: DAYS_30.map((date) => ({ date, score: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, target: 4.0 })),
  missedRate: DAYS_30.map((date) => ({ date, rate: Math.round(Math.random() * 18) / 100, maxRate: 0.1 })),
};

const mockBadges = [
  { id: "b1", name: "İlk Çağrı",       iconName: "PhoneCall", rarity: "yaygın",  description: "İlk çağrını tamamla.",                    target: 1,   progress: 1,  earnedAt: "2025-03-12" },
  { id: "b2", name: "100 Çağrı",       iconName: "Trophy",    rarity: "yaygın",  description: "Toplam 100 çağrı tamamla.",              target: 100, progress: 100, earnedAt: "2025-03-28" },
  { id: "b3", name: "Hızlı Çözüm",     iconName: "Zap",       rarity: "nadir",   description: "5dk altında 10 çağrı tamamla.",          target: 10,  progress: 8,  earnedAt: null },
  { id: "b4", name: "Müşteri Dostu",   iconName: "Star",      rarity: "nadir",   description: "30 günde 4.5+ CSAT ortalaması tut.",     target: 1,   progress: 1,  earnedAt: "2025-04-01" },
  { id: "b5", name: "Keskin Nişancı",  iconName: "Target",    rarity: "nadir",   description: "1 haftada sıfır cevapsız çağrı.",        target: 7,   progress: 3,  earnedAt: null },
  { id: "b6", name: "Efsane Ajan",     iconName: "Crown",     rarity: "efsane",  description: "Platine ulaş ve tüm nadir rozetleri kazan.", target: 1, progress: 0,  earnedAt: null },
  { id: "b7", name: "Gece Kuşu",       iconName: "Moon",      rarity: "nadir",   description: "20:00 sonrası 10 çağrı tamamla.",        target: 10,  progress: 4,  earnedAt: null },
  { id: "b8", name: "Aktarma Ustası",  iconName: "ArrowUpRight", rarity: "yaygın",  description: "50 başarılı aktarma yap.",               target: 50,  progress: 50, earnedAt: "2025-04-10" },
];

const mockQuests = [
  { id: "q1", title: "Günlük 20 Çağrı",  description: "Bugün en az 20 çağrı tamamla.", hint: "Kaçan çağrıları hızlıca geri arayarak kotayı tamamlayabilirsin.", current: 20, target: 20, xpReward: 50, category: "calls",  completedAt: new Date().toISOString() },
  { id: "q2", title: "CSAT Yıldızı",     description: "3 çağrıda 5 yıldız al.",         hint: "Çağrı sonunda anket gönderildiğinden emin ol.",                    current: 2,  target: 3,  xpReward: 30, category: "csat",   completedAt: null },
  { id: "q3", title: "Hızlı Kapanış",    description: "5 çağrıyı 3 dk altında bitir.",  hint: "Bilgi bankasını önceden hazırla, müşteri beklemesin.",             current: 1,  target: 5,  xpReward: 40, category: "speed",  completedAt: null },
];

const mockGoals = [
  { id: "g1", name: "Haftalık 100 Çağrı",    current: 72,   target: 100,  unit: "çağrı",   lowerIsBetter: false, deadline: "2025-04-27" },
  { id: "g2", name: "Ort. Konuşma < 6 dk",  current: 278,  target: 360,  unit: "saniye",  lowerIsBetter: true,  deadline: "2025-04-27" },
  { id: "g3", name: "CSAT > 4.0",           current: 4.2,  target: 4.0,  unit: "puan",    lowerIsBetter: false, deadline: "2025-04-27" },
  { id: "g4", name: "Cevapsız < %10",       current: 0.13, target: 0.10, unit: "%",       lowerIsBetter: true,  deadline: "2025-04-27" },
];

const mockLeaderboard = [
  { rank: 1, displayName: "Ajan #1",       isCurrentUser: false, level: 15, levelName: "Altın",  weeklyXP: 3420, xpTrend: "up",   callCount: 187, csatAverage: 4.8 },
  { rank: 2, displayName: "Ajan #2",       isCurrentUser: false, level: 14, levelName: "Altın",  weeklyXP: 3180, xpTrend: "same", callCount: 172, csatAverage: 4.7 },
  { rank: 3, displayName: "Ajan #3",       isCurrentUser: false, level: 12, levelName: "Gümüş", weeklyXP: 2940, xpTrend: "up",   callCount: 165, csatAverage: 4.6 },
  { rank: 4, displayName: "Ahmet Yılmaz", isCurrentUser: true,  level: 12, levelName: "Gümüş", weeklyXP: 2340, xpTrend: "up",   callCount: 143, csatAverage: 4.2 },
  { rank: 5, displayName: "Ajan #5",       isCurrentUser: false, level: 11, levelName: "Gümüş", weeklyXP: 2100, xpTrend: "down", callCount: 138, csatAverage: 4.1 },
  { rank: 6, displayName: "Ajan #6",       isCurrentUser: false, level: 10, levelName: "Gümüş", weeklyXP: 1870, xpTrend: "same", callCount: 124, csatAverage: 3.9 },
];

const mockXPMovements = [
  { id: "xp1", date: "2026-04-26", amount: +45, reason: "Çağrı tamamlandı", ref: "CALL-7721" },
  { id: "xp2", date: "2026-04-26", amount: +20, reason: "Bilgi bankası önerisi onaylandı", ref: "KB-SUG-143" },
  { id: "xp3", date: "2026-04-25", amount: -20, reason: "Supervisor onaylı şikayet", ref: "CMP-582" },
  { id: "xp4", date: "2026-04-25", amount: +20, reason: "Manuel Düzeltme - Admin", ref: "AUD-9912" },
  { id: "xp5", date: "2026-04-24", amount: +30, reason: "CSAT görevi", ref: "QUEST-q2" },
];

/* ─────────────────────────────── HELPERS ────────────────────────────── */
function fmtDur(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const TIERS = {
  bronz:  { label: "Bronz Ajan",  color: "#cd7f32", next: "Gümüş",  startXP: 0,     endXP: 5000  },
  gumus:  { label: "Gümüş Ajan", color: "#9e9e9e", next: "Altın",  startXP: 5000,  endXP: 15000 },
  altin:  { label: "Altın Ajan",  color: "#ffd700", next: "Platin", startXP: 15000, endXP: 50000 },
  platin: { label: "Platin Ajan", color: "#e5e4e2", next: null,     startXP: 50000, endXP: null  },
};

const RARITY = {
  yaygın: { label: "Yaygın", color: "text-slate-500",  bg: "bg-slate-100",   border: "border-slate-300"  },
  nadir:  { label: "Nadir",  color: "text-blue-600",   bg: "bg-blue-50",     border: "border-blue-300"   },
  efsane: { label: "Efsane", color: "text-amber-600",  bg: "bg-amber-50",    border: "border-amber-400"  },
};

function goalColor(current, target, lowerIsBetter) {
  const ratio = lowerIsBetter ? target / current : current / target;
  if (ratio >= 1)   return "#1DB954";
  if (ratio >= 0.8) return "#f59e0b";
  return "#ef4444";
}

function goalStatus(current, target, lowerIsBetter) {
  const ratio = lowerIsBetter ? target / current : current / target;
  if (ratio >= 1.05) return { label: "Hedef Aşıldı ✓",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (ratio >= 1)    return { label: "Hedefte ✓",         cls: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (ratio >= 0.8)  return { label: "Yaklaşıyor ⚠",    cls: "text-amber-600  bg-amber-50   border-amber-200"   };
  return               { label: lowerIsBetter ? "Hedefin Üstünde ✗" : "Geride ✗", cls: "text-rose-600 bg-rose-50 border-rose-200" };
}

/* ─────────────────────────────── SVG MEDAL ─────────────────────────── */
function MedalSVG({ tier, size = 64 }) {
  const t = TIERS[tier] || TIERS.bronz;
  const id = `mg-${tier}`;

  if (tier === "platin") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="animate-float">
        <defs>
          <radialGradient id={id} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="60%" stopColor="#c8c8c8" />
            <stop offset="100%" stopColor="#9e9e9e" />
          </radialGradient>
        </defs>
        <polygon points="32,4 39,24 60,24 44,37 50,58 32,45 14,58 20,37 4,24 25,24"
          fill={`url(#${id})`} stroke="#bdbdbd" strokeWidth="1" />
        <text x="32" y="36" textAnchor="middle" fontSize="14" fill="#5a5a5a" fontWeight="bold">P</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="animate-float">
      <defs>
        <radialGradient id={id} cx="38%" cy="32%">
          <stop offset="0%" stopColor={tier === "bronz" ? "#e8a060" : tier === "gumus" ? "#e0e0e0" : "#ffe566"} />
          <stop offset="100%" stopColor={t.color} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="22" fill={`url(#${id})`} stroke={t.color} strokeWidth="1.5" />
      <circle cx="32" cy="34" r="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <text x="32" y="30" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.9)">
        {tier === "bronz" ? "B" : tier === "gumus" ? "G" : "A"}
      </text>
      <text x="32" y="43" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="600">
        LVL {mockLevel.currentLevel}
      </text>
      {/* ribbon */}
      <rect x="27" y="8" width="10" height="14" rx="2" fill={t.color} />
      <rect x="26" y="8" width="12" height="3" rx="1.5" fill={tier === "bronz" ? "#a0522d" : tier === "gumus" ? "#757575" : "#c9a227"} />
    </svg>
  );
}

/* ─────────────────────────────── LEVEL PANEL ───────────────────────── */
function LevelPanel({ data }) {
  const tier = TIERS[data.tier] || TIERS.bronz;
  const pct = Math.round(((data.currentXP - data.levelStartXP) / (data.levelEndXP - data.levelStartXP)) * 100);
  const remaining = data.levelEndXP - data.currentXP;
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-300 hover:shadow-xl group border border-slate-800"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)" }}
        onClick={() => setShowModal(true)}
        title="Seviye tablosunu görüntüle"
      >
        <div className="relative">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full border border-white/[0.03] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-emerald-500/[0.06] blur-[32px] pointer-events-none" />
          <div className="shimmer-effect rounded-2xl hidden group-hover:block" />

          <div className="relative z-10 px-5 py-4 flex items-center gap-6">
            {/* Medal */}
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
              <MedalSVG tier={data.tier} size={58} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-0.5">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Seviye {data.currentLevel}</span>
                {tier.next && (
                  <span className="text-[9px] bg-slate-800/80 border border-slate-700/80 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    Sonraki: {tier.next}
                  </span>
                )}
              </div>
              <h2 className="text-[18px] font-extrabold leading-tight" style={{ color: tier.color }}>
                {tier.label}
              </h2>

              {/* XP Bar */}
              <div className="mt-2.5 mb-1.5">
                <div className="h-2 rounded-full bg-slate-800 border border-slate-700/50 relative overflow-visible">
                  <div className="h-full rounded-full animate-xpFill"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                  <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#10b981] bg-white shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    style={{ left: `calc(${pct}% - 7px)` }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  {data.currentXP.toLocaleString("tr-TR")} / {data.levelEndXP.toLocaleString("tr-TR")} XP
                </span>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  {remaining.toLocaleString("tr-TR")} XP kaldı
                </span>
              </div>
            </div>

            {/* XP Stats */}
            <div className="hidden sm:flex flex-col gap-2 shrink-0 pl-6 border-l border-slate-700/50">
              {[
                { label: "Bugün",    value: `+${data.todayXP}` },
                { label: "Bu hafta", value: `+${data.weekXP}` },
                { label: "Toplam",   value: data.totalXP.toLocaleString("tr-TR") },
              ].map(({ label, value }) => (
                <div key={label} className="text-right">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
                  <div className="text-[13px] font-extrabold text-emerald-400 tabular-nums">{value} XP</div>
                </div>
              ))}
            </div>

            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {showModal && <LevelTableModal onClose={() => setShowModal(false)} current={data} />}
    </>
  );
}

function LevelTableModal({ onClose, current }) {
  const levels = [
    { tier: "bronz",  label: "Bronz Ajan",  range: "1–5",   startXP: 0,     color: "#cd7f32" },
    { tier: "gumus",  label: "Gümüş Ajan", range: "6–10",  startXP: 5000,  color: "#9e9e9e" },
    { tier: "altin",  label: "Altın Ajan",  range: "11–20", startXP: 15000, color: "#ffd700" },
    { tier: "platin", label: "Platin Ajan", range: "21+",   startXP: 50000, color: "#e5e4e2" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="animate-badgePop rounded-2xl bg-white border border-slate-200 shadow-[0_16px_48px_rgba(0,0,0,0.18)] w-[340px] overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-2xl px-5 py-3.5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Seviye Tablosu</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {levels.map((lv) => {
            const isActive = lv.tier === current.tier;
            return (
              <div key={lv.tier}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all ${isActive ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"}`}>
                <MedalSVG tier={lv.tier} size={36} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-bold ${isActive ? "text-white" : "text-slate-800"}`}>{lv.label}</div>
                  <div className={`text-[11px] ${isActive ? "text-slate-400" : "text-slate-500"}`}>Seviye {lv.range} · {lv.startXP === 0 ? "0 XP" : `${(lv.startXP / 1000).toFixed(0)}k XP`}'dan itibaren</div>
                </div>
                {isActive && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full uppercase">Aktif</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── PERFORMANCE CHARTS ──────────────────────── */
const CHART_TABS = [
  { key: "calls",    label: "Çağrı Sayısı" },
  { key: "duration", label: "Konuşma Süresi" },
  { key: "csat",     label: "CSAT" },
  { key: "missed",   label: "Cevapsız Oran" },
];

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 shadow-xl text-[11px]">
      <div className="text-slate-400 mb-1 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.stroke || "#1DB954" }} />
          <span className="text-white font-semibold">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function PerformanceCharts({ data }) {
  const [tab, setTab] = useState("calls");
  const [range, setRange] = useState(30);

  const slice = (arr) => arr.slice(-range);

  return (
    <div className="premium-card rounded-[1.5rem] bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-slate-900 flex items-center justify-between gap-2 flex-wrap relative border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        <span className="relative z-10 text-[10px] uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-emerald-400" /> Performans Grafikleri
        </span>
        <div className="relative z-10 flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-white/10 shadow-inner">
          {[7, 30, 90].map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`h-6 px-2.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${range === r ? "bg-emerald-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              {r}G
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        {CHART_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[10px] uppercase tracking-wide font-extrabold transition-all duration-300 border-b-[2px] -mb-px ${tab === t.key ? "border-emerald-500 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-3">
        {tab === "calls" && (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={slice(data.dailyCalls)} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v} çağrı`} />} cursor={{fill: '#f8fafc'}} />
              <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Hedef", position: "right", fontSize: 9, fill: "#f59e0b", fontWeight: "bold" }} />
              <Bar dataKey="count" fill="url(#callGrad)" radius={[4, 4, 0, 0]} maxBarSize={24}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "duration" && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={slice(data.avgDuration)} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[100, 'auto']} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickFormatter={fmtDur} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={fmtDur} />} />
              <ReferenceArea y1={180} y2={360} fill="#10b981" fillOpacity={0.06} />
              <Line dataKey="avgSeconds" type="monotone" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === "csat" && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={slice(data.csat)} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[2.5, 5]} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={(v) => `★ ${v}`} />} />
              <ReferenceLine y={4.0} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Hedef 4.0", position: "right", fontSize: 9, fill: "#f59e0b", fontWeight: "bold" }} />
              <Line dataKey="score" type="monotone" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === "missed" && (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={slice(data.missedRate)} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="missedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `%${Math.round(v * 100)}`} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={(v) => `%${Math.round(v * 100)}`} />} />
              <ReferenceLine y={0.1} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Max %10", position: "right", fontSize: 9, fill: "#f59e0b", fontWeight: "bold" }} />
              <Area dataKey="rate" type="monotone" stroke="#ef4444" strokeWidth={2.5} fill="url(#missedGrad)" dot={false} activeDot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── BADGE COLLECTION ────────────────────────── */
const ICONS_MAP = { PhoneCall, Zap, Trophy, Moon, ArrowUpRight, Flame, Sparkles, Activity, Shield, Crown, Target, Star, Award };

function BadgeCard({ badge, onClick }) {
  const earned = !!badge.earnedAt;
  const r = RARITY[badge.rarity] || RARITY.yaygın;
  const Icon = ICONS_MAP[badge.iconName] || Star;

  return (
    <button
      onClick={() => onClick(badge)}
      className={`relative h-full w-full rounded-[1.25rem] border flex flex-col items-center justify-center gap-1 p-1.5 transition-all duration-300
        ${earned
          ? `${r.border} bg-white hover:-translate-y-1 hover:shadow-xl ${badge.rarity === "efsane" ? "shadow-[0_0_15px_rgba(255,215,0,0.4)]" : "shadow-sm"}`
          : "border-slate-200 bg-slate-50/50 grayscale opacity-50 hover:opacity-70"
        }`}
    >
      {earned && badge.rarity === "efsane" && <div className="absolute inset-0 rounded-[1.25rem] premium-glow pointer-events-none"></div>}
      <Icon className={`h-6 w-6 ${earned ? r.color : "text-slate-400"}`} strokeWidth={1.5} />
      {earned && <span className="text-[9px] font-bold text-slate-700 text-center leading-tight truncate w-full px-1">{badge.name}</span>}
      {!earned && <span className="text-[13px] text-slate-400 font-medium">?</span>}
    </button>
  );
}

function BadgeModal({ badge, onClose }) {
  const earned = !!badge.earnedAt;
  const r = RARITY[badge.rarity] || RARITY.yaygın;
  const pct = badge.target > 0 ? Math.min(100, Math.round((badge.progress / badge.target) * 100)) : 0;
  const Icon = ICONS_MAP[badge.iconName] || Star;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-badgePop relative rounded-[1.5rem] bg-white shadow-2xl w-[320px] overflow-hidden border border-white/20"
           onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-[1.5rem] px-5 py-4 bg-slate-900 flex items-center justify-between border-b border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
          <span className="relative z-10 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rozet Detayı</span>
          <button onClick={onClose} className="relative z-10 text-slate-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4 relative">
          <div className={`p-4 rounded-2xl ${earned ? r.bg : "bg-slate-100"} ${!earned ? "grayscale opacity-50" : ""}`}>
            <Icon className={`h-12 w-12 ${earned ? r.color : "text-slate-400"}`} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h3 className="text-[18px] font-extrabold text-slate-800">{badge.name}</h3>
            <span className={`inline-block mt-2 text-[10px] font-bold px-3 py-1 rounded-full border ${r.bg} ${r.color} ${r.border}`}>{r.label.toLocaleUpperCase('tr-TR')}</span>
          </div>
          <p className="text-[13px] text-slate-500 text-center leading-relaxed px-2">{badge.description}</p>

          {!earned && badge.target > 0 && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                <span className="font-semibold">İlerleme</span>
                <span className="font-bold">{badge.progress} / {badge.target}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {earned && (
            <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 shadow-sm rounded-xl px-4 py-2.5 w-full text-center font-bold tracking-wide">
              KAZANILDI · {new Date(badge.earnedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
          {!earned && (
            <div className="mt-2 text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 w-full text-center font-medium">
              Henüz kazanılmadı
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeCollection({ badges }) {
  const [selected, setSelected] = useState(null);
  const earned = badges.filter((b) => b.earnedAt).length;

  return (
    <>
      <div className="premium-card rounded-[1.5rem] bg-white flex flex-col relative overflow-hidden">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-slate-900 flex items-center justify-between relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
          <span className="relative z-10 text-[10px] uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-emerald-400" /> Rozet Koleksiyonu
          </span>
          <span className="relative z-10 text-[11px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 font-bold">{earned}/{badges.length}</span>
        </div>
        <div className="p-3 flex-1 grid grid-cols-4 grid-rows-2 gap-2 bg-slate-50/30">
          {badges.map((b) => <BadgeCard key={b.id} badge={b} onClick={setSelected} />)}
        </div>
      </div>

      {selected && <BadgeModal badge={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ────────────────────────── QUEST + GOAL COMBINED PANEL ─────────────── */
const QUEST_ICONS = { calls: "PhoneCall", csat: "Star", speed: "Zap", streak: "Flame" };
const BAR_COLOR = (pct) => pct >= 90 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#94a3b8";

function QuestCountdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight - now) / 1000);
  });
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <span className="font-mono tabular-nums text-[11px] bg-slate-800/80 px-2 py-0.5 rounded-lg text-amber-400 font-bold border border-amber-400/20 shadow-inner">
      <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
      {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
    </span>
  );
}

function QuestCard({ quest }) {
  const [open, setOpen] = useState(false);
  const done = !!quest.completedAt;
  const pct = Math.min(100, Math.round((quest.current / quest.target) * 100));
  const barColor = done ? "#10b981" : BAR_COLOR(pct);
  const Icon = ICONS_MAP[QUEST_ICONS[quest.category]] || Target;

  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${done ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}>
      <button className="w-full text-left px-3 py-2.5 flex items-center gap-3 outline-none focus:ring-0" onClick={() => setOpen((o) => !o)}>
        <div className={`shrink-0 p-2 rounded-xl ${done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[12px] font-extrabold ${done ? "text-emerald-700" : "text-slate-800"}`}>{quest.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[11px] font-extrabold ${done ? "text-emerald-600" : "text-amber-500"}`}>+{quest.xpReward} XP</span>
              {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </div>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
          <div className="flex justify-between mt-1 font-medium">
            <span className="text-[10px] text-slate-500">{quest.current} / {quest.target}</span>
            <span className="text-[10px] text-slate-500">{pct}%</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
          <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">{quest.description}</p>
          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">{quest.hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalBar({ goal }) {
  const ratio = goal.lowerIsBetter ? goal.target / goal.current : goal.current / goal.target;
  const pct = Math.min(100, Math.round(ratio * 100));
  const color = goalColor(goal.current, goal.target, goal.lowerIsBetter);
  const status = goalStatus(goal.current, goal.target, goal.lowerIsBetter);

  const displayCurrent = goal.unit === "saniye" ? fmtDur(goal.current)
    : goal.unit === "%" ? `%${Math.round(goal.current * 100)}`
    : `${goal.current} ${goal.unit}`;
  const displayTarget = goal.unit === "saniye" ? fmtDur(goal.target)
    : goal.unit === "%" ? `%${Math.round(goal.target * 100)}`
    : `${goal.target} ${goal.unit}`;

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-3.5 py-3 transition-all duration-300 hover:shadow-sm hover:border-slate-300">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[12px] font-extrabold text-slate-800">{goal.name}</span>
        <span className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label.toLocaleUpperCase('tr-TR')}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5 shadow-inner">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        <span className="font-extrabold tracking-wide" style={{ color }}>{displayCurrent}</span>
        <span className="opacity-80">Hedef: <span className="font-bold text-slate-700">{displayTarget}</span></span>
      </div>
    </div>
  );
}

function QuestGoalPanel({ quests, goals }) {
  const [tab, setTab] = useState("quests");
  const doneQuests = quests.filter((q) => q.completedAt).length;

  return (
    <div className="premium-card rounded-[1.5rem] bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-slate-900 flex items-center justify-between relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        {/* Tab switcher */}
        <div className="relative z-10 flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setTab("quests")}
            className={`flex items-center gap-1.5 h-6 px-3 rounded-lg text-[10px] font-bold transition-all duration-200 ${tab === "quests" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Target className="h-3 w-3" />
            Görevler
            <span className={`text-[9px] font-black px-1 py-0.5 rounded ${tab === "quests" ? "bg-white/20 text-white" : "bg-emerald-400/20 text-emerald-400"}`}>{doneQuests}/{quests.length}</span>
          </button>
          <button
            onClick={() => setTab("goals")}
            className={`flex items-center gap-1.5 h-6 px-3 rounded-lg text-[10px] font-bold transition-all duration-200 ${tab === "goals" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Activity className="h-3 w-3" />
            Hedefler
          </button>
        </div>
        {/* Right side: countdown for quests, "Bu hafta" for goals */}
        <div className="relative z-10">
          {tab === "quests"
            ? <QuestCountdown />
            : <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2.5 py-1 rounded-full border border-white/10">Bu hafta</span>
          }
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 bg-slate-50/30 flex-1">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] text-sky-800 leading-relaxed">
          Hedefler yalnızca Admin/Supervisor tarafından atanır. Personel bu hedefleri görüntüler ve takip eder.
        </div>
        {tab === "quests"
          ? quests.map((q) => <QuestCard key={q.id} quest={q} />)
          : goals.map((g) => <GoalBar key={g.id} goal={g} />)
        }
      </div>
    </div>
  );
}

function XPMovementPanel({ rows }) {
  return (
    <div className="premium-card rounded-[1.5rem] bg-white flex flex-col relative overflow-hidden">
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-slate-900 flex items-center justify-between relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        <span className="relative z-10 text-[10px] uppercase tracking-widest text-slate-300 font-bold">XP Hareket Geçmişi</span>
        <span className="relative z-10 text-[10px] text-slate-400">Son 30 gün</span>
      </div>
      <div className="p-3 bg-slate-50/30">
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="grid grid-cols-[90px_70px_1fr_110px] px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Tarih</span>
            <span className="text-right">XP</span>
            <span>Sebep</span>
            <span className="text-right">Referans</span>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[90px_70px_1fr_110px] px-3 py-2.5 text-[11px] text-slate-700">
                <span className="text-slate-500">{new Date(row.date).toLocaleDateString("tr-TR")}</span>
                <span className={`text-right font-bold ${row.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {row.amount >= 0 ? `+${row.amount}` : row.amount}
                </span>
                <span>{row.reason}</span>
                <span className="text-right text-slate-500 font-mono">{row.ref}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── LEADERBOARD TABLE ──────────────────────── */
const RANK_STYLES = {
  1: { bg: "bg-amber-50/50",  border: "border-amber-300",  num: "🥇" },
  2: { bg: "bg-slate-100/50", border: "border-slate-300",  num: "🥈" },
  3: { bg: "bg-orange-50/50", border: "border-orange-300", num: "🥉" },
};

const TREND_ICONS = {
  up:   <TrendingUp   className="h-3.5 w-3.5 text-emerald-500 drop-shadow-sm" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-rose-500 drop-shadow-sm" />,
  same: <Minus        className="h-3.5 w-3.5 text-slate-400" />,
};

function LeaderboardTable({ entries }) {
  const [period, setPeriod] = useState("week");
  const currentUser = entries.find((e) => e.isCurrentUser);

  return (
    <div className="premium-card rounded-[1.5rem] bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-slate-900 flex items-center justify-between flex-wrap gap-2 relative border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
        <span className="relative z-10 text-[10px] uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-emerald-400" /> Ekip Sıralaması
        </span>
        <div className="relative z-10 flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-xl border border-white/10 shadow-inner">
          {[["week","Bu Hafta"], ["month","Bu Ay"], ["all","Tüm Zamanlar"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`h-6 px-2.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${period === k ? "bg-emerald-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[36px_1fr_90px_90px_70px_70px] text-[9px] uppercase tracking-widest text-slate-400 font-bold px-4 py-2.5 border-b border-slate-200 bg-slate-50/80">
        <span>#</span>
        <span>Ajan</span>
        <span className="text-right">Seviye</span>
        <span className="text-right">XP</span>
        <span className="text-right">Çağrı</span>
        <span className="text-right">CSAT</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 bg-white">
        {entries.map((entry, i) => {
          const rankStyle = RANK_STYLES[entry.rank] || {};
          const isMine = entry.isCurrentUser;
          return (
            <div
              key={entry.rank}
              className={`grid grid-cols-[36px_1fr_90px_90px_70px_70px] items-center px-4 py-2.5 transition-all duration-300
                ${isMine ? "bg-emerald-50/80 hover:bg-emerald-100/50" : rankStyle.bg ? `${rankStyle.bg} hover:brightness-95` : "hover:bg-slate-50"}
                ${isMine ? "border-l-[3px] border-l-emerald-500" : "border-l-[3px] border-l-transparent"}`}
              style={{ animationDelay: `${i * 50}ms`, animation: "rowIn 400ms ease-out both" }}
            >
              {/* Rank */}
              <span className="text-[15px] flex items-center justify-center w-5 h-5">
                {rankStyle.num || <span className="text-[11px] font-extrabold text-slate-400 w-full text-center">{entry.rank}</span>}
              </span>

              {/* Name */}
              <div className="min-w-0 pl-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[12px] font-extrabold truncate ${isMine ? "text-emerald-700" : "text-slate-800"}`}>
                    {entry.displayName}
                  </span>
                  {isMine && (
                    <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">SEN</span>
                  )}
                </div>
              </div>

              {/* Level */}
              <span className="text-right text-[11px] flex items-center justify-end gap-1">
                <MedalSVG tier={(() => { const w = typeof entry.levelName === "string" ? entry.levelName.split(" ")[0].toLocaleLowerCase('tr-TR') : "bronz"; return { "gümüş": "gumus", "altın": "altin", "platin": "platin", "bronz": "bronz" }[w] || "bronz"; })()} size={16} />
                <span className="text-slate-600 font-bold">{entry.level}</span>
              </span>

              {/* Weekly XP */}
              <div className="flex items-center justify-end gap-1">
                <span className="text-[11px] font-black text-slate-700 tabular-nums">{entry.weeklyXP.toLocaleString("tr-TR")}</span>
                {TREND_ICONS[entry.xpTrend]}
              </div>

              {/* Call count */}
              <span className="text-right text-[11px] text-slate-600 font-bold tabular-nums">{entry.callCount}</span>

              {/* CSAT */}
              <span className={`text-right text-[11px] font-black tabular-nums flex items-center justify-end gap-1 ${entry.csatAverage >= 4.5 ? "text-emerald-600" : entry.csatAverage >= 4.0 ? "text-slate-700" : "text-amber-600"}`}>
                <Star className="w-3 h-3 fill-current" /> {entry.csatAverage.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sticky current user footer */}
      {currentUser && (
        <div className="border-t border-emerald-200/60 px-4 py-3 bg-emerald-50/90 flex items-center gap-2.5 backdrop-blur-sm relative z-10">
          <Award className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Senin Sıralaman:</span>
          <span className="text-[14px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-sm">#{currentUser.rank}</span>
          <span className="text-[11px] font-extrabold text-emerald-600 ml-auto bg-emerald-100/50 px-2.5 py-1 rounded-full border border-emerald-200/50">{currentUser.weeklyXP.toLocaleString("tr-TR")} XP BU HAFTA</span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── MAIN PAGE ────────────────────────────── */
export default function Performance() {
  const { user } = useAuth();

  const leaderboard = useMemo(() => {
    return mockLeaderboard.map((entry) =>
      entry.isCurrentUser && user?.full_name
        ? { ...entry, displayName: user.full_name }
        : entry
    );
  }, [user]);

  return (
    <div className="p-3 flex flex-col gap-3 min-h-0">
      <style>{PAGE_STYLES}</style>

      {/* ── Seviye Paneli ── */}
      <LevelPanel data={mockLevel} />

      {/* ── Orta satır: Grafikler + Rozetler ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <PerformanceCharts data={mockCharts} />
        <BadgeCollection badges={mockBadges} />
      </div>

      {/* ── Alt satır: Görevler/Hedefler (tab) + Sıralama ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[5fr_7fr] gap-3">
        <QuestGoalPanel quests={mockQuests} goals={mockGoals} />
        <LeaderboardTable entries={leaderboard} />
      </div>

      {/* ── XP hareket şeffaflığı ── */}
      <XPMovementPanel rows={mockXPMovements} />
    </div>
  );
}
