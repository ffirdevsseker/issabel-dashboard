// ─── Nisan 2026 Aylık Veri ───────────────────────────────────────────────────

export const MONTH_META = {
  name: "Nisan 2026",
  year: 2026,
  month: 3, // 0-indexed
  startOffset: 2, // Çarşamba → Pzt=0 sayılırsa offset=2
  totalDays: 30,
  holidays: { 23: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
  weekends: new Set([5,6,12,13,19,20,26,27]),
  today: 28,
};

// 14 personel
export const PERSONNEL_LIST = [
  { id: 1,  name: "Ahmet Yıldız",   ext: "1001", initials: "AY" },
  { id: 2,  name: "Fatma Kaya",     ext: "1002", initials: "FK" },
  { id: 3,  name: "Mehmet Demir",   ext: "1003", initials: "MD" },
  { id: 4,  name: "Zeynep Arslan",  ext: "1004", initials: "ZA" },
  { id: 5,  name: "Ali Korkmaz",    ext: "1005", initials: "AK" },
  { id: 6,  name: "Ayşe Çelik",     ext: "1006", initials: "AÇ" },
  { id: 7,  name: "Can Öztürk",     ext: "1007", initials: "CÖ" },
  { id: 8,  name: "Selin Yıldırım", ext: "1008", initials: "SY" },
  { id: 9,  name: "Berk Şahin",     ext: "1009", initials: "BŞ" },
  { id: 10, name: "Merve Doğan",    ext: "1010", initials: "MD" },
  { id: 11, name: "Emre Aydın",     ext: "1011", initials: "EA" },
  { id: 12, name: "Deniz Kılıç",    ext: "1012", initials: "DK" },
  { id: 13, name: "Hande Polat",    ext: "1013", initials: "HP" },
  { id: 14, name: "Kemal Erdoğan",  ext: "1014", initials: "KE" },
];

// Vardiya tip tanımları
export const SHIFT_DEF = {
  gunduz: { label: "Gündüz", hours: "09:00-18:00", color: "#15803D", bg: "#DCFCE7", border: "#86EFAC" },
  sabah:  { label: "Sabah",  hours: "06:00-14:00", color: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD" },
  aksam:  { label: "Akşam",  hours: "14:00-22:00", color: "#6D28D9", bg: "#EDE9FE", border: "#C4B5FD" },
  gece:   { label: "Gece",   hours: "22:00-06:00", color: "#0F172A", bg: "#1E3A5F", border: "#1E40AF", textLight: true },
  izin:   { label: "İzin",   hours: null,          color: "#A16207", bg: "#FEF9C3", border: "#FDE047" },
  off:    { label: "OFF",    hours: null,          color: "#94A3B8", bg: "#F1F5F9", border: "#E2E8F0" },
};

// Her gün için personel planı üret
// Pattern: hafta içi varsayılan + bazı günler override
function buildMonthlyData() {
  const data = {};

  for (let day = 1; day <= 30; day++) {
    const isWeekend = MONTH_META.weekends.has(day);
    const isHoliday = !!MONTH_META.holidays[day];

    const personnel = PERSONNEL_LIST.map((p, idx) => {
      let shift = "gunduz";

      // Hafta sonu / tatil: bazıları çalışır, bazıları OFF
      if (isWeekend || isHoliday) {
        shift = idx < 3 ? (idx === 0 ? "gunduz" : "off") : "off";
      } else {
        // Rotasyon mantığı
        if (idx < 5)       shift = "gunduz";
        else if (idx < 8)  shift = "sabah";
        else if (idx < 11) shift = "aksam";
        else               shift = "gece";

        // Bazı günler izin
        if (idx === 1 && day === 25) shift = "izin";
        if (idx === 4 && day === 23) shift = "izin";
        if (idx === 7 && [3, 17].includes(day)) shift = "izin";
        if (idx === 10 && day === 9) shift = "izin";
        // 2 günde eksik personel: gün 3 ve gün 15 → ilk 8 kişi OFF
        if ([3, 15].includes(day) && idx >= 3 && idx < 11) shift = "izin";
      }

      // Bugün (28) gerçek giriş bilgisi
      let entry = null;
      if (day === 28 && shift !== "off" && shift !== "izin") {
        const entries = [
          { checked: true, time: "09:01", late: false },
          { checked: true, time: "06:02", late: false },
          { checked: true, time: "14:00", late: false },
          { checked: true, time: "22:00", late: false },
          { checked: true, time: "09:18", late: true },  // geç
          { checked: true, time: "06:00", late: false },
          { checked: false, time: null, late: false },    // henüz girmedi
          { checked: true, time: "06:05", late: false },
          { checked: false, time: null, late: false },
          { checked: true, time: "09:00", late: false },
          { checked: false, time: null, late: false },
          { checked: true, time: "22:03", late: false },
          { checked: true, time: "09:00", late: false },
          { checked: false, time: null, late: false },
        ];
        entry = entries[idx] || null;
      }

      return { personId: p.id, shift, entry };
    });

    // Gün meta
    const working = personnel.filter(p => p.shift !== "off" && p.shift !== "izin").length;
    const night   = personnel.filter(p => p.shift === "gece").length;
    const leave   = personnel.filter(p => p.shift === "izin").length;
    const pending = [7, 15, 22].includes(day) ? 1 : 0; // onay bekleyen

    data[day] = { day, personnel, working, night, leave, pending, isWeekend, isHoliday };
  }
  return data;
}

export const MONTHLY_PLAN = buildMonthlyData();

// Şablon seçenekleri
export const TEMPLATES = [
  { id: "std",   label: "Standart Hafta",  desc: "Pzt–Cum 09:00-18:00, hafta sonu kapalı" },
  { id: "rotA",  label: "Rotasyon A",       desc: "Sabah/Akşam dönüşümlü, 5 gün" },
  { id: "rotB",  label: "Rotasyon B",       desc: "Hafta sonu dahil tam kadro" },
  { id: "custom",label: "Özel şablon oluştur", desc: "" },
];
