import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Play, Pause,
  Download, Share2, X, Search, ChevronDown, ChevronLeft, ChevronRight,
  Star, Sparkles, ArrowUp, ArrowDown, ArrowUpDown,
  Clock, Users, TrendingUp, AlertTriangle,
  Mic, CheckCircle, Edit3, Plus, RotateCcw,
  PhoneCall
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ─────────────────────────────────────────────────────────────────
   YARDIMCI FONKSİYONLAR
───────────────────────────────────────────────────────────────── */
function formatDur(sec) {
  if (!sec || sec === 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}s ${m}d ${s}s`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s}s`;
}
function formatMMSS(sec) {
  if (!sec || sec === 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatDate(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleString("tr-TR"),
    raw: d,
  };
}

function simpleHash(str) {
  return String(str).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}

const AVATAR_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#6366f1",
];
function avatarColor(str) {
  return AVATAR_COLORS[Math.abs(simpleHash(str)) % AVATAR_COLORS.length];
}
function getInitials(name) {
  const tokens = (name || "").trim().split(/\s+/);
  if (!tokens[0]) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toLocaleUpperCase('tr-TR');
}

function generateWaveformBars(seed, count = 70) {
  return Array.from({ length: count }, (_, i) => {
    const position = i / count;
    const envelope = Math.sin(position * Math.PI);
    const h = simpleHash(seed + "_bar_" + i);
    const noise = Math.abs(h % 100) / 100;
    return Math.max(8, Math.round((envelope * 0.7 + noise * 0.3) * 92));
  });
}

/* ─────────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────────── */
// Mock data'da her çağrının agentId'i login olan kullanıcıyla eşleştirilir.
// Gerçek senaryoda: backend /api/cdr?agent=<username> şeklinde filtreli döner.
const MOCK_CALLS = [
  {
    id: "call-001", direction: "giden", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-001", name: "Ahmet Yılmaz", phone: "0532 411 2218", extension: "1001",
      department: "Muhasebe", totalCalls: 24, callsThisMonth: 3, answerRate: 0.88,
      previousCalls: [
        { id: "p1", date: "2025-04-15T14:22:00", result: "basarili", tag: "satis", duration: 252 },
        { id: "p2", date: "2025-04-10T09:45:00", result: "aktarildi", tag: "bilgi", duration: 158 },
        { id: "p3", date: "2025-04-08T11:03:00", result: "kacan", tag: "bilgi", duration: 0 },
        { id: "p4", date: "2025-04-02T16:10:00", result: "basarili", tag: "sikayet", duration: 535 },
      ],
    },
    department: "Muhasebe", duration: 118, waitTime: 32,
    startedAt: "2025-04-20T06:55:00", endedAt: "2025-04-20T06:56:58",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-001"), totalDuration: 118, playedDuration: 41 },
    aiSummary: {
      topic: "Yeni ürün satış görüşmesi", action: "Ürün özellikleri anlatıldı, demo talebi alındı, takip araması planlandı (23 Nis için)",
      result: "takip", sentimentScore: 65, sentimentLabel: "olumlu",
      keywords: ["demo", "fiyatlandırma", "kurulum", "Q2 hedef"], approved: false,
    },
    note: { text: "İlgili ürün hakkında detaylı bilgi verildi. Demo için randevu alındı.", tags: ["satis"], updatedAt: "2025-04-20T07:10:00", updatedBy: "Personel 1001" },
    csat: { score: 4, comment: "Çok yardımcı oldunuz, teşekkürler.", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:05", speaker: "Personel", text: "Merhaba, nasıl yardımcı olabilirim?" },
      { time: "00:12", speaker: "Müşteri", text: "Evet merhaba, ürün hakkında bilgi almak istiyorum..." },
      { time: "01:44", speaker: "Personel", text: "Anlıyorum, demo ayarlayalım o zaman." },
    ],
  },
  {
    id: "call-002", direction: "gelen", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-002", name: "Zeynep Kaya", phone: "0545 332 7761", extension: "1045",
      department: "E-Ticaret", totalCalls: 11, callsThisMonth: 2, answerRate: 0.91,
      previousCalls: [
        { id: "p5", date: "2025-04-18T10:00:00", result: "basarili", tag: "bilgi", duration: 190 },
        { id: "p6", date: "2025-04-12T14:30:00", result: "basarili", tag: "teknik", duration: 320 },
      ],
    },
    department: "E-Ticaret", duration: 245, waitTime: 18,
    startedAt: "2025-04-20T08:12:00", endedAt: "2025-04-20T08:16:05",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-002"), totalDuration: 245, playedDuration: 90 },
    aiSummary: {
      topic: "Sipariş takip ve iade talebi", action: "İade süreci açıklandı, müşteri yönlendirildi",
      result: "tamamlandi", sentimentScore: 78, sentimentLabel: "olumlu",
      keywords: ["iade", "sipariş", "kargo", "onay"], approved: true,
    },
    note: { text: "Müşteri siparişinin iade sürecini sorguladı.", tags: ["bilgi", "takip"], updatedAt: "2025-04-20T08:20:00", updatedBy: "Personel 1045" },
    csat: { score: 5, comment: "Çok hızlı çözüldü!", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:03", speaker: "Personel", text: "Merhaba, Zeynep Hanım nasıl yardımcı olabilirim?" },
      { time: "00:15", speaker: "Müşteri", text: "Siparişim nerede, hâlâ gelmedi." },
      { time: "01:20", speaker: "Personel", text: "Şu an kargo takibini yapıyorum, yarın elinizde olacak." },
    ],
  },
  {
    id: "call-003", direction: "cevapsiz", result: "kacan", action: "ivr",
    customer: {
      id: "cust-003", name: "Murat Öztürk", phone: "0501 887 4423", extension: "",
      department: "Müşteri Hizmetleri", totalCalls: 6, callsThisMonth: 1, answerRate: 0.67,
      previousCalls: [
        { id: "p7", date: "2025-04-17T09:00:00", result: "basarili", tag: "sikayet", duration: 410 },
      ],
    },
    department: "Müşteri Hizmetleri", duration: 0, waitTime: 0,
    startedAt: "2025-04-20T09:30:00", endedAt: "2025-04-20T09:30:00",
    hasRecording: false, aiSummary: undefined,
    note: undefined,
    csat: { score: null, status: "pending" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-004", direction: "giden", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-004", name: "Elif Şahin", phone: "0533 654 9902", extension: "1078",
      department: "Stok Yönetimi", totalCalls: 19, callsThisMonth: 4, answerRate: 0.95,
      previousCalls: [
        { id: "p8", date: "2025-04-19T11:00:00", result: "basarili", tag: "teknik", duration: 185 },
        { id: "p9", date: "2025-04-16T15:45:00", result: "aktarildi", tag: "satis", duration: 95 },
      ],
    },
    department: "Stok Yönetimi", duration: 687, waitTime: 58,
    startedAt: "2025-04-20T10:05:00", endedAt: "2025-04-20T10:16:27",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-004"), totalDuration: 687, playedDuration: 200 },
    aiSummary: {
      topic: "Depo stok senkronizasyon sorunu", action: "Teknik ekibe bilet açıldı, geçici çözüm anlatıldı",
      result: "takip", sentimentScore: 48, sentimentLabel: "notr",
      keywords: ["senkronizasyon", "depo", "ERP", "kritik"], approved: false,
    },
    note: { text: "Stok sistemi ile ERP arasında uyumsuzluk var. Teknik ekip arandı.", tags: ["teknik", "takip"], updatedAt: "2025-04-20T10:20:00", updatedBy: "Personel 1078" },
    csat: { score: null, status: "no_response" },
    isLongCall: true, isHighWait: true, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:10", speaker: "Müşteri", text: "Sistem sabahtan beri doğru çalışmıyor." },
      { time: "00:45", speaker: "Personel", text: "Anlıyorum, teknik ekibimize yönlendiriyorum." },
      { time: "05:12", speaker: "Personel", text: "Geçici çözüm şu şekilde: ayarları şöyle değiştirin..." },
    ],
  },
  {
    id: "call-005", direction: "gelen", result: "aktarildi", action: "transfer",
    customer: {
      id: "cust-005", name: "Can Demirci", phone: "0542 221 5567", extension: "1033",
      department: "Muhasebe", totalCalls: 8, callsThisMonth: 2, answerRate: 0.75,
      previousCalls: [
        { id: "p10", date: "2025-04-14T13:00:00", result: "basarili", tag: "bilgi", duration: 220 },
      ],
    },
    department: "Muhasebe", duration: 95, waitTime: 67,
    startedAt: "2025-04-20T11:22:00", endedAt: "2025-04-20T11:23:35",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-005"), totalDuration: 95, playedDuration: 30 },
    aiSummary: undefined,
    note: { text: "Muhasebe bölümüne aktarıldı.", tags: ["bilgi"], updatedAt: "2025-04-20T11:25:00", updatedBy: "Personel 1033" },
    csat: { score: 3, comment: "İşlem biraz uzadı.", status: "answered" },
    isLongCall: false, isHighWait: true, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-006", direction: "cevapsiz", result: "kacan", action: "ivr",
    customer: {
      id: "cust-006", name: "Hande Yılmaz", phone: "0507 443 8821", extension: "",
      department: "E-Ticaret", totalCalls: 3, callsThisMonth: 1, answerRate: 0.5,
      previousCalls: [],
    },
    department: "E-Ticaret", duration: 0, waitTime: 0,
    startedAt: "2025-04-20T12:00:00", endedAt: "2025-04-20T12:00:00",
    hasRecording: false, aiSummary: undefined, note: undefined,
    csat: { score: null, status: "pending" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-007", direction: "giden", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-007", name: "Ömer Çelik", phone: "0533 118 2290", extension: "1012",
      department: "Müşteri Hizmetleri", totalCalls: 32, callsThisMonth: 5, answerRate: 0.94,
      previousCalls: [
        { id: "p11", date: "2025-04-19T08:30:00", result: "basarili", tag: "satis", duration: 305 },
        { id: "p12", date: "2025-04-15T16:00:00", result: "basarili", tag: "bilgi", duration: 128 },
      ],
    },
    department: "Müşteri Hizmetleri", duration: 830, waitTime: 12,
    startedAt: "2025-04-20T13:40:00", endedAt: "2025-04-20T13:54:10",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-007"), totalDuration: 830, playedDuration: 400 },
    aiSummary: {
      topic: "Uzun süreli müşteri şikayeti çözümü", action: "Sorun kök nedeni bulundu, kalıcı çözüm uygulandı",
      result: "tamamlandi", sentimentScore: 82, sentimentLabel: "olumlu",
      keywords: ["şikayet", "çözüm", "memnuniyet", "uzun görüşme"], approved: true,
    },
    note: { text: "Uzun ve detaylı görüşme yapıldı. Müşteri tamamen memnun.", tags: ["sikayet", "takip"], updatedAt: "2025-04-20T14:00:00", updatedBy: "Personel 1012" },
    csat: { score: 5, comment: "Harika hizmet!", status: "answered" },
    isLongCall: true, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:05", speaker: "Personel", text: "Sayın Ömer Bey, merhaba." },
      { time: "00:30", speaker: "Müşteri", text: "Evet, geçen haftadan beri çözülemeyen bir sorunum var..." },
      { time: "12:10", speaker: "Personel", text: "Sorun tamamen çözüldü, özür dileriz." },
    ],
  },
  {
    id: "call-008", direction: "gelen", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-008", name: "Selin Arslan", phone: "0546 778 3345", extension: "1091",
      department: "Stok Yönetimi", totalCalls: 7, callsThisMonth: 1, answerRate: 0.86,
      previousCalls: [
        { id: "p13", date: "2025-04-10T09:00:00", result: "basarili", tag: "teknik", duration: 240 },
      ],
    },
    department: "Stok Yönetimi", duration: 165, waitTime: 22,
    startedAt: "2025-04-20T14:15:00", endedAt: "2025-04-20T14:17:45",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-008"), totalDuration: 165, playedDuration: 60 },
    aiSummary: {
      topic: "Stok raporu güncelleme talebi", action: "Güncel rapor gönderildi, otomatik güncelleme ayarlandı",
      result: "tamamlandi", sentimentScore: 71, sentimentLabel: "olumlu",
      keywords: ["stok", "rapor", "güncelleme", "otomatik"], approved: false,
    },
    note: { text: "Aylık stok raporu güncellemesi yapıldı.", tags: ["teknik"], updatedAt: "2025-04-20T14:20:00", updatedBy: "Personel 1091" },
    csat: { score: 4, comment: "", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-009", direction: "cevapsiz", result: "kacan", action: "ivr",
    customer: {
      id: "cust-009", name: "Burak Koç", phone: "0555 902 1134", extension: "",
      department: "Muhasebe", totalCalls: 4, callsThisMonth: 1, answerRate: 0.5,
      previousCalls: [],
    },
    department: "Muhasebe", duration: 0, waitTime: 0,
    startedAt: "2025-04-20T15:10:00", endedAt: "2025-04-20T15:10:00",
    hasRecording: false, aiSummary: undefined, note: undefined,
    csat: { score: null, status: "pending" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-010", direction: "gelen", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-010", name: "Neslihan Güneş", phone: "0538 451 6678", extension: "1055",
      department: "E-Ticaret", totalCalls: 15, callsThisMonth: 3, answerRate: 0.93,
      previousCalls: [
        { id: "p14", date: "2025-04-18T11:00:00", result: "basarili", tag: "satis", duration: 360 },
        { id: "p15", date: "2025-04-13T14:20:00", result: "basarili", tag: "bilgi", duration: 200 },
      ],
    },
    department: "E-Ticaret", duration: 310, waitTime: 14,
    startedAt: "2025-04-20T16:00:00", endedAt: "2025-04-20T16:05:10",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-010"), totalDuration: 310, playedDuration: 100 },
    aiSummary: {
      topic: "Kampanya ve indirim bilgisi", action: "Aktif kampanyalar anlatıldı, özel teklif sunuldu",
      result: "tamamlandi", sentimentScore: 88, sentimentLabel: "olumlu",
      keywords: ["kampanya", "indirim", "özel teklif", "ürün"], approved: true,
    },
    note: { text: "Mevcut kampanyalar hakkında bilgi verildi. Satın alma kararı aldı.", tags: ["satis", "bilgi"], updatedAt: "2025-04-20T16:10:00", updatedBy: "Personel 1055" },
    csat: { score: 5, comment: "Çok iyi hizmet!", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:08", speaker: "Müşteri", text: "İndirim var mı şu aralar?" },
      { time: "00:30", speaker: "Personel", text: "Evet, bu hafta özel %25 indirim kampanyamız var." },
    ],
  },
  {
    id: "call-011", direction: "giden", result: "mesgul", action: "kapatma",
    customer: {
      id: "cust-011", name: "Tarık Aydın", phone: "0542 667 1198", extension: "",
      department: "Müşteri Hizmetleri", totalCalls: 5, callsThisMonth: 1, answerRate: 0.6,
      previousCalls: [],
    },
    department: "Müşteri Hizmetleri", duration: 0, waitTime: 5,
    startedAt: "2025-04-20T16:30:00", endedAt: "2025-04-20T16:30:05",
    hasRecording: false, aiSummary: undefined, note: undefined,
    csat: { score: null, status: "pending" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-012", direction: "gelen", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-012", name: "Pelin Yıldırım", phone: "0501 334 7789", extension: "1067",
      department: "Muhasebe", totalCalls: 22, callsThisMonth: 4, answerRate: 0.91,
      previousCalls: [
        { id: "p16", date: "2025-04-20T08:00:00", result: "basarili", tag: "bilgi", duration: 180 },
        { id: "p17", date: "2025-04-17T10:30:00", result: "basarili", tag: "satis", duration: 290 },
      ],
    },
    department: "Muhasebe", duration: 425, waitTime: 38,
    startedAt: "2025-04-20T17:20:00", endedAt: "2025-04-20T17:27:05",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-012"), totalDuration: 425, playedDuration: 150 },
    aiSummary: {
      topic: "Fatura itirazı ve açıklama talebi", action: "Fatura kalemleri açıklandı, indirim uygulandı",
      result: "tamamlandi", sentimentScore: 55, sentimentLabel: "notr",
      keywords: ["fatura", "itiraz", "indirim", "muhasebe"], approved: false,
    },
    note: { text: "Fatura tutarı açıklandı, müşteri memnun ayrıldı.", tags: ["sikayet", "bilgi"], updatedAt: "2025-04-20T17:30:00", updatedBy: "Personel 1067" },
    csat: { score: 4, comment: "Sorunum çözüldü.", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-013", direction: "gelen", result: "aktarildi", action: "transfer",
    customer: {
      id: "cust-013", name: "Berk Aksoy", phone: "0533 990 2201", extension: "1088",
      department: "Stok Yönetimi", totalCalls: 9, callsThisMonth: 2, answerRate: 0.78,
      previousCalls: [
        { id: "p18", date: "2025-04-16T13:00:00", result: "basarili", tag: "teknik", duration: 310 },
      ],
    },
    department: "Stok Yönetimi", duration: 72, waitTime: 29,
    startedAt: "2025-04-20T18:05:00", endedAt: "2025-04-20T18:06:12",
    hasRecording: false, aiSummary: undefined,
    note: { text: "Teknik desteğe aktarıldı.", tags: ["teknik"], updatedAt: "2025-04-20T18:08:00", updatedBy: "Personel 1088" },
    csat: { score: null, status: "no_response" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-014", direction: "giden", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-014", name: "Merve Koçak", phone: "0545 771 3312", extension: "1023",
      department: "E-Ticaret", totalCalls: 18, callsThisMonth: 3, answerRate: 0.89,
      previousCalls: [
        { id: "p19", date: "2025-04-19T15:30:00", result: "basarili", tag: "satis", duration: 220 },
      ],
    },
    department: "E-Ticaret", duration: 380, waitTime: 8,
    startedAt: "2025-04-20T19:10:00", endedAt: "2025-04-20T19:16:20",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-014"), totalDuration: 380, playedDuration: 130 },
    aiSummary: {
      topic: "Yeni üyelik ve hoşgeldin paketi", action: "Üyelik avantajları anlatıldı, özel kod gönderildi",
      result: "tamamlandi", sentimentScore: 90, sentimentLabel: "olumlu",
      keywords: ["üyelik", "hoşgeldin", "indirim", "kod"], approved: true,
    },
    note: { text: "Yeni müşteri. Onboarding tamamlandı, tüm avantajlar anlatıldı.", tags: ["satis"], updatedAt: "2025-04-20T19:20:00", updatedBy: "Personel 1023" },
    csat: { score: 5, comment: "Harikasınız!", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
  {
    id: "call-015", direction: "gelen", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-015", name: "Gazi Şimşek", phone: "0507 123 9988", extension: "1099",
      department: "Müşteri Hizmetleri", totalCalls: 40, callsThisMonth: 6, answerRate: 0.98,
      previousCalls: [
        { id: "p20", date: "2025-04-20T06:00:00", result: "basarili", tag: "bilgi", duration: 145 },
        { id: "p21", date: "2025-04-19T17:00:00", result: "basarili", tag: "satis", duration: 288 },
      ],
    },
    department: "Müşteri Hizmetleri", duration: 52, waitTime: 7,
    startedAt: "2025-04-20T20:00:00", endedAt: "2025-04-20T20:00:52",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-015"), totalDuration: 52, playedDuration: 20 },
    aiSummary: {
      topic: "Kısa bilgi talebi", action: "Anında bilgi verildi, görüşme kısa sürdü",
      result: "bilgi", sentimentScore: 85, sentimentLabel: "olumlu",
      keywords: ["hızlı", "çözüm", "bilgi"], approved: true,
    },
    note: { text: "Kısa ve hızlı görüşme. Müşteri memnun.", tags: ["bilgi"], updatedAt: "2025-04-20T20:05:00", updatedBy: "Personel 1099" },
    csat: { score: 5, comment: "", status: "answered" },
    isLongCall: false, isHighWait: false, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [
      { time: "00:02", speaker: "Müşteri", text: "Çalışma saatleriniz nedir?" },
      { time: "00:08", speaker: "Personel", text: "7/24 hizmet veriyoruz." },
    ],
  },
  {
    id: "call-016", direction: "giden", result: "basarili", action: "cevaplandi",
    customer: {
      id: "cust-016", name: "Derya Polat", phone: "0542 880 5544", extension: "1037",
      department: "Muhasebe", totalCalls: 12, callsThisMonth: 2, answerRate: 0.83,
      previousCalls: [
        { id: "p22", date: "2025-04-18T09:45:00", result: "basarili", tag: "satis", duration: 455 },
      ],
    },
    department: "Muhasebe", duration: 640, waitTime: 55,
    startedAt: "2025-04-19T14:20:00", endedAt: "2025-04-19T14:30:40",
    hasRecording: true,
    waveform: { bars: generateWaveformBars("call-016"), totalDuration: 640, playedDuration: 200 },
    aiSummary: {
      topic: "Yıllık sözleşme yenileme görüşmesi", action: "Yeni koşullar görüşüldü, sözleşme taslağı hazırlandı",
      result: "takip", sentimentScore: 60, sentimentLabel: "notr",
      keywords: ["sözleşme", "yenileme", "fiyat", "müzakere"], approved: false,
    },
    note: { text: "Yıllık sözleşme yenileme. Müşteri fiyat konusunda düşünüyor.", tags: ["satis", "takip"], updatedAt: "2025-04-19T14:35:00", updatedBy: "Personel 1037" },
    csat: { score: 3, comment: "Beklentilerime tam uymadı.", status: "answered" },
    isLongCall: true, isHighWait: true, agentId: "ahmet", agentName: "Ahmet Yılmaz",
    transcript: [],
  },
];

/* ─────────────────────────────────────────────────────────────────
   BADGES
───────────────────────────────────────────────────────────────── */
function DirectionBadge({ direction, size = "md" }) {
  const cfg = {
    giden: { label: "Giden", cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: PhoneOutgoing },
    gelen: { label: "Gelen", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: PhoneIncoming },
    cevapsiz: { label: "Cevapsız", cls: "bg-red-100 text-red-600 border-red-200", Icon: PhoneMissed },
  }[direction] || { label: direction, cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: Phone };
  const sz = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-[11px] px-2 py-1 gap-1.5";
  const iconSz = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${sz} ${cfg.cls}`}>
      <cfg.Icon className={iconSz} strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

function ResultBadge({ result }) {
  const map = {
    basarili: "bg-emerald-100 text-emerald-700 border-emerald-200",
    kacan: "bg-red-100 text-red-600 border-red-200",
    mesgul: "bg-amber-100 text-amber-700 border-amber-200",
    aktarildi: "bg-blue-100 text-blue-700 border-blue-200",
    bekletme: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const labels = { basarili: "Başarılı", kacan: "Kaçan", mesgul: "Meşgul", aktarildi: "Aktarıldı", bekletme: "Bekletme" };
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold border ${map[result] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {labels[result] || result}
    </span>
  );
}

const DEPT_COLORS = {
  "Muhasebe": "bg-purple-100 text-purple-700 border-purple-200",
  "E-Ticaret": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Stok Yönetimi": "bg-orange-100 text-orange-700 border-orange-200",
  "Müşteri Hizmetleri": "bg-emerald-100 text-emerald-700 border-emerald-200",
};
function DeptBadge({ dept }) {
  const cls = DEPT_COLORS[dept] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold border ${cls}`}>
      {dept}
    </span>
  );
}

const TAG_COLORS = {
  satis: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sikayet: "bg-red-50 text-red-700 border-red-200",
  bilgi: "bg-blue-50 text-blue-700 border-blue-200",
  teknik: "bg-purple-50 text-purple-700 border-purple-200",
  takip: "bg-amber-50 text-amber-700 border-amber-200",
};
const TAG_LABELS = { satis: "Satış", sikayet: "Şikayet", bilgi: "Bilgi", teknik: "Teknik", takip: "Takip" };

/* ─────────────────────────────────────────────────────────────────
   STAT KARTLARI
───────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, sub, color, active, onClick, progress }) {
  const colors = {
    blue: { bg: "bg-blue-50", icon: "text-blue-500", val: "text-blue-700", bar: "bg-blue-400", ring: "ring-blue-300" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-500", val: "text-emerald-700", bar: "bg-emerald-400", ring: "ring-emerald-300" },
    red: { bg: "bg-red-50", icon: "text-red-500", val: "text-red-700", bar: "bg-red-400", ring: "ring-red-300" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500", val: "text-purple-700", bar: "bg-purple-400", ring: "ring-purple-300" },
    orange: { bg: "bg-orange-50", icon: "text-orange-500", val: "text-orange-700", bar: "bg-orange-400", ring: "ring-orange-300" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${active ? `ring-2 ${c.ring} border-transparent shadow-md` : "border-slate-200"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-7 w-7 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${c.icon}`} strokeWidth={2.5} />
        </div>
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      </div>
      <div className={`text-[22px] font-bold leading-none mb-0.5 ${c.val}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WAVEFORM BİLEŞENİ
───────────────────────────────────────────────────────────────── */
function Waveform({ bars, progress, onSeek, isPlaying }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const containerRef = useRef(null);

  const handleClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(Math.max(0, Math.min(1, x / rect.width)));
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-14 flex items-end gap-[2px] bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 cursor-pointer overflow-hidden"
      onClick={handleClick}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {bars.map((h, i) => {
        const barProgress = i / bars.length;
        const isPast = barProgress <= progress;
        const isHover = hoverIdx !== null && Math.abs(i - hoverIdx) <= 1;
        return (
          <div
            key={i}
            className="shrink-0 rounded-sm transition-colors duration-75"
            style={{
              width: "3px",
              height: `${Math.max(10, (h / 100) * 96)}%`,
              backgroundColor: isPast ? "#1DB954" : isHover ? "#4ade80" : "#e2e8f0",
              borderRadius: "2px 2px 0 0",
            }}
            onMouseEnter={() => setHoverIdx(i)}
          />
        );
      })}
      {/* Progress line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-[#1DB954]/80 rounded-full pointer-events-none"
        style={{ left: `calc(${progress * 100}% - 1px)` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AUDIO PLAYER
───────────────────────────────────────────────────────────────── */
function AudioPlayer({ call }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(call.waveform ? call.waveform.playedDuration / call.waveform.totalDuration : 0);
  const [speed, setSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState("waveform");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const intervalRef = useRef(null);

  const bars = useMemo(() => call.waveform?.bars || generateWaveformBars(call.id), [call.id, call.waveform]);
  const totalDur = call.waveform?.totalDuration || call.duration || 120;

  const toggle = () => {
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 1) { clearInterval(intervalRef.current); setPlaying(false); return 0; }
          return p + (speed * 0.008);
        });
      }, 80);
    }
  };
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const progressSec = Math.round(progress * totalDur);

  if (!call.hasRecording) return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <div className="text-slate-400 text-[12px]">Bu çağrı için ses kaydı bulunmuyor</div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
        <Mic className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[12px] font-bold text-slate-700">Ses Kaydı</span>
        <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Demo mod</span>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {["waveform", "transkript"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 h-8 text-[11px] font-semibold transition-colors ${activeTab === t ? "text-[#1DB954] border-b-2 border-[#1DB954]" : "text-slate-400 hover:text-slate-600"}`}>
            {t === "waveform" ? "Waveform" : "Transkript"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "waveform" ? (
          <>
            <Waveform bars={bars} progress={progress} onSeek={setProgress} isPlaying={playing} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 mb-3">
              <span>{formatMMSS(progressSec)}</span>
              <span>{formatMMSS(totalDur)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle}
                className="h-9 w-9 rounded-full bg-[#1DB954] hover:bg-[#17a348] text-white flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <div className="flex items-center gap-1 ml-1">
                {[0.5, 1, 1.5, 2].map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${speed === s ? "bg-[#1DB954]/15 text-[#1DB954]" : "text-slate-400 hover:text-slate-600"}`}>
                    {s}x
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <button className="h-7 w-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                  <Download className="h-3 w-3" />
                </button>
                <button className="h-7 w-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                  <Share2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 focus-within:border-[#1DB954]/40 transition-colors">
              <Search className="h-3 w-3 text-slate-400 shrink-0" />
              <input placeholder="Transkript ara..." value={transcriptSearch} onChange={e => setTranscriptSearch(e.target.value)}
                className="w-full text-[11px] bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400" />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(call.transcript || []).length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-4">Transkript mevcut değil</div>
              ) : (call.transcript || []).filter(l => !transcriptSearch || l.text.toLocaleLowerCase('tr-TR').includes(transcriptSearch.toLocaleLowerCase('tr-TR'))).map((line, i) => {
                const isPersonnel = line.speaker === "Personel";
                const highlight = transcriptSearch && line.text.toLocaleLowerCase('tr-TR').includes(transcriptSearch.toLocaleLowerCase('tr-TR'));
                return (
                  <div key={i} className={`rounded-xl px-3 py-2 ${highlight ? "bg-yellow-50 border border-yellow-200" : isPersonnel ? "bg-[#1DB954]/5 border border-[#1DB954]/10" : "bg-slate-50 border border-slate-100"}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-mono text-slate-400">[{line.time}]</span>
                      <span className={`text-[9px] font-bold ${isPersonnel ? "text-[#1DB954]" : "text-blue-500"}`}>{line.speaker}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{line.text}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AI ÖZET KARTI
───────────────────────────────────────────────────────────────── */
function SentimentRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 65 ? "#1DB954" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
        <circle cx="35" cy="35" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-slate-700">{score}%</span>
      </div>
    </div>
  );
}

function AISummaryCard({ ai }) {
  if (!ai) return null;
  const resultsMap = {
    takip: { label: "Takip Gerekli", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    tamamlandi: { label: "Tamamlandı", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    eskalasyon: { label: "Eskalasyon", cls: "bg-red-100 text-red-700 border-red-200" },
    bilgi: { label: "Bilgi Verildi", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  };
  const res = resultsMap[ai.result] || resultsMap.bilgi;
  return (
    <div className="rounded-2xl border-l-[3px] border-[#7F77DD] bg-[#EEEDFE]/60 border border-[#7F77DD]/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#7F77DD]/15">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#7F77DD]" />
          <span className="text-[12px] font-bold text-[#5a54b0]">Yapay Zeka Özeti</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="h-6 px-2 rounded-lg border border-[#7F77DD]/30 text-[9px] font-medium text-[#7F77DD] hover:bg-[#7F77DD]/10 flex items-center gap-1 transition-colors">
            <Edit3 className="h-2.5 w-2.5" /> Düzenle
          </button>
          <button className={`h-6 px-2 rounded-lg text-[9px] font-semibold flex items-center gap-1 transition-colors ${ai.approved ? "bg-emerald-500 text-white" : "bg-[#7F77DD] text-white hover:bg-[#6860cc]"}`}>
            {ai.approved ? <><CheckCircle className="h-2.5 w-2.5" /> Onaylandı</> : "Onayla & Kaydet"}
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#7F77DD]/70 font-bold mb-0.5">Ana Konu</div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">{ai.topic}</p>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#7F77DD]/70 font-bold mb-0.5">Alınan Aksiyon</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ai.action}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[#7F77DD]/70 font-bold">Sonuç</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${res.cls}`}>{res.label}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[9px] text-[#7F77DD]/70 font-bold uppercase tracking-wider">Duygu</div>
            <SentimentRing score={ai.sentimentScore} />
            <div className="text-[9px] font-semibold text-slate-500 capitalize">{ai.sentimentLabel === "olumlu" ? "Olumlu" : ai.sentimentLabel === "notr" ? "Nötr" : "Olumsuz"}</div>
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#7F77DD]/70 font-bold mb-1.5">Anahtar Kelimeler</div>
          <div className="flex flex-wrap gap-1">
            {ai.keywords.map(k => (
              <span key={k} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#7F77DD]/10 text-[#7F77DD] border border-[#7F77DD]/20">{k}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CRM GEÇMİŞİ
───────────────────────────────────────────────────────────────── */
function CRMHistory({ customer, onSelectCall }) {
  const dotColor = (result) => ({
    basarili: "bg-emerald-400", kacan: "bg-red-400", aktarildi: "bg-amber-400",
  }[result] || "bg-slate-300");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Müşteri Geçmişi (CRM)</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Toplam", val: customer.totalCalls },
          { label: "Bu ay", val: customer.callsThisMonth },
          { label: "Cevap or.", val: `%${Math.round(customer.answerRate * 100)}` },
        ].map(({ label, val }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
            <div className="text-[16px] font-bold text-slate-800">{val}</div>
            <div className="text-[9px] text-slate-400 font-medium">{label}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Son görüşmeler</div>
        <div className="space-y-1.5">
          {customer.previousCalls.slice(0, 4).map(pc => {
            const d = formatDate(pc.date);
            return (
              <div key={pc.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors" onClick={() => {}}>
                <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor(pc.result)}`} />
                <span className="text-[10px] font-semibold text-slate-600 capitalize">{TAG_LABELS[pc.tag] || pc.tag}</span>
                <span className="text-[10px] text-slate-400">–</span>
                <span className="text-[10px] text-slate-500 capitalize">{pc.result === "basarili" ? "Başarılı" : pc.result === "kacan" ? "Cevapsız" : pc.result === "aktarildi" ? "Aktarıldı" : pc.result}</span>
                <span className="ml-auto text-[9px] text-slate-400">{d.date} {d.time}</span>
                {pc.duration > 0 && <span className="text-[9px] text-slate-300 font-mono">{formatMMSS(pc.duration)}</span>}
              </div>
            );
          })}
        </div>
        <button className="text-[10px] text-[#1DB954] font-semibold hover:underline mt-1">Tüm geçmişi gör →</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NOT EDİTÖRÜ
───────────────────────────────────────────────────────────────── */
function NoteEditor({ note }) {
  const [text, setText] = useState(note?.text || "");
  const [selectedTags, setSelectedTags] = useState(note?.tags || []);
  const [changed, setChanged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const ALL_TAGS = ["satis", "sikayet", "bilgi", "teknik", "takip"];

  const toggleTag = (t) => {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    setChanged(true);
  };
  const handleSave = () => {
    setSaved(true);
    setChanged(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Görüşme Notu</div>
      <div className="relative">
        <textarea
          value={text}
          onChange={e => { setText(e.target.value.slice(0, 500)); setChanged(true); }}
          placeholder="Görüşme notu ekle..."
          className="w-full h-20 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-[#1DB954]/50 focus:ring-1 focus:ring-[#1DB954]/20 transition-all placeholder:text-slate-400"
        />
        <span className="absolute right-2.5 bottom-2 text-[9px] text-slate-400">{text.length}/500</span>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Etiketler</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              role="checkbox" aria-checked={selectedTags.includes(t)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${selectedTags.includes(t) ? "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
              {TAG_LABELS[t]}
            </button>
          ))}
          {addingCustom ? (
            <input autoFocus value={customTag} onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && customTag.trim()) { setSelectedTags(prev => [...prev, customTag.trim()]); setCustomTag(""); setAddingCustom(false); setChanged(true); } if (e.key === "Escape") setAddingCustom(false); }}
              className="text-[10px] px-2 py-0.5 border border-[#1DB954]/40 rounded-full outline-none bg-[#1DB954]/5 text-[#1DB954] w-20" placeholder="Etiket..." />
          ) : (
            <button onClick={() => setAddingCustom(true)} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 flex items-center gap-1 transition-colors">
              <Plus className="h-2.5 w-2.5" /> Özel
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => { setText(note?.text || ""); setSelectedTags(note?.tags || []); setChanged(false); }}
          className="h-7 px-3 rounded-xl border border-slate-200 text-[10px] font-medium text-slate-500 hover:bg-slate-50 transition-colors">İptal</button>
        <button onClick={handleSave} disabled={!changed}
          className={`h-7 px-3 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-all ${changed ? "bg-[#1DB954] text-white hover:bg-[#17a348]" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
          {saved ? <><CheckCircle className="h-3 w-3" /> Kaydedildi</> : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CSAT SKORU
───────────────────────────────────────────────────────────────── */
function CSATScore({ csat }) {
  const [hovered, setHovered] = useState(null);
  const statusMap = {
    answered: { label: "Anket yanıtlandı", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    pending: { label: "Anket bekleniyor", cls: "bg-amber-50 text-amber-600 border-amber-200" },
    no_response: { label: "Yanıt vermedi", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const s = statusMap[csat.status] || statusMap.pending;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Müşteri Memnuniyeti (CSAT)</div>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5"
          onMouseLeave={() => setHovered(null)}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i}
              className={`h-5 w-5 cursor-pointer transition-all ${i <= (hovered || csat.score || 0) ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-200"}`}
              onMouseEnter={() => setHovered(i)}
              strokeWidth={1.5}
            />
          ))}
        </div>
        {csat.score && <span className="text-[13px] font-bold text-slate-700">{csat.score}<span className="text-slate-400 font-normal text-[11px]">/5</span></span>}
      </div>
      {csat.comment && <p className="text-[11px] text-slate-500 italic">"{csat.comment}"</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DETAY PANELİ
───────────────────────────────────────────────────────────────── */
function CallDetailPanel({ call, onClose }) {
  if (!call) return (
    <div className="w-[380px] shrink-0 border-l border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Phone className="h-7 w-7 text-slate-300" />
      </div>
      <div className="text-[13px] font-semibold text-slate-400">Çağrı seçilmedi</div>
      <p className="text-[11px] text-slate-400 max-w-[180px]">Detayları görmek için listeden bir çağrı seçin</p>
    </div>
  );

  const dt = formatDate(call.startedAt);
  const color = avatarColor(call.customer.id);
  const initials = getInitials(call.customer.name);

  return (
    <div
      role="complementary"
      aria-label="Çağrı detayı"
      className="w-[380px] shrink-0 border-l border-slate-100 bg-white flex flex-col overflow-hidden"
    >
      {/* Sticky header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm"
              style={{ backgroundColor: color }}>
              {initials}
            </div>
            <div>
              <div className="text-[14px] font-bold text-slate-800 leading-tight">{call.customer.name}</div>
              <div className="text-[11px] text-slate-400">{call.customer.extension && `${call.customer.extension} · `}{call.customer.department}</div>
              <div className="flex items-center flex-wrap gap-1 mt-1">
                <DirectionBadge direction={call.direction} size="sm" />
                {call.note?.tags?.slice(0, 1).map(t => (
                  <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TAG_COLORS[t] || "bg-slate-100 text-slate-500 border-slate-200"}`}>{TAG_LABELS[t] || t}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-3 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden mb-2">
          {[
            { label: "Tarih", value: dt.date },
            { label: "Saat", value: dt.time },
            { label: "Süre", value: call.duration > 0 ? formatDur(call.duration) : "—" },
          ].map((item, i) => (
            <div key={i} className={`flex flex-col items-center py-2 ${i < 2 ? "border-r border-slate-100" : ""}`}>
              <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">{item.label}</div>
              <div className="text-[12px] font-bold text-slate-700">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Bekleme: <strong>{call.waitTime > 0 ? formatMMSS(call.waitTime) : "—"}</strong></span>
          <span>Sonuç: <ResultBadge result={call.result} /></span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AudioPlayer call={call} />
        <AISummaryCard ai={call.aiSummary} />
        <CRMHistory customer={call.customer} onSelectCall={() => {}} />
        <NoteEditor note={call.note} />
        {call.csat && <CSATScore csat={call.csat} />}

        {/* Panel footer */}
        <div className="flex gap-2 pt-1">
          <button disabled={call.direction !== "cevapsiz"}
            className={`flex-1 h-8 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 border transition-colors ${call.direction === "cevapsiz" ? "bg-[#1DB954] text-white border-[#1DB954] hover:bg-[#17a348]" : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"}`}>
            <PhoneCall className="h-3 w-3" /> Geri Ara
          </button>
          <button className="flex-1 h-8 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <Users className="h-3 w-3" /> Müşteri Profili
          </button>
          <button className="flex-1 h-8 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 border border-[#7F77DD]/30 bg-[#EEEDFE] text-[#7F77DD] hover:bg-[#7F77DD]/15 transition-colors">
            <Sparkles className="h-3 w-3" /> Tam Analiz
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TABLO BAŞLIĞI
───────────────────────────────────────────────────────────────── */
function SortTh({ label, sortKey, sort, onSort, className = "" }) {
  const isActive = sort.key === sortKey;
  return (
    <th
      className={`px-3 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors whitespace-nowrap ${className}`}
      onClick={() => onSort(sortKey)}
      scope="col"
      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3 text-[#1DB954]" /> : <ArrowDown className="h-3 w-3 text-[#1DB954]" />) : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
      </div>
    </th>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ANA SAYFA
───────────────────────────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [8, 15, 25, 50];
const DEPARTMENTS = ["Muhasebe", "E-Ticaret", "Stok Yönetimi", "Müşteri Hizmetleri"];
const ALL_TAGS_LIST = ["satis", "sikayet", "bilgi", "teknik", "takip"];

export default function CallRecords() {
  const { user } = useAuth();
  // Giriş yapan personelin tanımlayıcısı (username veya full_name ile eşleştir)
  const agentUsername = user?.username || "";
  const agentFullName = user?.full_name || "";

  // Mock data'yı personele filtrele.
  // Gerçek uygulamada bu filtreleme backend'de yapılır (SQL WHERE agent_id = current_user)
  const MY_CALLS = useMemo(() => {
    const matched = MOCK_CALLS.filter(c =>
      c.agentName === agentFullName ||
      c.agentId === agentUsername
    );
    // Eğer hiçbir kayıt eşleşmezse (dev/demo ortam) tüm çağrıları göster
    return matched.length > 0 ? matched : MOCK_CALLS;
  }, [agentFullName, agentUsername]);

  const [activeTab, setActiveTab] = useState("tum");
  const [dateFilter, setDateFilter] = useState("bugun");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [tagFilters, setTagFilters] = useState([]);
  const [specialFilters, setSpecialFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("startedAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState(MOCK_CALLS[0]);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [statFilter, setStatFilter] = useState(null);

  const handleSort = useCallback((col) => {
    setSortColumn(prev => {
      if (prev === col) { setSortDirection(d => d === "asc" ? "desc" : "asc"); return col; }
      setSortDirection("desc"); return col;
    });
    setCurrentPage(1);
  }, []);

  const handleTabChange = (t) => { setActiveTab(t); setCurrentPage(1); setSelectedCall(null); };

  const toggleTagFilter = (t) => {
    setTagFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    setCurrentPage(1);
  };
  const toggleSpecialFilter = (f) => {
    setSpecialFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
    setCurrentPage(1);
  };

  const activeFilterCount = [departmentFilter, resultFilter, ...tagFilters, ...specialFilters, dateFilter !== "bugun" ? dateFilter : ""].filter(Boolean).length;

  const clearFilters = () => {
    setDepartmentFilter(""); setResultFilter(""); setTagFilters([]); setSpecialFilters([]); setDateFilter("bugun"); setSearchQuery(""); setStatFilter(null); setCurrentPage(1);
  };

  const filteredCalls = useMemo(() => {
    // Sadece bu personelin çağrıları — diğer personelin kayıtları yok
    let data = [...MY_CALLS];
    if (activeTab === "gelen") data = data.filter(c => c.direction === "gelen");
    else if (activeTab === "giden") data = data.filter(c => c.direction === "giden");
    else if (activeTab === "cevapsiz") data = data.filter(c => c.direction === "cevapsiz");
    else if (activeTab === "aktarildi") data = data.filter(c => c.action === "transfer");
    if (departmentFilter) data = data.filter(c => c.action === "transfer" && c.department === departmentFilter);
    if (resultFilter) data = data.filter(c => c.result === resultFilter);
    if (tagFilters.length > 0) data = data.filter(c => tagFilters.some(t => c.note?.tags?.includes(t)));
    if (specialFilters.includes("ai")) data = data.filter(c => !!c.aiSummary);
    if (specialFilters.includes("notlu")) data = data.filter(c => !!c.note?.text);
    if (specialFilters.includes("kayit")) data = data.filter(c => c.hasRecording);
    if (specialFilters.includes("uzun")) data = data.filter(c => c.isLongCall);
    if (statFilter === "missed") data = data.filter(c => c.direction === "cevapsiz");
    if (statFilter === "answered") data = data.filter(c => c.result === "basarili");
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
      data = data.filter(c => c.customer.name.toLocaleLowerCase('tr-TR').includes(q) || c.customer.phone.includes(q));
    }
    data.sort((a, b) => {
      let va, vb;
      if (sortColumn === "startedAt") { va = new Date(a.startedAt).getTime(); vb = new Date(b.startedAt).getTime(); }
      else if (sortColumn === "duration") { va = a.duration; vb = b.duration; }
      else if (sortColumn === "waitTime") { va = a.waitTime; vb = b.waitTime; }
      else if (sortColumn === "customer") { va = a.customer.name.toLocaleLowerCase('tr-TR'); vb = b.customer.name.toLocaleLowerCase('tr-TR'); }
      else if (sortColumn === "department") { va = a.department.toLocaleLowerCase('tr-TR'); vb = b.department.toLocaleLowerCase('tr-TR'); }
      else { va = a[sortColumn]; vb = b[sortColumn]; }
      if (typeof va === "string") return sortDirection === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDirection === "asc" ? va - vb : vb - va;
    });
    return data;
  }, [activeTab, departmentFilter, resultFilter, tagFilters, specialFilters, searchQuery, statFilter, sortColumn, sortDirection]);

  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCalls.slice(start, start + pageSize);
  }, [filteredCalls, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / pageSize));

  const stats = useMemo(() => {
    const all = MY_CALLS;
    const answered = all.filter(c => c.result === "basarili").length;
    const missed = all.filter(c => c.direction === "cevapsiz").length;
    const withDuration = all.filter(c => c.duration > 0);
    const avgDur = withDuration.length ? Math.round(withDuration.reduce((s, c) => s + c.duration, 0) / withDuration.length) : 0;
    const avgWait = all.length ? Math.round(all.reduce((s, c) => s + c.waitTime, 0) / all.length) : 0;
    return { total: all.length, answered, missed, avgDur, avgWait, answerRate: Math.round((answered / all.length) * 100) };
  }, [MY_CALLS]);

  const tabCounts = useMemo(() => ({
    tum: MY_CALLS.length,
    gelen: MY_CALLS.filter(c => c.direction === "gelen").length,
    giden: MY_CALLS.filter(c => c.direction === "giden").length,
    cevapsiz: MY_CALLS.filter(c => c.direction === "cevapsiz").length,
    aktarildi: MY_CALLS.filter(c => c.action === "transfer").length,
  }), [MY_CALLS]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 3) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  const exportCsv = () => {
    const headers = ["Tarih", "Saat", "Yön", "Müşteri", "Numara", "Aktarılan Departman", "Süre", "Bekleme", "Sonuç", "Not"];
    const rows = filteredCalls.map(c => [
      formatDate(c.startedAt).date, formatDate(c.startedAt).time, c.direction,
      c.customer.name, c.customer.phone, c.action === "transfer" ? c.department : "—",
      formatDur(c.duration), formatMMSS(c.waitTime), c.result, c.note?.text || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cagri-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 flex flex-col gap-3 min-w-0 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800 leading-tight">Çağrı Kayıtlarım</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {agentFullName || agentUsername
              ? <><span className="font-semibold text-slate-600">{agentFullName || agentUsername}</span> · Kişisel çağrı geçmişi</>
              : "Geçmiş görüşmeleri incele, filtrele ve analiz et"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="h-8 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm">
            <Download className="h-3.5 w-3.5" /> Dışa Aktar
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <StatCard icon={Phone} value={stats.total} label="Toplam Çağrı" sub={`Tüm kayıtlar`} color="blue" progress={100}
          active={statFilter === "total"} onClick={() => setStatFilter(f => f === "total" ? null : "total")} />
        <StatCard icon={TrendingUp} value={stats.answered} label="Cevaplanan" sub={`%${stats.answerRate} cevap oranı`} color="green" progress={stats.answerRate}
          active={statFilter === "answered"} onClick={() => setStatFilter(f => f === "answered" ? null : "answered")} />
        <StatCard icon={PhoneMissed} value={stats.missed} label="Cevapsız" sub={`${stats.missed} kaçan çağrı`} color="red" progress={Math.round((stats.missed / stats.total) * 100)}
          active={statFilter === "missed"} onClick={() => setStatFilter(f => f === "missed" ? null : "missed")} />
        <StatCard icon={Clock} value={formatMMSS(stats.avgDur)} label="Ort. Konuşma" sub={`Ortalama süre`} color="purple"
          active={statFilter === "avgDur"} onClick={() => setStatFilter(f => f === "avgDur" ? null : "avgDur")} />
        <StatCard icon={AlertTriangle} value={formatMMSS(stats.avgWait)} label="Ort. Bekleme" sub={stats.avgWait > 45 ? "⚠ Eşik aşıldı!" : "Normal seviye"} color="orange"
          active={statFilter === "avgWait"} onClick={() => setStatFilter(f => f === "avgWait" ? null : "avgWait")} progress={Math.min(100, (stats.avgWait / 90) * 100)} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2 shrink-0 flex-wrap gap-y-2">
        {[
          { key: "tum", label: "Tümü" }, { key: "gelen", label: "Gelen" }, { key: "giden", label: "Giden" },
          { key: "cevapsiz", label: "Cevapsız" }, { key: "aktarildi", label: "Aktarıldı" },
        ].map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`h-8 px-4 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-2 ${activeTab === t.key ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${activeTab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>{tabCounts[t.key]}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Department filter */}
          <div className="relative">
            <select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
              className="h-8 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] text-slate-600 appearance-none outline-none focus:border-[#1DB954]/50 cursor-pointer">
              <option value="">Tüm Aktarılan Departmanlar</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Result filter */}
          <div className="relative">
            <select value={resultFilter} onChange={e => { setResultFilter(e.target.value); setCurrentPage(1); }}
              className="h-8 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] text-slate-600 appearance-none outline-none focus:border-[#1DB954]/50 cursor-pointer">
              <option value="">Tüm Sonuçlar</option>
              <option value="basarili">Başarılı</option>
              <option value="kacan">Kaçan</option>
              <option value="mesgul">Meşgul</option>
              <option value="aktarildi">Aktarıldı</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus-within:border-[#1DB954]/50 focus-within:ring-1 focus-within:ring-[#1DB954]/10 transition-all w-[180px]">
            <Search className="h-3 w-3 text-slate-400 shrink-0" />
            <input type="text" placeholder="Ara..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-[11px] text-slate-700 placeholder:text-slate-400 bg-transparent border-none outline-none" />
            {searchQuery && <button onClick={() => setSearchQuery("")}><X className="h-2.5 w-2.5 text-slate-400" /></button>}
          </div>
        </div>
      </div>

      {/* Chip filters */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Tags */}
        {ALL_TAGS_LIST.map(t => (
          <button key={t} onClick={() => toggleTagFilter(t)}
            className={`h-7 px-3 rounded-full text-[10px] font-semibold border transition-all ${tagFilters.includes(t) ? `${TAG_COLORS[t]} ring-1` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
            {TAG_LABELS[t]}
          </button>
        ))}
        <div className="h-4 w-px bg-slate-200" />
        {[
          { key: "ai", label: "🤖 AI özeti var" },
          { key: "notlu", label: "📎 Notlu" },
          { key: "kayit", label: "▶ Kaydı var" },
          { key: "uzun", label: "⏱ Uzun görüşme" },
        ].map(f => (
          <button key={f.key} onClick={() => toggleSpecialFilter(f.key)}
            className={`h-7 px-3 rounded-full text-[10px] font-semibold border transition-all ${specialFilters.includes(f.key) ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
            {f.label}
          </button>
        ))}

        {(activeFilterCount > 0 || statFilter) && (
          <button onClick={clearFilters} className="h-7 px-3 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 flex items-center gap-1 transition-colors">
            <RotateCcw className="h-3 w-3" /> Filtreleri Temizle ({activeFilterCount + (statFilter ? 1 : 0)})
          </button>
        )}
      </div>

      {/* Split content */}
      <div
        className="flex rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-h-0"
        style={{ minHeight: "420px" }}
      >
        {/* Left: Table */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <span className="text-[12px] font-bold text-slate-600">
              {filteredCalls.length} kayıt
            </span>
            <span className="text-[11px] text-slate-400">Sayfa {currentPage}/{totalPages}</span>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full min-w-[680px]" role="grid">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <th scope="col" className="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-400 w-[90px]">Durum</th>
                  <SortTh label="Müşteri" sortKey="customer" sort={{ key: sortColumn, dir: sortDirection }} onSort={handleSort} className="min-w-[170px]" />
                  <th scope="col" className="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-400 w-[115px]">Aktarılan Departman</th>
                  <SortTh label="Süre" sortKey="duration" sort={{ key: sortColumn, dir: sortDirection }} onSort={handleSort} className="w-[70px]" />
                  <SortTh label="Bekleme" sortKey="waitTime" sort={{ key: sortColumn, dir: sortDirection }} onSort={handleSort} className="w-[70px]" />
                  <th scope="col" className="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-400 w-[90px]">Sonuç</th>
                  <SortTh label="Tarih" sortKey="startedAt" sort={{ key: sortColumn, dir: sortDirection }} onSort={handleSort} className="w-[110px]" />
                  <th scope="col" className="px-3 py-3 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 w-[40px]">AI</th>
                  <th scope="col" className="px-3 py-3 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 w-[40px]">▶</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-slate-400 text-[12px]">
                      Filtrelere uyan çağrı bulunamadı.
                    </td>
                  </tr>
                ) : paginatedCalls.map(call => {
                  const isSelected = selectedCall?.id === call.id;
                  const dt = formatDate(call.startedAt);
                  const color = avatarColor(call.customer.id);
                  const ini = getInitials(call.customer.name);
                  const isMissed = call.direction === "cevapsiz";
                  const isLong = call.isLongCall;
                  const isHighWait = call.isHighWait;

                  return (
                    <tr key={call.id}
                      onClick={() => { setSelectedCall(isSelected ? null : call); if (!isSelected) setIsDetailOpen(true); }}
                      className={`group cursor-pointer transition-colors duration-100 border-b border-slate-50 ${isSelected ? "bg-[#1DB954]/5" : isMissed ? "bg-red-50/30 hover:bg-red-50/60" : isHighWait ? "bg-orange-50/30 hover:bg-orange-50/60" : "hover:bg-slate-50/60"}`}
                    >
                      <td className={`px-3 py-2.5 border-l-2 ${isSelected ? "border-l-[#1DB954]" : isLong ? "border-l-red-400" : "border-l-transparent"}`}>
                        <DirectionBadge direction={call.direction} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-xl flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: color }}>{ini}</div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-slate-800 truncate flex items-center gap-1">
                              {call.customer.name}
                              {call.note?.text && <span title="Notlu">📎</span>}
                              {call.aiSummary && <span title="AI özeti var">🤖</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{call.customer.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{call.action === "transfer" ? <DeptBadge dept={call.department} /> : <span className="text-[11px] font-medium text-slate-300">—</span>}</td>
                      <td className={`px-3 py-2.5 text-[11px] font-mono font-semibold ${isLong ? "text-red-500" : "text-slate-600"}`}>
                        {call.duration > 0 ? formatMMSS(call.duration) : "—"}
                      </td>
                      <td className={`px-3 py-2.5 text-[11px] font-mono font-semibold ${isHighWait ? "text-orange-500" : "text-slate-500"}`}>
                        {call.waitTime > 0 ? formatMMSS(call.waitTime) : "—"}
                      </td>
                      <td className="px-3 py-2.5"><ResultBadge result={call.result} /></td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11px] font-medium text-slate-700">{dt.date}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{dt.time}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {call.aiSummary ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-violet-100">
                            <Sparkles className="h-2.5 w-2.5 text-violet-500" />
                          </span>
                        ) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={e => { e.stopPropagation(); setSelectedCall(call); setIsDetailOpen(true); }}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${call.hasRecording ? "bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 hover:scale-110" : "bg-slate-100 text-slate-300 cursor-default"}`}
                          title={call.hasRecording ? "Kaydı dinle" : "Kayıt yok"}>
                          <Play className="h-3 w-3 ml-0.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredCalls.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex items-center justify-between gap-2 shrink-0">
              <span className="text-[10px] text-slate-400">
                Toplam <span className="font-semibold text-slate-600 tabular-nums">{filteredCalls.length}</span> kayıt, sayfa {currentPage}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="h-7 px-2.5 rounded-lg border border-slate-200 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
                  <ChevronLeft className="h-3 w-3" /> Önceki
                </button>
                {pageNumbers.map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`h-7 w-7 rounded-lg text-[11px] font-semibold transition-colors ${currentPage === p ? "bg-[#1DB954] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                ))}
                {totalPages > 7 && currentPage < totalPages - 3 && (
                  <><span className="text-slate-400 text-[11px] px-1">…</span>
                    <button onClick={() => setCurrentPage(totalPages)} className="h-7 w-7 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{totalPages}</button></>
                )}
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="h-7 px-2.5 rounded-lg border border-slate-200 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
                  Sonraki <ChevronRight className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400">Sayfa başına:</span>
                  <div className="relative">
                    <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="h-7 pl-2 pr-6 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-600 appearance-none outline-none cursor-pointer">
                      {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        {isDetailOpen && (
          <CallDetailPanel
            call={selectedCall}
            onClose={() => { setIsDetailOpen(false); setSelectedCall(null); }}
          />
        )}
      </div>
    </div>
  );
}
