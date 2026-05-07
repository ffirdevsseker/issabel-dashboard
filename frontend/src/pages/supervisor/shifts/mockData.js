// ── Hafta günleri (21-27 Nisan 2026, Pazartesi=0) ──
export const WEEK_DAYS = [
  { label: "Pzt", num: 21, full: "Pazartesi, 21 Nisan", isToday: false },
  { label: "Sal", num: 22, full: "Salı, 22 Nisan", isToday: false },
  { label: "Çar", num: 23, full: "Çarşamba, 23 Nisan", isToday: true },
  { label: "Per", num: 24, full: "Perşembe, 24 Nisan", isToday: false },
  { label: "Cum", num: 25, full: "Cuma, 25 Nisan", isToday: false },
  { label: "Cmt", num: 26, full: "Cumartesi, 26 Nisan", isToday: false },
  { label: "Paz", num: 27, full: "Pazar, 27 Nisan", isToday: false },
];

// Vardiya tipi tanımları
export const SHIFT_TYPES = {
  sabah:  { label: "Sabah",  hours: "06:00-14:00", color: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD", textColor: "#1E40AF" },
  gunduz: { label: "Gündüz", hours: "09:00-18:00", color: "#15803D", bg: "#DCFCE7", border: "#86EFAC", textColor: "#166534" },
  aksam:  { label: "Akşam",  hours: "14:00-22:00", color: "#6D28D9", bg: "#EDE9FE", border: "#C4B5FD", textColor: "#5B21B6" },
  gece:   { label: "Gece",   hours: "22:00-06:00", color: "#93C5FD", bg: "#1E3A5F", border: "#1E40AF", textColor: "#BFDBFE" },
  izin:   { label: "İzin",   hours: null,          color: "#A16207", bg: "#FEF9C3", border: "#FDE047", textColor: "#854D0E" },
  kapali: { label: "Kapalı", hours: null,          color: "#94A3B8", bg: "#F1F5F9", border: "#CBD5E1", textColor: "#64748B" },
};

// Kapasite verisi (her gün için çalışan/toplam)
export const CAPACITY = [
  { current: 8, total: 10 }, // Pzt
  { current: 9, total: 10 }, // Sal
  { current: 10, total: 10 }, // Çar - today
  { current: 3, total: 10 }, // Per - DÜŞÜK
  { current: 7, total: 10 }, // Cum
  { current: 5, total: 10 }, // Cmt
  { current: 6, total: 10 }, // Paz
];

// 14 personel mock verisi
export const PERSONNEL = [
  {
    id: 1, name: "Ahmet Yıldız", ext: "1001",
    totalHours: 45, // fazla mesai
    shifts: [
      { type: "gunduz", realEntry: "09:23", draft: false },
      { type: "gunduz", realEntry: "09:05", draft: false },
      { type: "gunduz", realEntry: "09:01", draft: true },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 2, name: "Fatma Kaya", ext: "1002",
    totalHours: 40,
    shifts: [
      { type: "sabah", realEntry: "06:00", draft: false },
      { type: "sabah", realEntry: "06:12", draft: false },
      { type: "sabah", realEntry: "06:00", draft: false },
      { type: "sabah", realEntry: null, draft: false },
      { type: "izin",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 3, name: "Mehmet Demir", ext: "1003",
    totalHours: 32, // eksik saat
    shifts: [
      { type: "aksam", realEntry: "14:00", draft: false },
      { type: "aksam", realEntry: "14:05", draft: false },
      { type: "aksam", realEntry: "14:00", draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
    ],
  },
  {
    id: 4, name: "Zeynep Arslan", ext: "1004",
    totalHours: 40,
    shifts: [
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: null, draft: false },
      { type: "gece",   realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 5, name: "Ali Korkmaz", ext: "1005",
    totalHours: 40,
    shifts: [
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: null,     realEntry: null, draft: false }, // boş/atanmamış
      { type: "gunduz", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 6, name: "Ayşe Çelik", ext: "1006",
    totalHours: 40,
    shifts: [
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 7, name: "Can Öztürk", ext: "1007",
    totalHours: 40,
    shifts: [
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: null, draft: false },
      { type: "aksam",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 8, name: "Selin Yıldırım", ext: "1008",
    totalHours: 40,
    shifts: [
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 9, name: "Berk Şahin", ext: "1009",
    totalHours: 40,
    shifts: [
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: "22:00", draft: false },
      { type: "gece",   realEntry: null, draft: false },
      { type: "gece",   realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 10, name: "Merve Doğan", ext: "1010",
    totalHours: 40,
    shifts: [
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 11, name: "Emre Aydın", ext: "1011",
    totalHours: 40,
    shifts: [
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 12, name: "Deniz Kılıç", ext: "1012",
    totalHours: 40,
    shifts: [
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: "14:00", draft: false },
      { type: "aksam",  realEntry: null, draft: false },
      { type: "aksam",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 13, name: "Hande Polat", ext: "1013",
    totalHours: 40,
    shifts: [
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "izin",   realEntry: null, draft: false },
      { type: "gunduz", realEntry: "09:00", draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "gunduz", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
  {
    id: 14, name: "Kemal Erdoğan", ext: "1014",
    totalHours: 40,
    shifts: [
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: "06:00", draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "sabah",  realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
      { type: "kapali", realEntry: null, draft: false },
    ],
  },
];

// Bekleyen talepler
export const PENDING_REQUESTS = [
  {
    id: 1,
    personId: 1,
    name: "Ahmet Yıldız",
    ext: "1001",
    type: "degisiklik",
    typeLabel: "Vardiya Değişiklik",
    from: "Per 24 Nis, 09:00-18:00",
    to: "Cuma 25 Nis, 09:00-18:00",
    date: "26 Nis",
    reason: "Çarşamba günü doktor randevum var, cuma günü karşılıklı değişebiliriz.",
    status: "bekliyor",
  },
  {
    id: 2,
    personId: 2,
    name: "Fatma Kaya",
    ext: "1002",
    type: "izin",
    typeLabel: "İzin Talebi",
    from: null,
    to: "25 Nis (Cuma) — 1 gün — Ücretsiz İzin",
    date: "25 Nis",
    reason: "Acil ailevi bir durum oluştu, bir günlük izin talep ediyorum.",
    status: "bekliyor",
  },
  {
    id: 3,
    personId: 5,
    name: "Ali Korkmaz",
    ext: "1005",
    type: "erken",
    typeLabel: "Erken Çıkış",
    from: null,
    to: "23 Nis (Çar) — 15:00 çıkış",
    date: "23 Nis",
    reason: "Çocuğumun okul etkinliğine katılmam gerekiyor.",
    status: "bekliyor",
  },
];

// Admin talimatları
export const ADMIN_DIRECTIVES = [
  {
    id: 1,
    title: "Bayram Öncesi Vardiya Düzenlemesi",
    desc: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı nedeniyle tüm personelin vardiya planı gözden geçirilmeli. Gönüllü fazla mesai listesi hazırlanacak.",
    priority: "zorunlu",
    affected: ["Ahmet Yıldız", "Fatma Kaya", "Mehmet Demir", "+5"],
    date: "22 Nis",
    read: false,
  },
];

// Aylık takvim verisi (Nisan 2026)
export const MONTHLY_DATA = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isWeekend = [5, 6, 12, 13, 19, 20, 26, 27].includes(day);
  const isHoliday = day === 23;
  const isToday = day === 28;
  const count = isWeekend ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 5) + 6;
  return { day, isWeekend, isHoliday, isToday, count, total: 14, holidayName: isHoliday ? "23 Nisan Ulusal Egemenlik" : null };
});
