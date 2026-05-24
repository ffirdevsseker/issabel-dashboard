import { useEffect, useState, useRef } from "react";
import {
  Phone, PhoneMissed, Clock, TrendingUp,
  CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Eye, EyeOff, PhoneCall, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { agentApi, supervisorApi, dashboardApi } from "@/services/api";

/* ─── Yardımcılar ─────────────────────────────────────────────────────────── */

const initials = (name = "") => {
  const t = name.trim().split(/\s+/).filter(Boolean);
  if (!t.length) return "?";
  if (t.length === 1) return t[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${t[0][0]}${t[t.length - 1][0]}`.toLocaleUpperCase("tr-TR");
};

const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}sn`;
  return `${m}dk ${r}sn`;
};

const MOCK_HOURLY = [
  { saat: "09:00", toplam: 4 },
  { saat: "10:00", toplam: 9 },
  { saat: "11:00", toplam: 14 },
  { saat: "12:00", toplam: 7 },
  { saat: "13:00", toplam: 5 },
  { saat: "14:00", toplam: 11 },
  { saat: "15:00", toplam: 16 },
  { saat: "16:00", toplam: 12 },
  { saat: "17:00", toplam: 8 },
];

/* ─── 1. KPI Kartları ─────────────────────────────────────────────────────── */

function KpiCard({ title, value, icon: Icon, accent, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-[22px] font-black text-slate-800 leading-tight tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

/* ─── 2. Saatlik Bar Chart ────────────────────────────────────────────────── */

const CustomBar = (props) => {
  const { x, y, width, height } = props;
  const r = Math.min(6, width / 2);
  return (
    <g>
      <path
        d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
        fill="#3b82f6"
        fillOpacity={0.85}
      />
    </g>
  );
};

function HourlyChart({ data }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-[13px] font-bold text-white">Günün Özeti</h3>
          <span className="text-[10px] text-slate-400 font-medium">Saatlik çağrı dağılımı</span>
        </div>
      </div>

      {/* chart */}
      <div className="flex-1 px-4 pt-4 pb-3">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="saat"
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.slice(0, 2) + "h"}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
              formatter={(v) => [`${v} çağrı`, "Toplam"]}
              labelFormatter={(l) => `Saat ${l}`}
            />
            <Bar dataKey="toplam" shape={<CustomBar />} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── 3. Kaçırılan Aramalar ──────────────────────────────────────────────── */

const MISSED_PER_PAGE = 5;

function MissedCallsList({ callbacks, onCall }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(callbacks.length / MISSED_PER_PAGE));
  const visible    = callbacks.slice(page * MISSED_PER_PAGE, (page + 1) * MISSED_PER_PAGE);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <h3 className="text-[13px] font-bold text-white">Kaçırılan Aramalar</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
          {callbacks.length}
        </span>
      </div>

      {/* list — her zaman 5 satır yüksekliği kadar yer kaplar */}
      <div className="h-[220px] overflow-y-auto">
        {callbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 gap-2">
            <PhoneMissed className="h-8 w-8 opacity-30" />
            <p className="text-[13px]">Bugün kaçırılan arama yok</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((cb) => (
              <li key={cb.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <div className="h-8 w-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <PhoneMissed className="h-3.5 w-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-700 truncate">
                    {cb.name || "Bilinmeyen"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {cb.time} · {cb.age}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCall?.(cb)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 transition-all active:scale-95 shrink-0"
                >
                  <PhoneCall className="h-3 w-3" />
                  Ara
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* sayfalama — her zaman göster */}
      {(
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`h-6 min-w-[24px] rounded-md text-[11px] font-bold transition-all active:scale-95 px-1.5
                  ${i === page
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-100"
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── 4. Görev Takibi ────────────────────────────────────────────────────── */

const PRIORITY_COLORS = {
  high:   { dot: "bg-red-400",    badge: "bg-red-50 text-red-600 border-red-100",    label: "Yüksek"  },
  medium: { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-100", label: "Orta" },
  low:    { dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-600 border-blue-100",  label: "Düşük"  },
};

function TaskTracking({ priorities }) {
  const total     = priorities.length;
  const completed = priorities.filter((p) => p.status === "completed").length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <h3 className="text-[13px] font-bold text-white">Görev Takibi</h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-300">
          {completed}/{total} tamamlandı
        </span>
      </div>

      {/* progress bar */}
      <div className="px-5 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500 font-semibold">İlerleme</span>
          <span className="text-[12px] font-black text-slate-700">%{pct}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* list — kalan alanı doldur, gerekirse scroll */}
      {priorities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">
          Görev bulunmuyor.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {priorities.map((p) => {
            const clr = PRIORITY_COLORS[p.priority] ?? PRIORITY_COLORS.low;
            const done = p.status === "completed";
            return (
              <li key={p.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold leading-snug ${done ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {p.title}
                  </p>
                  {p.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.description}</p>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${clr.badge}`}>
                  {clr.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── 5. Puan Tablosu ────────────────────────────────────────────────────── */

const BADGE_EMOJIS = { 1: "🥇", 2: "🥈", 3: "🥉" };

const TOP3 = {
  1: { card: "bg-amber-50",    avatar: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white", bar: "bg-amber-400",  name: "text-amber-800" },
  2: { card: "bg-slate-50",    avatar: "bg-gradient-to-br from-slate-500 to-slate-600 text-white",  bar: "bg-slate-400",  name: "text-slate-700" },
  3: { card: "bg-orange-50/60",avatar: "bg-gradient-to-br from-orange-400 to-amber-500 text-white", bar: "bg-orange-400", name: "text-orange-800" },
};

function TeamLeaderboard() {
  const [showNames, setShowNames]   = useState(true);
  const [board, setBoard]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const scrollRef                   = useRef(null);

  useEffect(() => {
    supervisorApi.getGamification()
      .then((res) => setBoard(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBoard([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    scrollRef.current.scrollTo({ left: scrollLeft + (dir === "left" ? -clientWidth : clientWidth), behavior: "smooth" });
  };

  const rows = board.map((r, i) => ({
    rank:   r.rank ?? i + 1,
    name:   r.name ?? r.ad_soyad ?? "—",
    points: Number(r.points ?? r.xp ?? 0),
    calls:  Number(r.calls ?? 0),
    isMe:   r.isMe ?? false,
  }));

  const maxXp = rows[0]?.points || 1;
  const me    = rows.find((r) => r.isMe);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <h3 className="text-[13px] font-bold text-white">Puan Tablosu</h3>
          </div>
          {me && (
            <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2 pr-3 py-1">
              <span className="text-sm">🏅</span>
              <span className="text-[11px] font-black text-white">#{me.rank}</span>
              <span className="text-[10px] text-amber-400 font-bold">
                {(maxXp - me.points).toLocaleString("tr-TR")} XP kaldı
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNames((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-all"
          >
            {showNames ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showNames ? "Gizle" : "Göster"}
          </button>
        </div>
      </div>

      {/* skeleton */}
      {loading && (
        <div className="flex gap-2 p-4 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[120px] rounded-xl bg-slate-50 p-3 flex flex-col items-center gap-2 animate-pulse">
              <div className="h-4 w-4 rounded-full bg-slate-200" />
              <div className="h-10 w-10 rounded-2xl bg-slate-200" />
              <div className="h-2 w-14 rounded bg-slate-200" />
              <div className="h-3 w-10 rounded bg-slate-200" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {/* empty */}
      {!loading && rows.length === 0 && (
        <div className="py-10 text-center text-slate-400 text-[13px]">
          Sıralama henüz mevcut değil.
        </div>
      )}

      {/* slider */}
      {!loading && rows.length > 0 && (
        <div className="relative group">
          <button onClick={() => scroll("left")} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll("right")} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95">
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
          >
            {rows.map((row) => {
              const t3        = TOP3[row.rank];
              const cardBg    = row.isMe ? "bg-amber-50/30" : t3 ? t3.card : "bg-white";
              const avatarBg  = row.isMe ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white" : t3 ? t3.avatar : "bg-slate-100 text-slate-600";
              const barColor  = row.isMe ? "bg-amber-400" : t3 ? t3.bar : "bg-slate-200";
              const nameColor = row.isMe ? "text-amber-900 font-black" : t3 ? t3.name : "text-slate-600";
              const barWidth  = Math.round((row.points / maxXp) * 100);

              return (
                <div
                  key={row.rank}
                  className={`flex-none w-[calc(100%/7)] min-w-[130px] flex flex-col items-center gap-2 px-3 py-4 border-r border-slate-100 last:border-r-0 ${cardBg}`}
                  style={{ scrollSnapAlign: "start" }}
                >
                  {/* rank badge */}
                  <div className="h-5 flex items-center justify-center">
                    {BADGE_EMOJIS[row.rank]
                      ? <span className="text-lg">{BADGE_EMOJIS[row.rank]}</span>
                      : <span className={`text-[11px] font-black ${row.isMe ? "text-amber-500" : "text-slate-300"}`}>#{row.rank}</span>
                    }
                  </div>

                  {/* avatar */}
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-[14px] flex items-center justify-center text-[13px] font-black ${avatarBg}`}>
                      {initials(showNames ? row.name : `T${row.rank}`)}
                    </div>
                    {row.isMe && (
                      <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* name */}
                  <p className={`text-[11px] truncate w-full text-center leading-tight ${nameColor}`}>
                    {showNames ? row.name.split(" ")[0] : `Temsilci ${row.rank}`}
                  </p>

                  {/* xp */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <span className={`text-[14px] font-black tabular-nums ${row.isMe ? "text-amber-600" : "text-slate-600"}`}>
                      {row.points.toLocaleString("tr-TR")}
                      <span className="text-[9px] text-slate-400 ml-0.5">XP</span>
                    </span>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>

                  {/* calls */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-bold tabular-nums">{row.calls}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Ana Sayfa ──────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [stats,     setStats]     = useState(null);
  const [hourly,    setHourly]    = useState(MOCK_HOURLY);
  const [callbacks, setCallbacks] = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [refreshAt, setRefreshAt] = useState(0);

  /* veri çek */
  useEffect(() => {
    // KPI
    agentApi.getTodayStats()
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));

    // Saatlik grafik — admin/supervisor endpoint'i, ajan için 403 dönerse mock kalır
    dashboardApi.getTrafficHourly()
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        if (data.length > 0) setHourly(data);
      })
      .catch(() => { /* mock kalır */ });

    // Kaçırılan aramalar
    agentApi.getCallbackList()
      .then((r) => setCallbacks(Array.isArray(r.data) ? r.data.slice(0, 10) : []))
      .catch(() => setCallbacks([]));

    // Görevler
    agentApi.getPriorities()
      .then((r) => setTasks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTasks([]));
  }, [refreshAt]);

  /* KPI değerleri */
  const totalCalls  = stats?.total_calls          ?? 0;
  const answerRate  = stats ? (totalCalls > 0 ? Math.round((stats.answered_calls / totalCalls) * 100) : 0) : 0;
  const avgTalk     = stats ? fmtDuration(stats.avg_duration_seconds) : "—";
  const missed      = stats?.my_no_answer_calls     ?? 0;

  return (
    <div className="flex flex-col gap-5 p-5 max-w-screen-2xl mx-auto">

      {/* ── 1. KPI Kartları ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Bugünkü Çağrılar"
          value={totalCalls}
          icon={Phone}
          accent="bg-gradient-to-br from-blue-500 to-blue-600"
          sub={stats ? `${stats.answered_calls} cevaplandı` : undefined}
        />
        <KpiCard
          title="Yanıt Oranı"
          value={`%${answerRate}`}
          icon={TrendingUp}
          accent="bg-gradient-to-br from-emerald-500 to-emerald-600"
          sub={totalCalls > 0 ? `${stats?.answered_calls ?? 0} / ${totalCalls} çağrı` : undefined}
        />
        <KpiCard
          title="Ort. Konuşma Süresi"
          value={avgTalk}
          icon={Clock}
          accent="bg-gradient-to-br from-violet-500 to-violet-600"
          sub={stats?.total_duration_seconds ? fmtDuration(stats.total_duration_seconds) + " toplam" : undefined}
        />
        <KpiCard
          title="Cevapsız"
          value={missed}
          icon={PhoneMissed}
          accent="bg-gradient-to-br from-rose-500 to-rose-600"
          sub={missed > 0 ? "Geri arama gerekiyor" : "Tümü cevaplandı"}
        />
      </div>

      {/* ── 2 + 3. Günün Özeti & Kaçırılan Aramalar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3">
          <HourlyChart data={hourly} />
        </div>
        <div className="lg:col-span-2">
          <MissedCallsList
            callbacks={callbacks}
            onCall={(cb) => {
              /* Softphone entegrasyonu buraya gelecek */
              console.log("Aranıyor:", cb);
            }}
          />
        </div>
      </div>

      {/* ── 4. Görev Takibi ── */}
      <TaskTracking priorities={tasks} />

      {/* ── 5. Puan Tablosu ── */}
      <TeamLeaderboard />

    </div>
  );
}
