import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneMissed, Clock, TrendingUp, TrendingDown, Minus, X, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Target, Trophy, Eye, EyeOff, Zap, CheckCircle2, Timer } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useQueueStatus } from "@/context/QueueStatusContext";
import { cdrApi, supervisorApi, agentApi } from "@/services/api";



const initials = (name = "") => {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentApi.getTodayStats()
      .then((res) => setStats(res.data))
      .catch(() => cdrApi.getStats(true).then((res) => setStats(res.data)))
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  };

  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const missedTotal = stats
    ? (stats.no_answer_calls || 0) + (stats.busy_calls || 0) + (stats.failed_calls || 0)
    : 0;
  const answeredTotal = stats ? Math.max(0, (stats.total_calls || 0) - missedTotal) : 0;

  const kpiCards = stats ? [
    {
      id: "calls",
      title: "Bugünkü Çağrılar",
      value: stats.total_calls,
      sub: "Toplam",
      diff: stats.total_calls > 0 ? 1 : 0,
      icon: Phone,
      color: "blue",
      trend: [],
      route: "/calls",
    },
    {
      id: "answered",
      title: "Cevaplanan Çağrı",
      value: answeredTotal,
      sub: "Başarıyla yanıtlandı",
      diff: answeredTotal > 0 ? 1 : 0,
      icon: Phone,
      color: "green",
      trend: [],
      route: "/calls",
    },
    {
      id: "missed",
      title: "Cevapsız Çağrı",
      value: missedTotal,
      sub: "Toplam",
      diff: -missedTotal,
      icon: PhoneMissed,
      color: missedTotal === 0 ? "green" : missedTotal >= 3 ? "red" : "orange",
      trend: [],
      route: "/calls",
    },
    {
      id: "avg",
      title: "Ort. Görüşme Süresi",
      value: `${Math.floor(stats.avg_duration_seconds / 60)}d ${Math.round(stats.avg_duration_seconds % 60)}s`,
      sub: "Hedef: 5d 00s",
      diff: stats.avg_duration_seconds < 300 ? 1 : -1,
      icon: Clock,
      color: stats.avg_duration_seconds <= 300 ? "green" : "orange",
      trend: [],
      route: "/performance",
    },
  ] : [];

  return (
    <div className="p-4 w-full">
      <div className="flex flex-col gap-4">
        {/* Üst satır: Sol (KPI+Kuyruk) + Sağ (Geri Arama + Öncelikler) */}
        <div className="flex gap-4 items-stretch min-h-0">
          {/* Sol: KPI + Kuyruk */}
          <div className="flex flex-col gap-4 flex-[3_3_0%] min-w-[380px]">
            <div className="grid grid-cols-4 gap-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : kpiCards.map((card) => (
                    <KPICard key={card.id} card={card} onClick={() => navigate(card.route)} />
                  ))
              }
            </div>
            <div className="w-full">
              <QueueWidget />
            </div>
          </div>

          {/* Sağ: Geri Arama + Günün Öncelikleri yan yana */}
          <div className="flex gap-3 flex-[2_2_0%] min-w-0">
            <div className="w-[280px] shrink-0">
              <CallbackListWidget />
            </div>
            <div className="flex-1 min-w-0">
              <DailyPrioritiesWidget />
            </div>
          </div>
        </div>

        {/* Alt satır: Ekip Sıralaması tam genişlikte yatay */}
        <div className="w-full">
          <TeamLeaderboardWidget />
        </div>
      </div>
    </div>
  );
}

/* ── GERI ARAMA LISTESI ───────────────────────────────────── */
function CallbackListWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const loadCallbacks = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await agentApi.getCallbackList();
      setItems(Array.isArray(res.data) ? res.data : []);
      setLastSynced(new Date());
    } catch {
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCallbacks();
    const timer = setInterval(() => {
      loadCallbacks({ silent: true });
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  const criticalCount = items.filter((item) => item.durum === "cevaplanmadi").length;
  const busyCount     = items.filter((item) => item.durum === "mesgul").length;

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header - dark premium */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
                Geri Arama Listesi
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-white leading-tight">CDR Cevapsız Takibi</h3>
          </div>
          <button
            type="button"
            onClick={() => loadCallbacks({ silent: true })}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all"
            aria-label="Listeyi yenile"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 4-stat mini row */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-xl bg-white/8 border border-white/10 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">Bekleyen</div>
            <div className="text-sm font-bold text-white tabular-nums">{items.length}</div>
          </div>
          <div className="rounded-xl bg-red-500/20 border border-red-500/30 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-red-400 mb-0.5">Cevapsız</div>
            <div className="text-sm font-bold text-red-300 tabular-nums">{criticalCount}</div>
          </div>
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/25 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-amber-400 mb-0.5">Meşgul</div>
            <div className="text-sm font-bold text-amber-300 tabular-nums">{busyCount}</div>
          </div>
          <div className="rounded-xl bg-white/8 border border-white/10 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">Senkron</div>
            <div className="text-sm font-bold text-white tabular-nums">
              {lastSynced
                ? lastSynced.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                : "--:--"}
            </div>
          </div>
        </div>
      </div>

      {/* List area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/40">
        {loading && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-700">Tüm çağrılar yanıtlandı</div>
            <p className="text-xs text-slate-400">Yeni cevapsız çağrılar burada görünecek.</p>
          </div>
        )}

        {!loading && items.map((item) => {
          const isNO   = item.durum === "cevaplanmadi";
          const isBUSY = item.durum === "mesgul";

          return (
            <div
              key={item.id}
              className="group relative flex items-center gap-3 px-4 py-3 hover:bg-white transition-colors duration-150"
            >
              {/* Left priority stripe */}
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 rounded-r-full transition-all duration-200 ${
                isNO ? "bg-red-400" : isBUSY ? "bg-amber-400" : "bg-blue-300"
              }`} />

              {/* Avatar */}
              <div className={`h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${
                isNO
                  ? "bg-red-100 text-red-700"
                  : isBUSY
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-50 text-blue-700"
              }`}>
                <PhoneMissed className="h-4 w-4" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-semibold text-slate-800 truncate">{item.name}</span>
                  <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                    isNO
                      ? "bg-red-100 text-red-600"
                      : isBUSY
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-600"
                  }`}>
                    {item.detail}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="font-mono">{item.time}</span>
                  {item.kategori && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span className="truncate">{item.kategori}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Age badge — how long ago */}
              <div className={`shrink-0 text-center min-w-[46px] px-2 py-1 rounded-xl text-[10px] font-bold ${
                isNO
                  ? "bg-red-50 text-red-500"
                  : isBUSY
                    ? "bg-amber-50 text-amber-600"
                    : "bg-slate-50 text-slate-500"
              }`}>
                {item.age}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer status bar */}
      {!loading && items.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{items.length} kayıt bekliyor</span>
          <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${criticalCount > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${criticalCount > 0 ? "bg-red-400" : "bg-emerald-400"} animate-pulse`} />
            {criticalCount > 0 ? `${criticalCount} kritik bekliyor` : "Normal durum"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── KUYRUK DURUMU ─────────────────────────────────────────── */
function QueueWidget() {
  const WAITING_CRITICAL_THRESHOLD = 10;
  const BUSINESS_START_HOUR = 8;
  const BUSINESS_END_HOUR = 17;
  const { queue, connectionState, lastUpdatedAt, clock } = useQueueStatus();
  const [businessHourSeries, setBusinessHourSeries] = useState(
    Array.from({ length: BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1 }, (_, i) => {
      const hour = BUSINESS_START_HOUR + i;
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        waiting: 0,
      };
    })
  );
  const visibleHourPoints = 6;
  const [chartStartIndex, setChartStartIndex] = useState(
    Math.max((BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1) - visibleHourPoints, 0)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const isAlert = queue.waiting >= WAITING_CRITICAL_THRESHOLD;

  useEffect(() => {
    if (!lastUpdatedAt) return;

    const updateHour = new Date(lastUpdatedAt).getHours();
    if (updateHour >= BUSINESS_START_HOUR && updateHour <= BUSINESS_END_HOUR) {
      setBusinessHourSeries((prev) =>
        prev.map((point) =>
          point.hour === updateHour ? { ...point, waiting: queue.waiting } : point
        )
      );
    }
  }, [lastUpdatedAt, queue.waiting]);

  useEffect(() => {
    if (!isAlert) return;
    const id = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }, 10000);
    return () => clearInterval(id);
  }, [isAlert]);

  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}d ${s}s` : `${s}s`;
  };

  const relativeLastUpdate = () => {
    if (!lastUpdatedAt) return "henüz veri yok";
    const diffSec = Math.max(0, Math.floor((clock - new Date(lastUpdatedAt).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec} sn önce`;
    return `${Math.floor(diffSec / 60)} dk önce`;
  };

  const isConnected = connectionState !== "disconnected";
  const ringTone = !isConnected
    ? "from-slate-200 to-slate-100"
    : isAlert
      ? "from-red-200 to-red-100"
      : "from-emerald-200 to-emerald-100";

  const centerTone = !isConnected
    ? "from-slate-700 to-slate-600"
    : isAlert
      ? "from-red-700 to-red-600"
      : "from-emerald-700 to-emerald-600";

  const arcTone = !isConnected
    ? "border-slate-200"
    : isAlert
      ? "border-red-200"
      : "border-slate-300";

  const maxChartStartIndex = Math.max(businessHourSeries.length - visibleHourPoints, 0);
  const visibleSeries = businessHourSeries.slice(
    chartStartIndex,
    chartStartIndex + visibleHourPoints
  );

  const counterTextSize = queue.waiting > 99 ? "text-4xl" : queue.waiting > 9 ? "text-5xl" : "text-6xl";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsModalOpen(true);
          }
        }}
        className={`
          h-full bg-white rounded-2xl border p-5 flex flex-col gap-3
          transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md
          ${isAlert ? "border-red-200" : "border-slate-200"}
          ${shake ? "animate-[shake_0.6s_ease-in-out]" : ""}
        `}
      >

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Kuyruk Durumu
          </span>
          <span className={`
            flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
            ${connectionState === "disconnected"
              ? "bg-slate-100 text-slate-600"
              : isAlert
                ? "bg-red-100 text-red-600"
                : "bg-emerald-100 text-emerald-600"
            }
          `}>
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${connectionState === "disconnected" ? "bg-slate-500" : isAlert ? "bg-red-500" : "bg-emerald-500"}`} />
            {connectionState === "disconnected" ? "Bağlantı Yok" : isAlert ? "Kritik" : queue.waiting === 0 ? "Boş" : "Canlı"}
          </span>
        </div>

        <div className="grid gap-2 grid-cols-[175px_1fr] items-stretch">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 h-[212px] flex items-center justify-center">
            <div className="relative h-[132px] w-[132px]">
              <span className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-50 to-slate-100/70" />
              <span className={`absolute inset-0 rounded-full border-2 ${arcTone} border-b-transparent`} />
              <span className={`absolute inset-[8px] rounded-full border ${arcTone} border-r-transparent rotate-[20deg]`} />
              <span className={`absolute inset-[16px] rounded-full border ${arcTone} border-l-transparent -rotate-[18deg]`} />

              {isConnected && (
                <span className={`absolute inset-[4px] rounded-full border border-transparent ${isAlert ? "border-t-red-300/70" : "border-t-emerald-300/70"} animate-[spin_8s_linear_infinite]`} />
              )}

              <span className={`absolute left-1/2 top-[18px] -translate-x-1/2 h-12 w-24 rounded-full blur-xl ${isAlert ? "bg-red-300/70" : "bg-emerald-300/70"}`} />
              <span className={`absolute inset-[24px] rounded-full bg-gradient-to-br ${ringTone} opacity-75`} />
              <span className="absolute inset-[24px] rounded-full ring-1 ring-white/70" />

              <div className={`absolute inset-[31px] rounded-full bg-gradient-to-b ${centerTone} shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-10px_14px_rgba(0,0,0,0.18),0_10px_20px_rgba(15,23,42,0.22)] flex items-center justify-center text-white`}>
                <div className={`${counterTextSize} font-extrabold leading-none tracking-tight tabular-nums [text-shadow:0_2px_6px_rgba(0,0,0,0.28)]`}>{queue.waiting}</div>
              </div>

              {isConnected && (
                <span className={`absolute right-[2px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full ring-2 ring-white shadow ${isAlert ? "bg-red-500" : "bg-emerald-500"} animate-pulse`} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 h-[212px] flex flex-col">
            <div className="flex items-center justify-end mb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setChartStartIndex((prev) => Math.max(prev - 1, 0));
                  }}
                  disabled={chartStartIndex === 0}
                  className="h-6 w-6 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Sağa kaydır"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setChartStartIndex((prev) => Math.min(prev + 1, maxChartStartIndex));
                  }}
                  disabled={chartStartIndex >= maxChartStartIndex}
                  className="h-6 w-6 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Sola kaydır"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visibleSeries} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="queue-hours-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isAlert ? "#ef4444" : "#10b981"} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={isAlert ? "#ef4444" : "#10b981"} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 15]}
                    ticks={[0, 2, 5, 10, 15]}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickMargin={6}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    width={32}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} çağrı`, "Bekleyen"]}
                    labelFormatter={(label) => `${label} saat`}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    }}
                  />
                  <Area
                    type="linear"
                    dataKey="waiting"
                    stroke={isAlert ? "#ef4444" : "#10b981"}
                    strokeWidth={2.2}
                    fill="url(#queue-hours-grad)"
                    dot={{ r: 2.5, strokeWidth: 0, fill: isAlert ? "#ef4444" : "#10b981" }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[11px] text-slate-500">En uzun bekleyen</div>
            <div className={`font-semibold ${isAlert ? "text-red-600" : "text-slate-800"}`}>{fmt(queue.longestWait)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[11px] text-slate-500">Ortalama bekleme</div>
            <div className="font-semibold text-slate-800">{fmt(queue.avgWait)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[11px] text-slate-500">Tahmini sıraya alma</div>
            <div className="font-semibold text-slate-800">{fmt(queue.estimatedPickup)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[11px] text-slate-500">Son güncelleme</div>
            <div className="font-semibold text-slate-700">{relativeLastUpdate()}</div>
          </div>
        </div>

        {/* Uyarı */}
        {isAlert && connectionState !== "disconnected" && (
          <div className="flex items-center gap-2 bg-red-100 text-red-700 text-xs font-medium px-3 py-2 rounded-xl">
            <span>⚠</span>
            <span>Kritik kuyruk seviyesi aşıldı ({WAITING_CRITICAL_THRESHOLD}+)</span>
          </div>
        )}

        {/* Boş kuyruk */}
        {queue.waiting === 0 && connectionState !== "disconnected" && (
          <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl text-center">
            Kuyruk boş, mola için iyi zaman!
          </div>
        )}

        {/* Bağlantı kesik */}
        {connectionState === "disconnected" && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-center">
            Kuyruk verisi alınamıyor, son güncelleme: {relativeLastUpdate()}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 group-hover:text-slate-500 transition-colors">
          <span className="h-px flex-1 bg-slate-100" />
          <span>Detay için tıklayın</span>
          <span className="h-px flex-1 bg-slate-100" />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Kuyruk Detayı</h3>
                <p className="text-xs text-slate-500">Sıradaki numaralar listesi</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-2 max-h-[420px] overflow-y-auto">
              {queue.queuedNumbers.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-3 text-center">
                  Kuyrukta numara bulunmuyor.
                </div>
              ) : (
                queue.queuedNumbers.map((item, index) => (
                  <div key={`${item.number}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{item.number}</div>
                      <div className="text-xs text-slate-500">Durum: {item.disposition}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">{fmt(Number(item.waitSeconds || 0))}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── KPI Kartı ─────────────────────────────────────────────── */
function KPICard({ card, onClick }) {
  const { title, value, sub, diff, icon: Icon, color, trend, percent } = card;

  const colors = {
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-600",   text: "text-blue-600",   chart: "#3b82f6" },
    green:  { bg: "bg-emerald-50",icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-600", chart: "#10b981" },
    orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", text: "text-orange-600", chart: "#f97316" },
    red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-600",     text: "text-red-600",    chart: "#ef4444" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-600", chart: "#8b5cf6" },
  };

  const c = colors[color] || colors.blue;

  const DiffIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const diffColor = diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-slate-400";

  return (
    <button
      onClick={onClick}
      className="group w-full aspect-square text-left bg-white rounded-2xl border border-slate-200 p-2 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 overflow-hidden relative flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${c.icon}`}>
          <Icon className="h-3 w-3" />
        </div>
        {diff !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${diffColor}`}>
            <DiffIcon className="h-2.5 w-2.5" />
            <span>{Math.abs(diff)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className={`text-lg font-bold leading-none ${c.text}`}>{value}</div>

        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {title}
        </div>

        {percent !== undefined ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 leading-none">
              <span>{sub}</span>
              <span>%{percent}</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color === "purple" ? "bg-purple-500" : "bg-blue-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[9px] text-slate-400 leading-tight">{sub}</div>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-8 -mx-1 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.chart} stopOpacity={0.15} />
                <stop offset="95%" stopColor={c.chart} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ display: "none" }}
              cursor={false}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={c.chart}
              strokeWidth={2}
              fill={`url(#grad-${color})`}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hover efekti */}
      <div className={`absolute inset-0 ${c.bg} opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none rounded-2xl`} />
    </button>
  );
}


/* ── GÜNÜN ÖNCELİKLERİ ─────────────────────────────────────── */
const PRIORITY_STYLE = {
  critical: { icon: AlertCircle, accent: "#ef4444", accentBg: "bg-red-500/15",     accentText: "text-red-400",     accentBorder: "border-red-500/25",     badge: "Kritik",   badgeCls: "bg-red-500/20 text-red-400 border border-red-500/30" },
  high:     { icon: AlertCircle, accent: "#ef4444", accentBg: "bg-red-500/15",     accentText: "text-red-400",     accentBorder: "border-red-500/25",     badge: "Yüksek",   badgeCls: "bg-red-500/20 text-red-400 border border-red-500/30" },
  medium:   { icon: Timer,       accent: "#f59e0b", accentBg: "bg-amber-500/15",   accentText: "text-amber-400",   accentBorder: "border-amber-500/25",   badge: "Bekliyor", badgeCls: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  low:      { icon: CheckCircle2,accent: "#10b981", accentBg: "bg-emerald-500/15", accentText: "text-emerald-400", accentBorder: "border-emerald-500/25", badge: "Normal",   badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
};

function getPriorityStyle(level = "") {
  const k = String(level).toLowerCase();
  if (k === "critical" || k === "kritik")  return PRIORITY_STYLE.critical;
  if (k === "high"     || k === "yüksek")  return PRIORITY_STYLE.high;
  if (k === "medium"   || k === "orta")    return PRIORITY_STYLE.medium;
  return PRIORITY_STYLE.low;
}

function DailyPrioritiesWidget() {
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError]     = useState(false);

  const loadPriorities = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setHasError(false);
      const res = await agentApi.getPriorities();
      setPriorities(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHasError(true);
      setPriorities([]);
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPriorities();
    const timer = setInterval(() => loadPriorities({ silent: true }), 120000);
    return () => clearInterval(timer);
  }, []);

  const criticalCount  = priorities.filter((p) => ["critical","high","kritik","yüksek"].includes(String(p.priority ?? p.oncelik ?? "").toLowerCase())).length;
  const completedCount = priorities.filter((p) => ["completed","tamamlandi"].includes(String(p.status ?? p.durum ?? "").toLowerCase())).length;
  const pendingCount   = priorities.length - completedCount;

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
                Günün Öncelikleri
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-white leading-tight">Bugün Ne Yapmalısın?</h3>
          </div>
          <button
            type="button"
            onClick={() => loadPriorities({ silent: true })}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all"
            aria-label="Yenile"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 3-stat mini row */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl bg-red-500/20 border border-red-500/30 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-red-400 mb-0.5">Kritik</div>
            <div className="text-sm font-bold text-red-300 tabular-nums">{loading ? "–" : criticalCount}</div>
          </div>
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/25 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-amber-400 mb-0.5">Bekleyen</div>
            <div className="text-sm font-bold text-amber-300 tabular-nums">{loading ? "–" : pendingCount}</div>
          </div>
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/25 px-2 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-emerald-400 mb-0.5">Tamamlanan</div>
            <div className="text-sm font-bold text-emerald-300 tabular-nums">{loading ? "–" : completedCount}</div>
          </div>
        </div>
      </div>

      {/* Öncelik listesi */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto bg-slate-50/40">
        {loading && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[64px] rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && hasError && (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-sm font-semibold text-slate-700">Veri alınamadı</div>
            <p className="text-xs text-slate-400">Bağlantı kontrol edildikten sonra yenileyin.</p>
            <button
              type="button"
              onClick={() => loadPriorities()}
              className="mt-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {!loading && !hasError && priorities.length === 0 && (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-700">Herşey yolunda</div>
            <p className="text-xs text-slate-400">Bugün için aktif öncelik bulunmuyor.</p>
          </div>
        )}

        {!loading && !hasError && priorities.map((item, idx) => {
          const s = getPriorityStyle(item.priority ?? item.oncelik);
          const Icon = s.icon;
          return (
            <div
              key={item.id ?? idx}
              className="relative flex items-center gap-3 px-4 py-3.5 hover:bg-white transition-colors duration-150"
            >
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 rounded-r-full"
                style={{ backgroundColor: s.accent }}
              />
              <div className={`h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center ${s.accentBg} border ${s.accentBorder}`}>
                <Icon className={`h-4 w-4 ${s.accentText}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <div className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
                    {item.title ?? item.baslik ?? "Öncelik"}
                  </div>
                  <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${s.badgeCls}`}>
                    {s.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {item.description ?? item.aciklama ?? item.detail ?? ""}
                </div>
                {item.progress !== undefined && (
                  <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%`, backgroundColor: s.accent }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{priorities.length} öncelik takip ediliyor</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500">
          <Zap className="h-2.5 w-2.5" />
          Gerçek zamanlı
        </span>
      </div>
    </div>
  );
}

/* ── EKİP SIRALAMASI ───────────────────────────────────────── */
const BADGE_EMOJIS = { 1: "🥇", 2: "🥈", 3: "🥉" };

const TOP3_STYLES = {
  1: {
    cardBg: "bg-gradient-to-b from-amber-50 to-white",
    avatarBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)]",
    barColor: "bg-gradient-to-r from-amber-400 to-yellow-400",
    nameColor: "text-amber-800",
    accentLine: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300",
    xpColor: "text-amber-700",
  },
  2: {
    cardBg: "bg-gradient-to-b from-slate-50 to-white",
    avatarBg: "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-[0_4px_12px_rgba(100,116,139,0.3)]",
    barColor: "bg-gradient-to-r from-slate-400 to-slate-300",
    nameColor: "text-slate-700",
    accentLine: "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300",
    xpColor: "text-slate-700",
  },
  3: {
    cardBg: "bg-gradient-to-b from-orange-50/60 to-white",
    avatarBg: "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]",
    barColor: "bg-gradient-to-r from-orange-400 to-amber-400",
    nameColor: "text-orange-800",
    accentLine: "bg-gradient-to-r from-orange-300 via-amber-400 to-orange-300",
    xpColor: "text-orange-700",
  },
};

function TeamLeaderboardWidget() {
  const [showNames, setShowNames] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    supervisorApi.getGamification()
      .then((res) => setLeaderboard(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-11 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
        <div className="p-4 flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col items-center gap-2 animate-pulse">
              <div className="h-5 w-5 rounded-full bg-slate-200" />
              <div className="h-10 w-10 rounded-2xl bg-slate-200" />
              <div className="h-2.5 w-14 rounded-full bg-slate-200" />
              <div className="h-4 w-10 rounded bg-slate-200" />
              <div className="h-1.5 w-full rounded-full bg-slate-200" />
              <div className="h-2 w-8 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 text-center text-slate-400 text-sm">
        Ekip sıralaması henüz mevcut değil.
      </div>
    );
  }

  // Alan adı uyumsuzluklarına karşı normalize et
  const rows = leaderboard.map((r, idx) => ({
    rank:   r.rank   ?? r.sira         ?? idx + 1,
    name:   r.name   ?? r.ad_soyad     ?? r.kullanici_adi ?? r.username ?? "Bilinmiyor",
    points: r.points ?? r.puan         ?? r.xp            ?? r.score    ?? 0,
    calls:  r.calls  ?? r.cagri_sayisi ?? r.cagrilar      ?? 0,
    isMe:   r.isMe   ?? r.benim        ?? false,
  }));

  const me     = rows.find((r) => r.isMe);
  const maxXp  = rows[0]?.points || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <span className="relative block h-2 w-2 rounded-full bg-amber-400" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Sıralama</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <h3 className="text-15px font-black text-white tracking-tight flex items-center gap-2">
            Puan Tablosu
            <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-400/20">Live</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {me && (
            <div className="flex items-center gap-2.5 rounded-full bg-white/5 border border-white/10 pl-1 pr-4 py-1">
              <div className="h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                🏅
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold leading-none mb-1 uppercase tracking-tighter">Senin Sıran</span>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[14px] font-black text-white">#{me.rank}</span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-black text-amber-400">{(maxXp - me.points).toLocaleString("tr-TR")} XP KALDI</span>
                </div>
              </div>
            </div>
          )}
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => setShowNames((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 transition-all active:scale-95"
          >
            {showNames ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showNames ? "İsimleri Gizle" : "İsimleri Göster"}
          </button>
        </div>
      </div>

      {/* Yatay Slider Kolu */}
      <div className="relative group">
        {/* Nav Buttons */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 shadow-xl border border-slate-200 flex items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 shadow-xl border border-slate-200 flex items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide no-scrollbar"
          style={{ scrollSnapType: "x mandatory", msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
          {rows.map((row) => {
            const barWidth    = Math.round((row.points / maxXp) * 100);
            const top3        = TOP3_STYLES[row.rank];
            const isTop3      = !!top3;
            const cardBg      = row.isMe ? "bg-amber-50/20" : isTop3 ? top3.cardBg : "bg-white";
            const avatarStyle = row.isMe ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.3)]" : isTop3 ? top3.avatarBg : "bg-slate-100 text-slate-600 shadow-sm";
            const barColor    = row.isMe ? "bg-amber-400" : isTop3 ? top3.barColor : "bg-slate-200";
            const nameColor   = row.isMe ? "text-amber-900 font-black" : isTop3 ? top3.nameColor : "text-slate-600 font-bold";
            const xpColor     = row.isMe ? "text-amber-600" : isTop3 ? top3.xpColor : "text-slate-500";
            const accentLine  = row.isMe ? "bg-amber-400" : isTop3 ? top3.accentLine : null;

            return (
              <div
                key={row.rank}
                className={`relative flex-none w-[calc(100%/7)] min-w-[140px] flex flex-col items-center gap-3 px-4 py-8 transition-all border-r border-slate-100/60 last:border-r-0 ${cardBg} scroll-snap-align-start hover:z-[1] hover:shadow-[0_0_20px_rgba(0,0,0,0.05)]`}
                style={{ scrollSnapAlign: "start" }}
              >
                {accentLine && <span className={`absolute top-0 inset-x-0 h-1 ${accentLine} opacity-80`} />}

                <div className="h-8 flex items-center justify-center">
                  {BADGE_EMOJIS[row.rank] ? (
                    <div className="relative">
                      <span className="text-2xl drop-shadow-md z-10 relative animate-bounce-slow">
                        {BADGE_EMOJIS[row.rank]}
                      </span>
                      <div className={`absolute inset-0 blur-lg opacity-40 ${barColor}`} />
                    </div>
                  ) : (
                    <span className={`text-[12px] font-black tabular-nums tracking-tighter ${row.isMe ? "text-amber-500" : "text-slate-300"}`}>
                      #{row.rank}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className={`h-14 w-14 rounded-[22px] flex items-center justify-center text-[16px] font-black transition-all duration-300 group-item-hover:scale-110 group-item-hover:-translate-y-1 ${avatarStyle}`}>
                    {initials(showNames ? row.name : `T${row.rank}`)}
                  </div>
                  {row.isMe && (
                    <div className="absolute -right-1 -bottom-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="text-center min-w-0 w-full space-y-1">
                  <div className={`text-[12px] truncate leading-tight uppercase tracking-tight ${nameColor}`}>
                    {showNames ? row.name.split(" ")[0] : `Temsilci ${row.rank}`}
                  </div>
                  {row.isMe && <div className="inline-block px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[8px] font-black uppercase tracking-widest leading-none">Premium</div>}
                </div>

                <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                  <div className={`text-[17px] font-black tabular-nums leading-none tracking-tighter ${xpColor}`}>
                    {row.points.toLocaleString("tr-TR")}
                    <span className="text-[10px] font-bold text-slate-300 ml-1">XP</span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500 tabular-nums font-black">{row.calls}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-50 bg-[#fafafa] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {rows.slice(0, 3).map((r, i) => (
              <div key={i} className="h-5 w-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[7px] font-bold">
                {initials(r.name)}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            <span className="text-slate-600">{rows.length}</span> Temsilci Aktif
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Rank</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Gece Sıfırlanır</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="w-full aspect-square bg-white rounded-2xl border border-slate-200 p-2 animate-pulse flex flex-col">
      <div className="flex items-start justify-between">
        <div className="h-6 w-6 rounded-lg bg-slate-100" />
        <div className="h-3 w-8 rounded bg-slate-100" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="h-6 w-16 rounded bg-slate-100" />
        <div className="h-2.5 w-20 rounded bg-slate-100" />
        <div className="h-2.5 w-14 rounded bg-slate-100" />
      </div>
      <div className="h-8 rounded bg-slate-100 mt-auto" />
    </div>
  );
}