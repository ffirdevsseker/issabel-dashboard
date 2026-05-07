/**
 * useShiftsStore — Supervisor Vardiya Yönetimi Global State Hook
 *
 * Tüm API çağrılarını ve state'i tek yerden yönetir.
 * Hiçbir mock data kullanmaz; tüm veriler backend'den gelir.
 */
import { useState, useEffect, useCallback } from "react";

// ─── Yardımcı Tarih Fonksiyonları ────────────────────────────────────────────
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Pazar
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateStr(date) {
  // yyyy-mm-dd formatı (ISO, timezone bağımsız)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameDay(a, b) {
  return toDateStr(a) === toDateStr(b);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── API Helper ───────────────────────────────────────────────────────────────
const BASE = "/api/supervisor";

export const apiFetch = (path, opts = {}) =>
  fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(opts.headers || {}),
    },
  }).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    if (r.status === 204) return null;
    return r.json();
  });

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useShiftsStore() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [personnel, setPersonnel] = useState([]);
  // weekShifts: { "personelId_YYYY-MM-DD": VardiyaObj }
  const [weekShifts, setWeekShifts] = useState({});
  // monthlySummary: { "YYYY-MM-DD": { working, total, night, leave, pending } }
  const [monthlySummary, setMonthlySummary] = useState({});
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Aktif hafta (Pazartesi)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  // Aktif ay
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1, // 1-indexed
  });

  // Loading / Error
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState(null);

  // ── Personnel (bir kez yükle) ───────────────────────────────────────────────
  const loadPersonnel = useCallback(async () => {
    try {
      const data = await apiFetch("/shifts/team");
      setPersonnel(data || []);
    } catch (e) {
      setError(`Personel yüklenemedi: ${e.message}`);
    }
  }, []);

  // ── Haftalık Vardiyalar ────────────────────────────────────────────────────
  const loadWeek = useCallback(async (weekStart) => {
    setLoadingWeek(true);
    setError(null);
    try {
      const start = toDateStr(weekStart);
      const end = toDateStr(addDays(weekStart, 6));
      const data = await apiFetch(`/shifts/?start=${start}&end=${end}`);
      const map = {};
      (data || []).forEach((v) => {
        const key = `${v.personel_id}_${v.tarih}`;
        map[key] = v;
      });
      setWeekShifts(map);
    } catch (e) {
      setError(`Haftalık vardiyalar yüklenemedi: ${e.message}`);
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  // ── Aylık Özet ─────────────────────────────────────────────────────────────
  const loadMonth = useCallback(async (year, month) => {
    setLoadingMonth(true);
    setError(null);
    try {
      const data = await apiFetch(`/shifts/calendar-summary?year=${year}&month=${month}`);
      const map = {};
      (data || []).forEach((day) => {
        map[day.tarih] = day;
      });
      setMonthlySummary(map);
      setCurrentMonth({ year, month });
    } catch (e) {
      setError(`Aylık özet yüklenemedi: ${e.message}`);
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  // ── Haftalık KPI ───────────────────────────────────────────────────────────
  const loadWeeklyStats = useCallback(async (start, end) => {
    setLoadingStats(true);
    try {
      const data = await apiFetch(`/shifts/weekly-stats?start=${start}&end=${end}`);
      setWeeklyStats(data);
    } catch (e) {
      // stats yüklenemezse sessizce geç
      setWeeklyStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Bekleyen Talepler ──────────────────────────────────────────────────────
  const loadPendingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await apiFetch("/approvals/shift-requests");
      setPendingRequests(data || []);
    } catch (e) {
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // ── Tekli Vardiya CRUD ─────────────────────────────────────────────────────
  const saveShift = useCallback(async (payload) => {
    if (payload.id) {
      return apiFetch(`/shifts/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
    return apiFetch("/shifts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  const deleteShift = useCallback(async (id, gerekce) => {
    return apiFetch(`/shifts/${id}?gerekce=${encodeURIComponent(gerekce)}`, {
      method: "DELETE",
    });
  }, []);

  // ── Toplu Kaydet ──────────────────────────────────────────────────────────
  const bulkSave = useCallback(async (entries, overwrite = false, ekip_id = null) => {
    // ekip_id yoksa personnel'ın ilk ekibini kullan
    const eId = ekip_id || (personnel[0]?.ekip_id) || 0;
    return apiFetch("/shifts/bulk", {
      method: "POST",
      body: JSON.stringify({ entries, overwrite, ekip_id: eId }),
    });
  }, [personnel]);

  // ── Şablondan Oluştur ─────────────────────────────────────────────────────
  const applyTemplate = useCallback(async (template_id, year, month, ekip_id, overwrite = false) => {
    return apiFetch("/shifts/from-template", {
      method: "POST",
      body: JSON.stringify({ template_id, year, month, ekip_id, overwrite }),
    });
  }, []);

  // ── Süpervizör Görüşü ─────────────────────────────────────────────────────
  const submitOpinion = useCallback(async (reqId, gorus, gerekce) => {
    return apiFetch(`/approvals/shift-requests/${reqId}/opinion`, {
      method: "POST",
      body: JSON.stringify({ gorus, gerekce }),
    });
  }, []);

  // ── Hafta Navigasyonu ─────────────────────────────────────────────────────
  const goToPrevWeek = useCallback(() => {
    const newStart = addDays(currentWeekStart, -7);
    setCurrentWeekStart(newStart);
    loadWeek(newStart);
    loadWeeklyStats(toDateStr(newStart), toDateStr(addDays(newStart, 6)));
  }, [currentWeekStart, loadWeek, loadWeeklyStats]);

  const goToNextWeek = useCallback(() => {
    const newStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newStart);
    loadWeek(newStart);
    loadWeeklyStats(toDateStr(newStart), toDateStr(addDays(newStart, 6)));
  }, [currentWeekStart, loadWeek, loadWeeklyStats]);

  const goToToday = useCallback(() => {
    const newStart = getMonday(new Date());
    setCurrentWeekStart(newStart);
    loadWeek(newStart);
    loadWeeklyStats(toDateStr(newStart), toDateStr(addDays(newStart, 6)));
  }, [loadWeek, loadWeeklyStats]);

  // ── İlk Yükleme ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadPersonnel();
    loadWeek(currentWeekStart);
    loadMonth(currentMonth.year, currentMonth.month);
    loadPendingRequests();
    loadWeeklyStats(
      toDateStr(currentWeekStart),
      toDateStr(addDays(currentWeekStart, 6))
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    personnel,
    weekShifts,
    monthlySummary,
    weeklyStats,
    pendingRequests,
    currentWeekStart,
    currentMonth,
    // Loading
    loadingWeek,
    loadingMonth,
    loadingStats,
    loadingRequests,
    error,
    // Actions
    loadWeek,
    loadMonth,
    loadWeeklyStats,
    loadPendingRequests,
    saveShift,
    deleteShift,
    bulkSave,
    applyTemplate,
    submitOpinion,
    // Navigation
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    setCurrentWeekStart,
  };
}
