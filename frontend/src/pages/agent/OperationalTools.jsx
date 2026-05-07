import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar, Clock, Users, AlertCircle, Plus, ChevronLeft, ChevronRight,
  Bell, CheckCircle2, X, Send, Loader2, Check,
  Coffee, Monitor, Wifi, HardDrive, Wrench,
  ArrowLeftRight, Trash2, MessageSquare, Paperclip,
  ChevronDown, Flag, RefreshCcw, RotateCcw, Star,
  Repeat, BookOpen
} from "lucide-react";

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const PAGE_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ot-fade { animation: fadeIn 220ms ease-out both; }
  .premium-card { box-shadow: 0 8px 30px rgba(0,0,0,0.04); border: 1px solid rgba(226,232,240,0.8); }
  .ot-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .ot-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .ot-scroll::-webkit-scrollbar-track { background: transparent; }
`;

/* ─────────────────────────────── MOCK DATA ──────────────────────────── */
const TODAY = new Date(2025, 3, 26); // 26 Nisan 2025

const TEAM = [
  { id: "u1", name: "Deniz Kaya",    color: "#3b82f6", bg: "bg-blue-500"    },
  { id: "u2", name: "Selin Öztürk", color: "#8b5cf6", bg: "bg-violet-500"  },
  { id: "u3", name: "Can Demir",     color: "#f59e0b", bg: "bg-amber-500"   },
  { id: "u4", name: "Ahmet Yılmaz", color: "#10b981", bg: "bg-emerald-500", isMe: true },
  { id: "u5", name: "Zeynep Arslan", color: "#ef4444", bg: "bg-rose-500"    },
  { id: "u6", name: "Mert Güven",   color: "#6366f1", bg: "bg-indigo-500"  },
  { id: "u7", name: "Ayşe Koç",     color: "#ec4899", bg: "bg-pink-500"    },
  { id: "u8", name: "Burak Yıldız", color: "#f97316", bg: "bg-orange-500"  },
];

const SHIFT_TYPES = {
  sabah:  { label: "Sabah",  hours: "08–17", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  gunduz: { label: "Gündüz", hours: "09–18", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  aksam:  { label: "Akşam",  hours: "12–21", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  izin:   { label: "İzin",   hours: "—",     cls: "bg-amber-100 text-amber-700 border-amber-200" },
  off:    { label: "—",      hours: "",      cls: "bg-slate-50 text-slate-300 border-transparent" },
};

// 4-week shifts keyed by "YYYY-MM-DD-agentId"
function buildShifts() {
  const pattern = {
    u1: ["sabah","sabah","sabah","sabah","sabah","off","off"],
    u2: ["gunduz","gunduz","gunduz","izin","gunduz","off","off"],
    u3: ["aksam","aksam","aksam","aksam","off","aksam","off"],
    u4: ["gunduz","gunduz","gunduz","gunduz","gunduz","off","off"],
    u5: ["sabah","sabah","izin","sabah","sabah","off","off"],
    u6: ["aksam","aksam","aksam","off","aksam","aksam","off"],
    u7: ["gunduz","gunduz","gunduz","gunduz","off","gunduz","off"],
    u8: ["sabah","sabah","sabah","sabah","sabah","off","off"],
  };
  const result = {};
  const monday = new Date(TODAY);
  monday.setDate(TODAY.getDate() - ((TODAY.getDay() + 6) % 7));
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + w * 7 + d);
      const key = dt.toISOString().split("T")[0];
      Object.keys(pattern).forEach((uid) => {
        result[`${key}-${uid}`] = pattern[uid][d];
      });
    }
  }
  return result;
}
const SHIFTS = buildShifts();

// Breaks: minutes from 08:00 (0=08:00, 60=09:00, 780=21:00)
const BREAKS_TODAY = [
  { agentId: "u1", name: "Deniz K.",    color: "#3b82f6", start: 120, dur: 30  }, // 10:00 30dk
  { agentId: "u2", name: "Selin Ö.",   color: "#8b5cf6", start: 150, dur: 15  }, // 10:30 15dk
  { agentId: "u3", name: "Can D.",      color: "#f59e0b", start: 240, dur: 60  }, // 12:00 60dk
  { agentId: "u4", name: "Ahmet Y.",   color: "#10b981", start: 270, dur: 30, isMe: true }, // 12:30 30dk
  { agentId: "u5", name: "Zeynep A.",  color: "#ef4444", start:  60, dur: 15  }, // 09:00 15dk
  { agentId: "u6", name: "Mert G.",    color: "#6366f1", start: 300, dur: 60  }, // 13:00 60dk
  { agentId: "u7", name: "Ayşe K.",    color: "#ec4899", start: 330, dur: 15  }, // 13:30 15dk
  { agentId: "u8", name: "Burak Y.",   color: "#f97316", start:  90, dur: 15  }, // 09:30 15dk
];

const PRIORITY = {
  high:   { label: "Yüksek", cls: "bg-red-50 text-red-700 border-red-200" },
  medium: { label: "Orta",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { label: "Düşük",  cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

function buildEvents() {
  const base = TODAY.toISOString().split("T")[0];
  const d = (offset) => {
    const dt = new Date(TODAY); dt.setDate(TODAY.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };
  return [
    { id: "e1", date: base, time: "09:00", title: "Sabah ekip toplantısı", note: "Haftalık hedef değerlendirmesi — Zoom ile", priority: "high",   repeat: "weekly",  notify: 15 },
    { id: "e2", date: base, time: "14:00", title: "Nisan CSAT raporu sunumu", note: "Yönetici Levent Bey'in sunumu", priority: "medium", repeat: "none",    notify:  5 },
    { id: "e3", date: d(2), time: "10:00", title: "New Balance ürün eğitimi", note: "Yeni sezon koşu koleksiyonu tanıtımı", priority: "medium", repeat: "none", notify: 15 },
    { id: "e4", date: d(4), time: "17:00", title: "Nisan performans görüşmesi", note: "Levent Bey ile 1-on-1 görüşme", priority: "high", repeat: "monthly", notify: 30 },
    { id: "e5", date: d(5), time: "09:00", title: "Emek ve Dayanışma Bayramı", note: "Resmi tatil — mağaza kapalı", priority: "low", repeat: "yearly", notify: 0 },
    { id: "e6", date: d(7), time: "11:00", title: "Yeni sezon giyim kataloğu", note: "Adidas & Puma yeni sezon incelemesi", priority: "low", repeat: "none", notify: 10 },
  ];
}
const MOCK_EVENTS = buildEvents();

const MOCK_TICKETS = [
  {
    id: "t1", category: "sistem", title: "CRM yavaş yanıt veriyor",
    description: "Sabahtan beri CRM müşteri arama sayfası 10–15 saniye sürüyor. Müşteri görüşmelerini etkiliyor.",
    status: "working", priority: "high", createdAt: "2025-04-25T09:30:00",
    replies: [{ from: "IT Ekibi", time: "2025-04-25T11:00:00", text: "İnceleniyor. Sunucu yükü yüksek, optimizasyon devam ediyor." }],
  },
  {
    id: "t2", category: "donanim", title: "Kulaklık mikrofon arızası",
    description: "Sol taraf mikrofon intermittent çalışıyor, müşteriler zaman zaman beni duymuyor.",
    status: "open", priority: "medium", createdAt: "2025-04-26T08:15:00",
    replies: [],
  },
  {
    id: "t3", category: "hat", title: "Dış hat bağlantı kesilmesi",
    description: "3–4 dakikada bir hat düşüyordu, müşteri görüşmesi kesildi.",
    status: "resolved", priority: "high", createdAt: "2025-04-22T14:00:00",
    replies: [
      { from: "IT Ekibi", time: "2025-04-22T16:30:00", text: "Switch konfigürasyonu güncellendi, lütfen test edin." },
      { from: "IT Ekibi", time: "2025-04-23T09:00:00", text: "Sorun giderildi, ticket kapatıldı." },
    ],
  },
];

/* ─────────────────────────────── HELPERS ────────────────────────────── */
const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAYS_TR   = ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7; } // Mon=0

function fmtTime(h, m = 0) {
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function minToTime(min) {
  const h = Math.floor((min + 8 * 60) / 60) % 24;
  const m = (min + 8 * 60) % 60;
  return fmtTime(h, m);
}
function isoDate(dt) { return dt.toISOString().split("T")[0]; }

/* ═══════════════════════════ AJANDA SEKMESİ ═══════════════════════════ */
function MiniCalendar({ year, month, selectedDate, events, onDayClick, onPrev, onNext }) {
  const days   = getDaysInMonth(year, month);
  const offset = getFirstWeekday(year, month);
  const cells  = Array.from({ length: offset + days }, (_, i) => i < offset ? null : i - offset + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventDays = new Set(
    events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).map((e) => new Date(e.date).getDate())
  );

  const todayD = TODAY.getDate(), todayM = TODAY.getMonth(), todayY = TODAY.getFullYear();
  const selD   = selectedDate ? selectedDate.getDate() : null;
  const selM   = selectedDate ? selectedDate.getMonth() : null;
  const selY   = selectedDate ? selectedDate.getFullYear() : null;

  return (
    <div className="select-none">
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <span className="text-[13px] font-extrabold text-slate-800">{MONTHS_TR[month]} {year}</span>
        <button onClick={onNext} className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_TR.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday   = day === todayD && month === todayM && year === todayY;
          const isSelected= day === selD   && month === selM   && year === selY;
          const hasEvent  = eventDays.has(day);
          return (
            <button key={i}
              onClick={() => onDayClick(new Date(year, month, day))}
              className={`relative mx-auto h-8 w-8 rounded-xl text-[12px] font-bold transition-all duration-150
                ${isSelected ? "bg-slate-900 text-white shadow-md" :
                  isToday    ? "bg-emerald-500 text-white" :
                               "hover:bg-slate-100 text-slate-700"}`}
            >
              {day}
              {hasEvent && !isSelected && !isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-500" />
              )}
              {hasEvent && (isSelected || isToday) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AjandaTab() {
  const [calYear,  setCalYear]  = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [selected, setSelected] = useState(new Date(TODAY));
  const [events,   setEvents]   = useState(MOCK_EVENTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ time: "09:00", title: "", note: "", priority: "medium", repeat: "none", notify: "5" });

  const dayEvents = useMemo(() =>
    events.filter((e) => e.date === isoDate(selected)).sort((a, b) => a.time.localeCompare(b.time)),
    [events, selected]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = (ev) => {
    ev.preventDefault();
    if (!form.title.trim()) return;
    setEvents((prev) => [...prev, { id: `e${Date.now()}`, date: isoDate(selected), ...form }]);
    setForm({ time: "09:00", title: "", note: "", priority: "medium", repeat: "none", notify: "5" });
    setShowForm(false);
  };

  const removeEvent = (id) => setEvents((prev) => prev.filter((e) => e.id !== id));

  const prevMonth = () => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); };

  const selLabel = selected.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-3 ot-fade">
      {/* Takvim */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden flex flex-col">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Takvim
          </span>
        </div>
        <div className="p-4">
          <MiniCalendar year={calYear} month={calMonth} selectedDate={selected} events={events}
            onDayClick={setSelected} onPrev={prevMonth} onNext={nextMonth} />
        </div>
        {/* Legend */}
        <div className="px-4 pb-4 flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Bugün</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900" />Seçili</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Etkinlik</span>
        </div>
      </div>

      {/* Gün Detayı */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden flex flex-col">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
            {selLabel}
          </span>
          <button onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-xl text-[11px] font-bold transition-all
              ${showForm ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"}`}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? "İptal" : "Yeni Hatırlatıcı"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto ot-scroll p-4 flex flex-col gap-3">
          {/* Add form */}
          {showForm && (
            <form onSubmit={handleAdd} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col gap-3 ot-fade">
              <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Yeni Hatırlatıcı</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Saat</label>
                  <input type="time" value={form.time} onChange={set("time")}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Öncelik</label>
                  <select value={form.priority} onChange={set("priority")}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10">
                    <option value="high">Yüksek</option>
                    <option value="medium">Orta</option>
                    <option value="low">Düşük</option>
                  </select>
                </div>
              </div>
              <input value={form.title} onChange={set("title")} required placeholder="Başlık *"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400" />
              <textarea value={form.note} onChange={set("note")} placeholder="Not (isteğe bağlı)" rows={2}
                className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400" />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tekrar</label>
                  <select value={form.repeat} onChange={set("repeat")}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none">
                    <option value="none">Yok</option>
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Bildirim</label>
                  <select value={form.notify} onChange={set("notify")}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none">
                    <option value="0">Yok</option>
                    <option value="5">5 dk önce</option>
                    <option value="10">10 dk önce</option>
                    <option value="15">15 dk önce</option>
                    <option value="30">30 dk önce</option>
                  </select>
                </div>
              </div>
              <button type="submit"
                className="h-9 rounded-xl bg-slate-900 text-white text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                <Check className="h-3.5 w-3.5" /> Ekle
              </button>
            </form>
          )}

          {/* Events */}
          {dayEvents.length === 0 && !showForm ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Calendar className="h-8 w-8 text-slate-200" />
              <p className="text-[13px] font-bold text-slate-400">Bu gün için planınız yok</p>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Hatırlatıcı Ekle
              </button>
            </div>
          ) : (
            dayEvents.map((ev) => {
              const p = PRIORITY[ev.priority] || PRIORITY.medium;
              return (
                <div key={ev.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-3 hover:shadow-sm transition-shadow group ot-fade">
                  <div className="shrink-0 text-center">
                    <div className="text-[14px] font-extrabold text-slate-800">{ev.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-extrabold text-slate-800">{ev.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${p.cls}`}>{p.label}</span>
                      {ev.repeat !== "none" && (
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <Repeat className="h-2.5 w-2.5" />
                          {ev.repeat === "daily" ? "Günlük" : ev.repeat === "weekly" ? "Haftalık" : ev.repeat === "monthly" ? "Aylık" : "Yıllık"}
                        </span>
                      )}
                    </div>
                    {ev.note && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{ev.note}</p>}
                    {Number(ev.notify) > 0 && (
                      <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-1">
                        <Bell className="h-2.5 w-2.5" />{ev.notify} dk önce bildirim
                      </span>
                    )}
                  </div>
                  <button onClick={() => removeEvent(ev.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ VARDİYA SEKMESİ ══════════════════════════ */
function VardiyaTab() {
  const [showModal, setShowModal] = useState(false);
  const [reqForm,   setReqForm]   = useState({ targetDate: "", targetAgent: "", reason: "" });
  const [sent,      setSent]      = useState(false);
  const [loading,   setLoading]   = useState(false);

  const monday = useMemo(() => {
    const d = new Date(TODAY);
    d.setDate(TODAY.getDate() - ((TODAY.getDay() + 6) % 7));
    return d;
  }, []);

  const weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const dt = new Date(monday);
        dt.setDate(monday.getDate() + w * 7 + d);
        return dt;
      })
    );
  }, [monday]);

  const isToday = (dt) => isoDate(dt) === isoDate(TODAY);

  const handleSend = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 1000);
  };

  return (
    <div className="flex flex-col gap-3 ot-fade">
      {/* 4-week grid */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-emerald-400" /> 4 Haftalık Vardiya Programı
          </span>
          <div className="flex items-center gap-2">
            {Object.entries(SHIFT_TYPES).filter(([k]) => k !== "off").map(([k, v]) => (
              <span key={k} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${v.cls}`}>
                {v.label} {v.hours}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto ot-scroll">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-28 sticky left-0 bg-slate-50">Personel</th>
                {weeks.map((week, wi) =>
                  week.map((dt, di) => (
                    <th key={`${wi}-${di}`}
                      className={`px-2 py-2.5 text-center min-w-[52px] ${isToday(dt) ? "bg-emerald-50" : ""}`}>
                      <div className={`text-[9px] font-bold uppercase ${isToday(dt) ? "text-emerald-600" : "text-slate-400"}`}>
                        {DAYS_TR[di]}
                      </div>
                      <div className={`text-[10px] font-extrabold mt-0.5 ${isToday(dt) ? "text-emerald-700" : "text-slate-600"}`}>
                        {dt.getDate()}/{dt.getMonth() + 1}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TEAM.map((agent) => (
                <tr key={agent.id} className={agent.isMe ? "bg-emerald-50/40" : "hover:bg-slate-50 transition-colors"}>
                  <td className={`px-4 py-2 sticky left-0 ${agent.isMe ? "bg-emerald-50/40" : "bg-white"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${agent.bg} shrink-0`} />
                      <span className={`text-[11px] font-bold truncate max-w-[80px] ${agent.isMe ? "text-emerald-700" : "text-slate-700"}`}>
                        {agent.isMe ? "Ben" : agent.name.split(" ")[0]}
                      </span>
                    </div>
                  </td>
                  {weeks.map((week, wi) =>
                    week.map((dt, di) => {
                      const key = `${isoDate(dt)}-${agent.id}`;
                      const st  = SHIFTS[key] || "off";
                      const s   = SHIFT_TYPES[st];
                      return (
                        <td key={`${wi}-${di}`} className={`px-1.5 py-2 text-center ${isToday(dt) ? "bg-emerald-50/30" : ""}`}>
                          {st !== "off" ? (
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ${s.cls} ${agent.isMe ? "ring-1 ring-emerald-400/40" : ""}`}>
                              {s.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift change request */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" /> Vardiya Değişiklik Talebi
          </span>
        </div>
        <div className="p-4">
          <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 leading-relaxed">
            Akış: 1) Supervisor görüş bildirir (uygun/uygun değil) 2) Talep otomatik Admin'e iletilir ve son kararı Admin verir.
          </div>
          {sent ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-[13px] font-bold text-emerald-700">Talebiniz gönderildi!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Önce Supervisor görüşü alınacak, ardından Admin son kararı bildirecek.</p>
              </div>
              <button onClick={() => { setSent(false); setReqForm({ targetDate: "", targetAgent: "", reason: "" }); }}
                className="ml-auto text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Yeni Talep
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Değişim Tarihi</label>
                <input type="date" value={reqForm.targetDate}
                  onChange={(e) => setReqForm((f) => ({ ...f, targetDate: e.target.value }))} required
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Değişim Yapılacak Personel</label>
                <select value={reqForm.targetAgent}
                  onChange={(e) => setReqForm((f) => ({ ...f, targetAgent: e.target.value }))} required
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10">
                  <option value="">Seçin...</option>
                  {TEAM.filter((a) => !a.isMe).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Gerekçe</label>
                <input value={reqForm.reason}
                  onChange={(e) => setReqForm((f) => ({ ...f, reason: e.target.value }))} required
                  minLength={30}
                  placeholder="En az 30 karakter gerekçe yazın..."
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white placeholder:text-slate-400" />
                <p className="text-[10px] text-slate-400">{reqForm.reason.length}/30</p>
              </div>
              <button type="submit" disabled={loading}
                className="h-9 px-5 rounded-xl bg-slate-900 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-700 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Gönder
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════ MOLA SEKMESİ ════════════════════════════ */
const TIMELINE_START = 0;   // 08:00 = 0 min
const TIMELINE_END   = 780; // 21:00 = 780 min

function BreakTimeline({ breaks, myBreak }) {
  const span = TIMELINE_END - TIMELINE_START;
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08..21

  const concurrent = useMemo(() => {
    // find max concurrent breaks at any minute
    return breaks.reduce((maxCount, b) => {
      let cnt = 0;
      for (let t = b.start; t < b.start + b.dur; t++) {
        cnt = Math.max(cnt, breaks.filter((x) => t >= x.start && t < x.start + x.dur).length);
      }
      return Math.max(maxCount, cnt);
    }, 0);
  }, [breaks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ekip Mola Dağılımı — Bugün</p>
        {concurrent >= 4 && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {concurrent} kişi aynı anda molada!
          </span>
        )}
      </div>
      {/* Hour markers */}
      <div className="relative ml-24 mb-1">
        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
          {hours.map((h) => <span key={h} className="w-0 text-center">{h}</span>)}
        </div>
      </div>
      {/* Rows */}
      <div className="flex flex-col gap-1">
        {breaks.map((b) => {
          const left  = ((b.start - TIMELINE_START) / span) * 100;
          const width = (b.dur / span) * 100;
          return (
            <div key={b.agentId} className="flex items-center gap-2">
              <span className={`text-[10px] font-bold w-24 shrink-0 truncate text-right ${b.isMe ? "text-emerald-700" : "text-slate-500"}`}>
                {b.isMe ? "Ben" : b.name}
              </span>
              <div className="flex-1 relative h-6 bg-slate-100 rounded-lg overflow-hidden">
                <div className="absolute inset-y-0 rounded-lg flex items-center justify-center transition-all"
                  style={{ left: `${left}%`, width: `${Math.max(width, 1)}%`, backgroundColor: b.color, opacity: b.isMe ? 1 : 0.7 }}>
                  <span className="text-[9px] text-white font-bold whitespace-nowrap px-1">
                    {minToTime(b.start)} · {b.dur}dk
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Grid lines overlay (decorative) */}
      <div className="relative ml-24 mt-1">
        <div className="flex justify-between">
          {hours.map((h) => <div key={h} className="w-px h-2 bg-slate-200" />)}
        </div>
      </div>
    </div>
  );
}

function MolaTab() {
  const [breaks,   setBreaks]  = useState(BREAKS_TODAY);
  const [form,     setForm]    = useState({ startH: "10", startM: "00", dur: "15" });
  const [conflict, setConflict] = useState(null);
  const [added,    setAdded]   = useState(false);

  const myBreaks = breaks.filter((b) => b.isMe);

  const HOURS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, "0"));
  const MINS  = ["00", "15", "30", "45"];
  const DURS  = [{ v: "5", l: "5 dakika" }, { v: "10", l: "10 dakika" }, { v: "15", l: "15 dakika" }];

  const handlePlan = () => {
    const startMin = (parseInt(form.startH) - 8) * 60 + parseInt(form.startM);
    const dur      = parseInt(form.dur);
    const endMin   = startMin + dur;

    const samePeriod = breaks.filter((b) => {
      const bEnd = b.start + b.dur;
      return !(endMin <= b.start || startMin >= bEnd);
    });
    if (samePeriod.length >= 3) {
      setConflict(`${minToTime(startMin)}–${minToTime(endMin)} aralığında ${samePeriod.length} kişi zaten molada. Farklı bir saat önerilir.`);
      return;
    }
    setConflict(null);
    const newBreak = { agentId: "u4-new", name: "Ben", color: "#f59e0b", start: startMin, dur, isMe: true, pending: true };
    setBreaks((prev) => [...prev.filter((b) => !b.isMe), newBreak]);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  return (
    <div className="flex flex-col gap-3 ot-fade">
      {/* Timeline */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <Coffee className="h-3.5 w-3.5 text-emerald-400" /> Günlük Mola Planı
          </span>
        </div>
        <div className="p-4">
          <BreakTimeline breaks={breaks} myBreak={myBreaks[0]} />
        </div>
      </div>

      {/* My breaks + add form */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-3">
        {/* My breaks */}
        <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden">
          <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Benim Molalarım — Bugün</span>
          </div>
          <div className="p-4">
            {myBreaks.length === 0 ? (
              <div className="py-6 text-center">
                <Coffee className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400">Bugün için mola planlanmadı.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myBreaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
                    <Coffee className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-emerald-800">{minToTime(b.start)} – {minToTime(b.start + b.dur)}</p>
                      <p className="text-[10px] text-emerald-600">{b.dur} dakika</p>
                      {b.pending && (
                        <span className="inline-flex mt-1 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                          Supervisor onayı bekleniyor
                        </span>
                      )}
                    </div>
                    <button onClick={() => setBreaks((prev) => prev.filter((_, j) => j !== breaks.indexOf(b)))}
                      className="text-emerald-300 hover:text-rose-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add break */}
        <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden">
          <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-emerald-400" /> Mola Talebi Oluştur
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 leading-relaxed">
              Mola talebi Supervisor onayına gider. Personel yalnızca 5/10/15 dk süre seçebilir.
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Saat</label>
                <select value={form.startH} onChange={(e) => setForm((f) => ({ ...f, startH: e.target.value }))}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10">
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Dakika</label>
                <select value={form.startM} onChange={(e) => setForm((f) => ({ ...f, startM: e.target.value }))}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10">
                  {MINS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Süre</label>
                <select value={form.dur} onChange={(e) => setForm((f) => ({ ...f, dur: e.target.value }))}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10">
                  {DURS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
              </div>
            </div>

            {conflict && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">{conflict}</p>
              </div>
            )}
            {added && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[11px] text-emerald-800 font-semibold">Mola talebi Supervisor onayına gönderildi.</p>
              </div>
            )}

            <button onClick={handlePlan}
              className="h-9 rounded-xl bg-slate-900 text-white text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
              <Check className="h-3.5 w-3.5" /> Talep Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ SORUN BİLDİRİMİ ═══════════════════════════ */
const TICKET_STATUS = {
  open:     { label: "Açık",        cls: "bg-rose-50 text-rose-700 border-rose-200" },
  working:  { label: "Çalışılıyor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Çözüldü",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const TICKET_CATS = [
  { id: "hat",     label: "Hat Sorunu",   icon: Wifi     },
  { id: "sistem",  label: "Sistem Hatası", icon: Monitor  },
  { id: "donanim", label: "Donanım",       icon: HardDrive },
  { id: "diger",   label: "Diğer",         icon: Wrench   },
];

function SorunTab() {
  const [tickets,   setTickets]  = useState(MOCK_TICKETS);
  const [form,      setForm]     = useState({ category: "sistem", title: "", description: "", priority: "medium" });
  const [sending,   setSending]  = useState(false);
  const [sent,      setSent]     = useState(false);
  const [expanded,  setExpanded] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (ev) => {
    ev.preventDefault();
    setSending(true);
    setTimeout(() => {
      setTickets((prev) => [{
        id: `t${Date.now()}`,
        ...form,
        status: "open",
        createdAt: new Date().toISOString(),
        replies: [],
      }, ...prev]);
      setForm({ category: "sistem", title: "", description: "", priority: "medium" });
      setSent(true);
      setSending(false);
      setTimeout(() => setSent(false), 3000);
    }, 900);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-3 ot-fade">
      {/* Form */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden flex flex-col">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-emerald-400" /> Yeni Sorun Bildirimi
          </span>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-600 uppercase">Kategori</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TICKET_CATS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setForm((f) => ({ ...f, category: id }))}
                  className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-[11px] font-bold transition-all
                    ${form.category === id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase">Öncelik</label>
            <div className="flex gap-1.5">
              {[["high","Yüksek"],["medium","Orta"],["low","Düşük"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, priority: v }))}
                  className={`flex-1 h-8 rounded-xl border text-[11px] font-bold transition-all
                    ${form.priority === v ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase">Başlık *</label>
            <input value={form.title} onChange={set("title")} required placeholder="Sorunu kısaca özetleyin"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white placeholder:text-slate-400" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase">Açıklama *</label>
            <textarea value={form.description} onChange={set("description")} required rows={4}
              placeholder="Sorun ne zaman başladı, nasıl tekrarlanıyor, hangi adımları denediniz?"
              className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white placeholder:text-slate-400" />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span>Ekran görüntüsü ekle (isteğe bağlı)</span>
          </div>

          {sent && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-[12px] text-emerald-700 font-semibold">Ticket oluşturuldu! IT ekibi bilgilendirildi.</p>
            </div>
          )}

          <button type="submit" disabled={sending}
            className="h-10 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Gönderiliyor..." : "Bildir"}
          </button>
        </form>
      </div>

      {/* Ticket list */}
      <div className="premium-card rounded-[1.5rem] bg-white overflow-hidden flex flex-col">
        <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Ticket'larım</span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-white/10">
            {tickets.filter((t) => t.status !== "resolved").length} açık
          </span>
        </div>
        <div className="flex-1 overflow-y-auto ot-scroll p-3 flex flex-col gap-2">
          {tickets.map((tk) => {
            const st    = TICKET_STATUS[tk.status];
            const cat   = TICKET_CATS.find((c) => c.id === tk.category);
            const CatIcon = cat?.icon || Wrench;
            const isOpen  = expanded === tk.id;
            const pri     = PRIORITY[tk.priority] || PRIORITY.medium;

            return (
              <div key={tk.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition-shadow ot-fade">
                <button className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setExpanded(isOpen ? null : tk.id)}>
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${tk.status === "resolved" ? "bg-emerald-100" : "bg-slate-100"}`}>
                    <CatIcon className={`h-4 w-4 ${tk.status === "resolved" ? "text-emerald-600" : "text-slate-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-extrabold text-slate-800 truncate">{tk.title}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${pri.cls}`}>{pri.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />
                        {new Date(tk.createdAt).toLocaleDateString("tr-TR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </span>
                      {tk.replies.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-2.5 w-2.5" />{tk.replies.length} yanıt
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-50 ot-fade">
                    <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">{tk.description}</p>
                    {tk.replies.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">IT Ekibi Yanıtları</p>
                        {tk.replies.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                            <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                              <Monitor className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-700">{r.from}</span>
                              <span className="text-[9px] text-slate-400 ml-2">
                                {new Date(r.time).toLocaleString("tr-TR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                              </span>
                              <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {tk.replies.length === 0 && (
                      <p className="mt-3 text-[11px] text-slate-400 italic">IT ekibinden henüz yanıt gelmedi.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════ MAIN PAGE ══════════════════════════════ */
const TABS = [
  { id: "ajanda",  label: "Ajanda",          icon: Calendar     },
  { id: "vardiya", label: "Vardiya",          icon: Clock        },
  { id: "mola",    label: "Mola Talebi",      icon: Coffee       },
  { id: "sorun",   label: "Sorun Bildirimi",  icon: AlertCircle  },
];

export default function OperationalTools() {
  const [activeTab, setActiveTab] = useState("ajanda");

  return (
    <div className="p-3 flex flex-col gap-3 min-h-0">
      <style>{PAGE_STYLES}</style>

      {/* Tab bar */}
      <div className="premium-card rounded-2xl bg-white p-1 flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[12px] font-bold transition-all duration-200
              ${activeTab === id
                ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "ajanda"  && <AjandaTab />}
        {activeTab === "vardiya" && <VardiyaTab />}
        {activeTab === "mola"    && <MolaTab />}
        {activeTab === "sorun"   && <SorunTab />}
      </div>
    </div>
  );
}
