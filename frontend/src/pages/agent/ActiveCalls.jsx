import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCall } from "@/context/CallContext";
import { cdrApi } from "@/services/api";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Mic,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Play,
  Save,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";

const customStyles = `
  @keyframes pulsePhone {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes blinkDot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes shakeAlert {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideFromRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes replyIn {
    from { transform: translateX(-8px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-pulsePhone { animation: pulsePhone 2s infinite; }
  .animate-blinkDot { animation: blinkDot 1.2s infinite; }
  .animate-shakeAlert { animation: shakeAlert 0.5s; }
  .animate-slideDown { animation: slideDown 0.3s ease-out; }
  .animate-slideFromRight { animation: slideFromRight 0.25s ease-out; }
  .animate-replyIn { animation: replyIn 0.3s ease-out; }
`;

const triggerWords = ["iade", "sikayet", "avukat", "mudur", "iptal", "dava"];

const suggestedReplies = [
  "Demo icin size uygun bir tarih belirleyelim. Hafta ici mi hafta sonu mu daha uygun?",
  "Konuyu not aldim. En hizli cozum icin size ayni gorusme icinde adim adim destek olayim.",
  "Fiyatlandirma detaylarini netlestireyim: kullanim buyuklugune gore en uygun plani birlikte secelim.",
  "Iade surecini birlikte hizlica tamamlayabiliriz. Fatura bilgilerini kontrol ederek hemen devam edelim.",
];

const mockActiveCall = {
  id: "call-live-001",
  callerNumber: "0532 411 22 18",
  callerName: "Ahmet Yilmaz",
  ivrPath: ["1", "Muhasebe"],
  direction: "gelen",
  startedAt: new Date(Date.now() - 272000),
  holdStartedAt: undefined,
  isOnHold: false,
  isRecording: true,
  crmStatus: "loaded",
  customer: {
    id: "CUST-001",
    name: "Ahmet Yilmaz",
    email: "ahmet.yilmaz@example.com",
    phone: "0532 411 22 18",
    category: "VIP",
    registeredAt: "2023-03-12",
    lastCallAt: "2025-04-15T14:22:00",
    totalCalls: 24,
    csatAverage: 4.2,
    csatCount: 18,
    lastNote: "Demo randevusu 23 Nis icin alindi, fiyat gorusuldu.",
    previousCalls: [
      {
        id: "prev-001",
        date: "2025-04-15T14:22:00",
        duration: 252,
        agentName: "Sen",
        isCurrentAgent: true,
        category: "Satis",
        notePreview: "Demo randevusu alindi, fiyat gorusuldu.",
        result: "basarili",
        hasAISummary: true,
        hasRecording: true,
      },
      {
        id: "prev-002",
        date: "2025-04-10T09:45:00",
        duration: 158,
        agentName: "Selin K.",
        isCurrentAgent: false,
        category: "Bilgi",
        notePreview: "Kargo sureci hakkinda bilgi verildi.",
        result: "aktarildi",
        hasAISummary: true,
        hasRecording: false,
      },
      {
        id: "prev-003",
        date: "2025-04-08T11:03:00",
        duration: 0,
        agentName: "-",
        isCurrentAgent: false,
        category: "-",
        result: "kacan",
        hasAISummary: false,
        hasRecording: false,
      },
    ],
  },
};

const mockAIData = {
  isAvailable: true,
  sentimentScore: 78,
  sentimentLabel: "Pozitif",
  suggestedReply:
    "Demo icin size uygun bir tarih ve saat belirleyelim. Hafta ici mi hafta sonu mu tercih edersiniz?",
  suggestedReplyUpdatedAt: new Date(),
  triggerAlerts: [],
  templates: [
    {
      id: "t1",
      title: "Demo randevu alma",
      content:
        "Demo icin size uygun bir tarih ve saat belirleyelim. Sistem uzerinden hemen randevu olusturabilirim.",
      category: "Satis",
    },
    {
      id: "t2",
      title: "Fiyat bilgisi verme",
      content:
        "Fiyatlandirmamiz kullanim buyuklugune gore degismektedir. Size ozel bir teklif hazirlayabilirim.",
      category: "Satis",
    },
    {
      id: "t3",
      title: "Sikayet yonetimi",
      content:
        "Yasadiginiz durumu anliyorum. Hemen ilgilenip en kisa surede cozum uretmek istiyorum.",
      category: "Sikayet",
    },
  ],
};

const mockKBArticles = [
  {
    id: "kb1",
    title: "Iade Politikasi",
    preview: "30 gun icinde fatura ile iade yapilabilir.",
    content:
      "30 gun icinde orijinal fatura ile iade islemi baslatilabilir. Iade sureci 5-7 is gunu surmektedir.",
    category: "Urun",
    tags: ["iade", "fatura", "politika"],
  },
  {
    id: "kb2",
    title: "Demo Randevu Sureci",
    preview: "Demo talepleri 24 saat icinde yanitlanir.",
    content:
      "Demo talebi alindiktan sonra satis ekibi 24 saat icinde iletisime gecer. Demo suresi 45 dakikadir.",
    category: "Satis",
    tags: ["demo", "randevu", "satis"],
  },
  {
    id: "kb3",
    title: "Fiyatlandirma Tablosu 2025",
    preview: "Kucuk isletme: 299TL/ay, Kurumsal: 999TL/ay",
    content:
      "Baslangic: 99TL/ay (1-5 kullanici), Kucuk Isletme: 299TL/ay (6-20), Kurumsal: 999TL/ay (sinirsiz)",
    category: "Satis",
    tags: ["fiyat", "plan", "abonelik"],
  },
];

const mockTransferAgents = [
  { id: "a1", name: "Selin Kaya", extension: "102", isAvailable: true, department: null },
  { id: "a2", name: "Mert Demir", extension: "103", isAvailable: true, department: null },
  { id: "a3", name: "Zeynep Arslan", extension: "104", isAvailable: false, department: null, busyFor: 120 },
  { id: "a4", name: "Can Ozturk", extension: "105", isAvailable: false, department: null, busyFor: 45 },
  { id: "d1", name: "Muhasebe", extension: null, isAvailable: true, department: "Muhasebe" },
  { id: "d2", name: "E-Ticaret", extension: null, isAvailable: true, department: "E-Ticaret" },
  { id: "d3", name: "Stok Yonetimi", extension: null, isAvailable: true, department: "Stok Yonetimi" },
];

const mockPostCall = {
  callId: "call-live-001",
  duration: 272,
  result: "Basarili",
  aiSummaryStatus: "generated",
  aiSummary:
    "Musteri urunun demo surumunu talep etti. Fiyatlandirma ve kurulum sureci hakkinda bilgi verildi. 23 Nisan icin demo randevusu olusturuldu.",
  detectedRequest: "Demo talebi + fiyat sorusturmasi",
  suggestedNextStep: "23 Nis takip aramasi yap",
  xpBreakdown: [
    { label: "Cagri tamamlandi", points: 45 },
    { label: "Not eklendi", points: 15 },
    { label: "AI ozeti onaylandi (bonus)", points: 20 },
  ],
  totalXP: 80,
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function timerColor(duration) {
  if (duration < 900) return "#1DB954";
  if (duration < 1500) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getResultBadge(result) {
  if (result === "basarili") return { icon: "check", color: "text-emerald-600", label: "Basarili" };
  if (result === "aktarildi") return { icon: "arrow", color: "text-amber-500", label: "Aktarildi" };
  return { icon: "missed", color: "text-red-500", label: "Cevapsiz" };
}

export default function ActiveCalls() {
  const navigate = useNavigate();

  // ── Global call context (shared with Layout + Header) ──
  const {
    incomingAlert,
    incomingElapsed,
    pendingAnswer,
    simulateIncomingCall: ctxSimulate,
    dismissIncoming,
    consumeAnswer,
    registerDevCallbacks,
    unregisterDevCallbacks,
  } = useCall();

  const [pageState, setPageState] = useState("idle");
  const [activeCall, setActiveCall] = useState(null);
  const [postCallData, setPostCallData] = useState(null);

  const [duration, setDuration] = useState(0);
  const [holdDuration, setHoldDuration] = useState(0);
  const [waitDuration, setWaitDuration] = useState(0);

  const [customerTab, setCustomerTab] = useState("info");
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState({});
  const [selectedHistoryCall, setSelectedHistoryCall] = useState(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerSaveOk, setCustomerSaveOk] = useState(false);
  const [crmStatus, setCRMStatus] = useState("loaded");

  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState(null);
  const [noteTags, setNoteTags] = useState([]);
  const [notePriority, setNotePriority] = useState("orta");
  const [noteSaveStatus, setNoteSaveStatus] = useState("idle");
  const [showEmptyNoteWarning, setShowEmptyNoteWarning] = useState(false);
  const [emptyNoteCountdown, setEmptyNoteCountdown] = useState(5);

  const [aiData, setAIData] = useState(mockAIData);
  const [copiedSuggestion, setCopiedSuggestion] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  const [kbQuery, setKBQuery] = useState("");
  const [kbResults, setKBResults] = useState([]);
  const [expandedKBId, setExpandedKBId] = useState(null);

  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [transferQuery, setTransferQuery] = useState("");
  const [endCallHolding, setEndCallHolding] = useState(false);

  const [postCallCountdown, setPostCallCountdown] = useState(5);
  const [autoProceeding, setAutoProceeding] = useState(true);
  const [editingAISummary, setEditingAISummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [xpAnimated, setXPAnimated] = useState(0);

  const [toast, setToast] = useState(null);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [mobileRightTab, setMobileRightTab] = useState("ai");
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const [lastCallSummary, setLastCallSummary] = useState({
    name: "Ahmet Yilmaz",
    duration: 272,
    category: "Satis",
    result: "Basarili",
    note: "Demo randevusu alindi, 23 Nis takip planlandi.",
  });

  const noteRef = useRef(noteText);
  noteRef.current = noteText;

  const filteredTransferTargets = useMemo(() => {
    const q = transferQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return mockTransferAgents;
    return mockTransferAgents.filter((item) => {
      return (
        item.name.toLocaleLowerCase('tr-TR').includes(q) ||
        (item.extension || "").includes(q) ||
        (item.department || "").toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [transferQuery]);

  const isNarrow = viewportWidth < 1100;
  const isVeryNarrow = viewportWidth < 800;

  const pushToast = (message, tone = "info") => {
    setToast({ message, tone, id: Date.now() });
  };

  const simulateIncomingCall = () => {
    if (pageState === "active") {
      pushToast("Baska bir cagri alinamaz. Aktif cagri devam ediyor.", "warn");
      return;
    }
    ctxSimulate();
  };

  const _startActiveCall = (alertData, waited = 0) => {
    const call = {
      ...mockActiveCall,
      id: alertData.id || `call-live-${Date.now()}`,
      startedAt: new Date(),
      callerNumber: alertData.number,
      callerName: alertData.name,
    };
    
    // Geçici olarak "loading" yapalım, sonra API ile sorgulayacağız
    setCRMStatus("loading");
    setActiveCall({ ...call, customer: null });
    
    setWaitDuration(Math.min(55, waited));
    setDuration(0);
    setHoldDuration(0);
    setIsOnHold(false);
    setIsRecording(true);
    setCustomerTab("info");
    setSelectedHistoryCall(null);
    setPageState("active");
    setShowEmptyNoteWarning(false);
    setEmptyNoteCountdown(5);
    setAutoProceeding(true);
    setPostCallCountdown(5);
    setEditingAISummary(false);
  };

  // ── Arayan Numarayı Veritabanında (Müşteri) Ara ──
  useEffect(() => {
    if (pageState === "active" && crmStatus === "loading" && activeCall?.callerNumber) {
      // API'ye sorgu atılacak (gerçek projede cdrApi vb. veya customerApi kullanılacak)
      // Şimdilik import("../services/api") veya api call simülasyonu yapıyoruz
      let isCancelled = false;
      const checkCustomer = async () => {
        try {
          // Örnek API call:
          // const res = await api.get(`/customers/find?phone=${activeCall.callerNumber}`)
          // if (res.data) ...
          
          // Simüle edelim: EGER numara mock data içindeki falanca ise kayıtlı, yoksa "not_found"
          await new Promise(resolve => setTimeout(resolve, 800));
          if (isCancelled) return;

          // Test verisi olarak VIP numaralarda müşteri bilgisi var sayalım:
          if (activeCall.callerNumber.includes("0532")) {
            setActiveCall(prev => ({ ...prev, customer: mockActiveCall.customer }));
            setCRMStatus("loaded");
          } else {
            // Müşteri bulanamadı -> Yeni form gösterilecek
            setCRMStatus("not_found");
          }
        } catch (error) {
          console.error("Müşteri arama hatası:", error);
          if (!isCancelled) setCRMStatus("error");
        }
      };
      
      checkCustomer();
      return () => { isCancelled = true; };
    }
  }, [pageState, crmStatus, activeCall?.callerNumber]);

  const handleAnswerIncoming = () => {
    if (!incomingAlert) return;
    const alertData = incomingAlert;
    const waited = incomingElapsed;
    dismissIncoming();
    _startActiveCall(alertData, waited);
  };

  const handleRejectIncoming = () => {
    if (!incomingAlert) return;
    setLastCallSummary({
      name: incomingAlert.name || "Bilinmeyen",
      duration: 0,
      category: "Cevapsiz",
      result: "Cevapsiz",
      note: "Cagri kullanici tarafindan reddedildi.",
    });
    dismissIncoming();
  };

  const openPostCall = (summary) => {
    setPostCallData(summary);
    setEditedSummary(summary.aiSummary || "");
    setPageState("post_call");
    setPostCallCountdown(5);
    setAutoProceeding(true);
    setEditingAISummary(false);
    setXPAnimated(0);
  };

  const proceedEndCall = (skipNoteBonus) => {
    const totalXP = skipNoteBonus ? 45 : 80;
    const xpBreakdown = skipNoteBonus
      ? [{ label: "Cagri tamamlandi", points: 45 }]
      : mockPostCall.xpBreakdown;

    const aiSummaryStatus = aiData && aiData.isAvailable ? "generated" : "failed";
    openPostCall({
      ...mockPostCall,
      callId: activeCall?.id || mockPostCall.callId,
      duration,
      totalXP,
      xpBreakdown,
      aiSummaryStatus,
      aiSummary: aiSummaryStatus === "generated" ? mockPostCall.aiSummary : null,
    });
  };

  const handleEndCall = () => {
    if (!noteText.trim()) {
      setShowEmptyNoteWarning(true);
      setEmptyNoteCountdown(5);
      return;
    }
    proceedEndCall(false);
  };

  const finalizePostCall = (approved) => {
    const finalSummaryText = editingAISummary ? editedSummary : editedSummary;

    setLastCallSummary({
      name: activeCall?.callerName || "Bilinmeyen",
      duration,
      category: noteCategory ? noteCategory.toLocaleUpperCase('tr-TR') : "Bilgi",
      result: approved ? "Basarili" : "Atlandi",
      note: finalSummaryText || "Manuel not girilmedi.",
    });

    if (activeCall?.id) {
      localStorage.removeItem(`draft_note_${activeCall.id}`);
    }

    setPageState("idle");
    setActiveCall(null);
    setPostCallData(null);
    setDuration(0);
    setHoldDuration(0);
    setWaitDuration(0);
    setIsOnHold(false);
    setIsRecording(true);
    setShowTransferMenu(false);
    setShowEmptyNoteWarning(false);
    setNoteText("");
    setNoteCategory(null);
    setNoteTags([]);
    setNotePriority("orta");
    setExpandedTemplate(null);
    setExpandedKBId(null);
    setKBQuery("");
    setKBResults([]);
    setMobileRightOpen(false);
    pushToast(approved ? "Cagri ozeti kaydedildi." : "Cagri kaydi ozet olmadan tamamlandi.", "ok");
  };

  const saveCustomer = () => {
    if (!activeCall?.customer) return;
    setIsSavingCustomer(true);
    setCustomerSaveOk(false);

    setTimeout(() => {
      setActiveCall((prev) => {
        if (!prev || !prev.customer) return prev;
        return {
          ...prev,
          customer: {
            ...prev.customer,
            ...editedCustomer,
          },
        };
      });
      setIsSavingCustomer(false);
      setCustomerSaveOk(true);
      setIsEditingCustomer(false);
      setTimeout(() => setCustomerSaveOk(false), 2000);
    }, 900);
  };

  const triggerKeyword = (keyword) => {
    if (!aiData?.isAvailable) return;
    setAIData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        triggerAlerts: [
          {
            id: `alert-${Date.now()}`,
            keyword,
            message: `${keyword} tespit edildi. Ilgili bilgi bankasi makalesini ac.`,
            linkedKBArticleId: "kb1",
          },
          ...prev.triggerAlerts,
        ].slice(0, 3),
      };
    });
  };

  const simulatePostCall = () => {
    if (pageState !== "active") {
      setActiveCall(mockActiveCall);
      setDuration(272);
    }
    proceedEndCall(false);
  };

  // ── Register dev callbacks for Header's Test Çağrı panel ──
  useEffect(() => {
    registerDevCallbacks({
      simulateIncomingCall,
      skipToDuration: (d) => setDuration(d),
      triggerKeyword,
      setCRMStatus: (status) => {
        setCRMStatus(status);
        setActiveCall((prev) => {
          if (!prev) return prev;
          return { ...prev, crmStatus: status, customer: status === "loaded" ? prev.customer || mockActiveCall.customer : null };
        });
      },
      setAIData,
      simulatePostCall,
    });
    return () => unregisterDevCallbacks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Consume pendingAnswer: user answered from another page → auto-start call ──
  useEffect(() => {
    if (!pendingAnswer || pageState !== "idle") return;
    const data = consumeAnswer();
    if (!data) return;
    _startActiveCall(data, data.elapsed || 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnswer, pageState]);

  useEffect(() => {
    if (pageState !== "active") return;
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [pageState]);

  useEffect(() => {
    if (pageState !== "active" || !isOnHold) return;
    const interval = setInterval(() => setHoldDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [pageState, isOnHold]);

  useEffect(() => {
    const handler = (event) => {
      if (pageState !== "active") return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pageState]);

  useEffect(() => {
    const clickGuard = (event) => {
      if (pageState !== "active") return;

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;

      let pathname = "";
      try {
        pathname = new URL(anchor.href).pathname;
      } catch {
        pathname = href;
      }

      if (pathname && pathname !== "/active-calls") {
        event.preventDefault();
        event.stopPropagation();
        pushToast("Aktif cagri devam ediyor.", "warn");
      }
    };

    document.addEventListener("click", clickGuard, true);
    return () => document.removeEventListener("click", clickGuard, true);
  }, [pageState]);

  useEffect(() => {
    if (pageState !== "active" || !activeCall?.id) return;

    const key = `draft_note_${activeCall.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setNoteText(parsed.text || "");
      setNoteCategory(parsed.category || null);
      setNoteTags(Array.isArray(parsed.tags) ? parsed.tags : []);
      setNotePriority(parsed.priority || "orta");
      setNoteSaveStatus("saved");
    } catch {
      setNoteSaveStatus("error");
    }
  }, [pageState, activeCall?.id]);

  useEffect(() => {
    if (pageState !== "active" || !activeCall?.id) return;

    const interval = setInterval(() => {
      try {
        setNoteSaveStatus("saving");
        localStorage.setItem(
          `draft_note_${activeCall.id}`,
          JSON.stringify({
            text: noteRef.current,
            category: noteCategory,
            tags: noteTags,
            priority: notePriority,
            savedAt: new Date().toISOString(),
          })
        );
        setNoteSaveStatus("saved");
        setTimeout(() => setNoteSaveStatus("idle"), 1800);
      } catch {
        setNoteSaveStatus("error");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCall?.id, noteCategory, noteTags, notePriority, pageState]);

  useEffect(() => {
    if (pageState !== "active" || !aiData?.isAvailable) return;

    const interval = setInterval(() => {
      setAIData((prev) => {
        if (!prev) return prev;
        const nextScore = Math.max(15, Math.min(96, prev.sentimentScore + Math.floor(Math.random() * 21) - 10));
        const sentimentLabel = nextScore >= 65 ? "Pozitif" : nextScore >= 40 ? "Notr" : "Negatif";
        return {
          ...prev,
          sentimentScore: nextScore,
          sentimentLabel,
        };
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [pageState, aiData?.isAvailable]);

  useEffect(() => {
    if (pageState !== "active" || !aiData?.isAvailable) return;

    let timeout;
    const loop = () => {
      const nextMs = 15000 + Math.floor(Math.random() * 5000);
      timeout = setTimeout(() => {
        setAIData((prev) => {
          if (!prev) return prev;
          const random = suggestedReplies[Math.floor(Math.random() * suggestedReplies.length)];
          return {
            ...prev,
            suggestedReply: random,
            suggestedReplyUpdatedAt: new Date(),
          };
        });
        loop();
      }, nextMs);
    };

    loop();
    return () => clearTimeout(timeout);
  }, [pageState, aiData?.isAvailable]);

  useEffect(() => {
    if (pageState !== "active" || !aiData?.isAvailable) return;
    const haystack = `${noteText} ${kbQuery}`.toLocaleLowerCase('tr-TR');

    triggerWords.forEach((word) => {
      if (!haystack.includes(word)) return;
      setAIData((prev) => {
        if (!prev) return prev;
        const exists = prev.triggerAlerts.some((alert) => alert.keyword === word);
        if (exists) return prev;

        return {
          ...prev,
          triggerAlerts: [
            {
              id: `kw-${word}-${Date.now()}`,
              keyword: word,
              message: `${word} kelimesi tespit edildi. Bilgi bankasi eslesmesini ac.`,
              linkedKBArticleId: "kb1",
            },
            ...prev.triggerAlerts,
          ].slice(0, 3),
        };
      });
    });
  }, [noteText, kbQuery, pageState, aiData?.isAvailable]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (kbQuery.trim().length <= 1) {
        setKBResults([]);
        return;
      }

      const q = kbQuery.toLocaleLowerCase('tr-TR');
      const filtered = mockKBArticles.filter((article) => {
        return (
          article.title.toLocaleLowerCase('tr-TR').includes(q) ||
          article.preview.toLocaleLowerCase('tr-TR').includes(q) ||
          article.tags.some((tag) => tag.toLocaleLowerCase('tr-TR').includes(q))
        );
      });
      setKBResults(filtered);
    }, 200);

    return () => clearTimeout(timer);
  }, [kbQuery]);

  useEffect(() => {
    if (!showEmptyNoteWarning) return;
    if (emptyNoteCountdown <= 0) {
      setShowEmptyNoteWarning(false);
      proceedEndCall(true);
      return;
    }

    const t = setTimeout(() => setEmptyNoteCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [showEmptyNoteWarning, emptyNoteCountdown]);

  useEffect(() => {
    if (pageState !== "post_call" || !postCallData) return;

    let current = 0;
    const step = postCallData.totalXP / 30;
    const timer = setInterval(() => {
      current += step;
      if (current >= postCallData.totalXP) {
        setXPAnimated(postCallData.totalXP);
        clearInterval(timer);
      } else {
        setXPAnimated(Math.round(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [pageState, postCallData]);

  useEffect(() => {
    if (pageState !== "post_call" || !autoProceeding) return;
    if (postCallCountdown <= 0) {
      finalizePostCall(true);
      return;
    }

    const t = setTimeout(() => setPostCallCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [postCallCountdown, autoProceeding, pageState]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-transparent overflow-hidden flex flex-col">
      <style>{customStyles}</style>

      {incomingAlert && pageState === "idle" && (
        <>
          {/* Blur overlay behind the alert card */}
          <div className="absolute inset-0 z-40 backdrop-blur-[2px] bg-white/20 pointer-events-none" />
          <IncomingCallAlert
            alert={incomingAlert}
            elapsed={incomingElapsed}
            onAnswer={handleAnswerIncoming}
            onReject={handleRejectIncoming}
          />
        </>
      )}

      {pageState === "idle" && (
        <IdleScreen
          isConnected
          onOpenLastCall={() => navigate("/calls")}
          lastCallSummary={lastCallSummary}
        />
      )}

      {pageState === "active" && activeCall && (
        <ActiveScreen
          call={activeCall}
          duration={duration}
          holdDuration={holdDuration}
          waitDuration={waitDuration}
          isOnHold={isOnHold}
          setIsOnHold={setIsOnHold}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          showTransferMenu={showTransferMenu}
          setShowTransferMenu={setShowTransferMenu}
          transferQuery={transferQuery}
          setTransferQuery={setTransferQuery}
          filteredTransferTargets={filteredTransferTargets}
          onTransfer={(target) => {
            if (!target.isAvailable) {
              const yes = window.confirm(`Dahili ${target.extension || "-"} su an mesgul. Yine de aktar?`);
              if (!yes) return;
            }
            pushToast(`${target.name} hedefine aktarim baslatildi.`, "ok");
            setShowTransferMenu(false);
          }}
          onEndCall={handleEndCall}
          endCallHolding={endCallHolding}
          setEndCallHolding={setEndCallHolding}
          customerTab={customerTab}
          setCustomerTab={setCustomerTab}
          isEditingCustomer={isEditingCustomer}
          setIsEditingCustomer={setIsEditingCustomer}
          editedCustomer={editedCustomer}
          setEditedCustomer={setEditedCustomer}
          isSavingCustomer={isSavingCustomer}
          customerSaveOk={customerSaveOk}
          saveCustomer={saveCustomer}
          selectedHistoryCall={selectedHistoryCall}
          setSelectedHistoryCall={setSelectedHistoryCall}
          noteText={noteText}
          setNoteText={setNoteText}
          noteCategory={noteCategory}
          setNoteCategory={setNoteCategory}
          noteTags={noteTags}
          setNoteTags={setNoteTags}
          notePriority={notePriority}
          setNotePriority={setNotePriority}
          noteSaveStatus={noteSaveStatus}
          aiData={aiData}
          setAIData={setAIData}
          copiedSuggestion={copiedSuggestion}
          setCopiedSuggestion={setCopiedSuggestion}
          expandedTemplate={expandedTemplate}
          setExpandedTemplate={setExpandedTemplate}
          onUseTemplate={(text) => {
            setNoteText((prev) => `${prev}${prev ? "\n" : ""}${text}`);
            pushToast("Sablon not alanina eklendi.", "ok");
          }}
          kbQuery={kbQuery}
          setKBQuery={setKBQuery}
          kbResults={kbResults}
          expandedKBId={expandedKBId}
          setExpandedKBId={setExpandedKBId}
          onCopyKB={(text) => {
            navigator.clipboard.writeText(text);
            pushToast("Bilgi bankasi metni panoya kopyalandi.", "ok");
          }}
          onOpenKBArticle={(title) => {
            pushToast(`${title} acildi.`, "info");
          }}
          mobileRightOpen={mobileRightOpen}
          setMobileRightOpen={setMobileRightOpen}
          mobileRightTab={mobileRightTab}
          setMobileRightTab={setMobileRightTab}
          isNarrow={isNarrow}
          isVeryNarrow={isVeryNarrow}
        />
      )}

      {pageState === "post_call" && postCallData && (
        <PostCallScreen
          postCallData={postCallData}
          editingAISummary={editingAISummary}
          setEditingAISummary={setEditingAISummary}
          editedSummary={editedSummary}
          setEditedSummary={setEditedSummary}
          xpAnimated={xpAnimated}
          postCallCountdown={postCallCountdown}
          autoProceeding={autoProceeding}
          setAutoProceeding={setAutoProceeding}
          onApprove={() => finalizePostCall(true)}
          onSkip={() => finalizePostCall(false)}
        />
      )}

      {showEmptyNoteWarning && (
        <EmptyNoteWarning
          countdown={emptyNoteCountdown}
          onAdd={() => {
            setShowEmptyNoteWarning(false);
            pushToast("Not paneline geri donuldu.", "info");
          }}
          onSkip={() => {
            setShowEmptyNoteWarning(false);
            proceedEndCall(true);
          }}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}

function DevToolbar({
  simulateIncomingCall,
  skipToDuration,
  triggerKeyword,
  setCRMStatus,
  setAIData,
  simulatePostCall,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [position, setPosition] = useState(() => ({
    x: Math.max(window.innerWidth - 250, 8),
    y: 70,
  }));
  const dragRef = useRef(null);

  const clampPosition = (x, y, isCollapsed) => {
    const panelWidth = isCollapsed ? 170 : 240;
    const panelHeight = isCollapsed ? 44 : 330;
    const nextX = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - panelWidth - 8));
    const nextY = Math.min(Math.max(8, y), Math.max(8, window.innerHeight - panelHeight - 8));
    return { x: nextX, y: nextY };
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y, collapsed));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...position };

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPosition(clampPosition(origin.x + dx, origin.y + dy, collapsed));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragRef.current = null;
    };

    dragRef.current = { onMove, onUp };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    return () => {
      if (!dragRef.current) return;
      window.removeEventListener("mousemove", dragRef.current.onMove);
      window.removeEventListener("mouseup", dragRef.current.onUp);
    };
  }, []);

  return (
    <div
      className="fixed z-[9999]"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {collapsed ? (
        <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 backdrop-blur px-2 py-1.5 shadow-md">
          <button
            type="button"
            onMouseDown={startDrag}
            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing px-1 text-sm"
            title="Sürükle"
          >
            ::
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-slate-700"
            onClick={() => setCollapsed(false)}
          >
            Geliştirici Sekmesi
          </button>
        </div>
      ) : (
        <div className="w-[236px] p-2.5 rounded-xl text-xs flex flex-col gap-1.5 border border-slate-200 bg-white/95 backdrop-blur shadow-lg">
          <div className="px-1 mb-1 flex items-center justify-between">
            <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Geliştirici Araçları</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={startDrag}
                className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-grab active:cursor-grabbing"
                title="Sürükle"
              >
                ::
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                title="Küçült"
              >
                _
              </button>
            </div>
          </div>

          <button className="px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-left" onClick={simulateIncomingCall}>
            Gelen Çağrı
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-left" onClick={() => skipToDuration(900)}>
            15 dk Çağrıya Atla
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-left" onClick={() => triggerKeyword("iade")}>
            Tetik: iade
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-left" onClick={() => setCRMStatus("not_found")}>
            CRM: Kayıt Yok
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-left" onClick={() => setCRMStatus("error")}>
            CRM: Hata
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-left" onClick={() => setAIData(null)}>
            AI: Kapat
          </button>
          <button className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-left" onClick={simulatePostCall}>
            Post-Call Ekranı
          </button>
        </div>
      )}
    </div>
  );
}

function IncomingCallAlert({ alert, elapsed, onAnswer, onReject }) {
  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[min(520px,94%)] animate-slideDown ${
        elapsed >= 25 ? "animate-shakeAlert" : ""
      }`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        {/* Dark header */}
        <div className="rounded-t-2xl px-5 py-3.5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
              Gelen Çağrı
            </span>
          </div>
          <div className="flex items-center gap-2">
            {alert.vip && (
              <span className="text-[9px] font-bold bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                VIP
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Animated phone ring */}
          <div className="relative h-[56px] w-[56px] shrink-0 flex items-center justify-center">
            <span
              className="absolute inset-0 rounded-full border-2 border-emerald-300/50 animate-ping"
              style={{ animationDuration: "1.4s" }}
            />
            <span className="absolute inset-[6px] rounded-full border border-emerald-200/30" />
            <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.4)] flex items-center justify-center">
              <PhoneIncoming className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Caller info */}
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-slate-800 leading-tight truncate">
              {alert.name || alert.number}
            </div>
            {alert.name && (
              <div className="text-[12px] text-slate-500 font-mono mt-0.5">{alert.number}</div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                IVR: {alert.ivr}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={onAnswer}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[12px] font-bold transition-colors flex items-center gap-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.5} />
              Cevapla
            </button>
            <button
              onClick={onReject}
              className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 text-slate-600 text-[12px] font-semibold transition-colors flex items-center gap-1.5"
            >
              <PhoneOff className="h-3.5 w-3.5" strokeWidth={2} />
              Reddet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdleScreen({ isConnected, onOpenLastCall, lastCallSummary }) {
  const [readySeconds, setReadySeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [cdrStats, setCdrStats] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setReadySeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Real CDR stats ──
  useEffect(() => {
    cdrApi.getStats()
      .then((res) => setCdrStats(res.data))
      .catch(() => {}); // keep placeholder on error
  }, []);

  const answeredVal = cdrStats ? String(cdrStats.answered_calls ?? 0) : "—";
  const missedVal   = cdrStats ? String(cdrStats.no_answer_calls ?? 0) : "—";
  const avgDur      = cdrStats ? formatDuration(Math.round(cdrStats.avg_duration_seconds ?? 0)) : "—:——";
  const answerRate  = cdrStats ? `%${Math.round(cdrStats.answer_rate_percent ?? 0)} yanıt` : "";

  const stats = [
    {
      label: "Yanıtlanan Çağrı",
      value: answeredVal,
      sub: answerRate || "Toplam CDR",
      icon: PhoneIncoming,
      iconCls: "bg-emerald-100 text-emerald-600",
      valCls: "text-emerald-600",
      subCls: "text-emerald-500",
    },
    {
      label: "Cevapsız Çağrı",
      value: missedVal,
      sub: "Kaçan + meşgul",
      icon: PhoneMissed,
      iconCls: "bg-amber-100 text-amber-600",
      valCls: "text-amber-600",
      subCls: "text-amber-500",
    },
    {
      label: "Ort. Görüşme",
      value: avgDur,
      sub: "Faturalandırılan süre",
      icon: Clock,
      iconCls: "bg-blue-100 text-blue-600",
      valCls: "text-blue-600",
      subCls: "text-blue-500",
    },
  ];

  const systemItems = [
    { label: "Ort. Cevap Süresi", value: "11s", ok: true },
    { label: "Kuyruk Durumu", value: "Boş", ok: true },
    { label: "Kaçan Çağrı Oranı", value: "%3", ok: true },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-4 md:gap-5">

        {/* ── 1. Hero status kartı ── */}
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/40 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
          
          {/* Koyu header — dashboard widget başlıklarıyla aynı dil */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300 font-bold">
                Bekleme Modu
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border backdrop-blur-md transition-colors duration-300 ${
                  isConnected
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-rose-500/20 border-rose-400/40 text-rose-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                  }`}
                />
                {isConnected ? "AMI Bağlı" : "Bağlantı Yok"}
              </span>
              <span className="text-xs text-slate-300 font-mono tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                {currentTime.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Body: animasyonlu indikatör + başlık */}
          <div className="px-8 py-8 flex items-center gap-8 relative z-10">
            {/* Halka animasyonu */}
            <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
              <span
                className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping"
                style={{ animationDuration: "3s" }}
              />
              <span
                className="absolute inset-[6px] rounded-full border-2 border-emerald-300/30 animate-ping"
                style={{ animationDuration: "2s", animationDelay: "0.5s" }}
              />
              <span className="absolute inset-[10px] rounded-full border border-emerald-200/40 bg-emerald-50/50 backdrop-blur-sm" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_24px_rgba(16,185,129,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                <Phone className="h-7 w-7 text-white drop-shadow-md" strokeWidth={1.5} />
              </div>
            </div>

            {/* Metin */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1 drop-shadow-sm">
                Çağrı Bekleniyor
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Dahili <span className="text-slate-700 font-bold">1001</span> hazır · Gelen çağrı otomatik olarak açılır
              </p>
              
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 shadow-sm transition-all hover:shadow-md hover:bg-white">
                  <div className="p-1 bg-slate-100 rounded-md">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Bekleme</span>
                  <span className="text-base font-bold text-slate-800 font-mono tracking-tight ml-1">
                    {formatDuration(readySeconds)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2 shadow-sm transition-all hover:shadow-md hover:bg-emerald-100/50">
                  <div className="p-1 bg-emerald-100 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700">Sistem Hazır</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Bugünkü istatistikler ── */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-4"
              >
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${s.iconCls}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[26px] font-extrabold tabular-nums leading-none ${s.valCls}`}
                  >
                    {s.value}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                    {s.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 font-medium ${s.subCls}`}>
                    {s.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. Alt satır: sistem durumu + son görüşme ── */}
        <div className="grid grid-cols-[1fr_260px] gap-4">
          {/* Sistem durumu */}
          <div className="rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
            <div className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4">
              Sistem Durumu
            </div>
            <div className="grid grid-cols-3 gap-3">
              {systemItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-50/50 border border-slate-100 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="text-[13px] font-semibold text-slate-400 mb-1">
                    {item.label}
                  </div>
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      item.ok ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Son görüşme */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 pt-3.5 pb-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold mb-1">
                Son Görüşme
              </div>
              <div className="text-[14px] font-bold text-white leading-tight truncate">
                {lastCallSummary?.name || "—"}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {formatDuration(lastCallSummary?.duration || 0)}
                </span>
                {lastCallSummary?.category && (
                  <span className="text-[9px] font-semibold bg-white/10 border border-white/15 text-white/80 px-1.5 py-0.5 rounded-full">
                    {lastCallSummary.category}
                  </span>
                )}
                {lastCallSummary?.result && (
                  <span className="text-[9px] font-semibold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-1.5 py-0.5 rounded-full">
                    {lastCallSummary.result}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 p-3 flex flex-col gap-2.5">
              {lastCallSummary?.note && (
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  "{lastCallSummary.note}"
                </p>
              )}
              <button
                type="button"
                onClick={onOpenLastCall}
                className="mt-auto h-9 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold flex items-center justify-between px-3.5 transition-colors"
              >
                Çağrı geçmişini aç
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ActiveScreen(props) {
  const {
    call,
    duration,
    holdDuration,
    waitDuration,
    isOnHold,
    setIsOnHold,
    isRecording,
    setIsRecording,
    showTransferMenu,
    setShowTransferMenu,
    transferQuery,
    setTransferQuery,
    filteredTransferTargets,
    onTransfer,
    onEndCall,
    endCallHolding,
    setEndCallHolding,
    customerTab,
    setCustomerTab,
    isEditingCustomer,
    setIsEditingCustomer,
    editedCustomer,
    setEditedCustomer,
    isSavingCustomer,
    customerSaveOk,
    saveCustomer,
    selectedHistoryCall,
    setSelectedHistoryCall,
    noteText,
    setNoteText,
    noteCategory,
    setNoteCategory,
    noteTags,
    setNoteTags,
    notePriority,
    setNotePriority,
    noteSaveStatus,
    aiData,
    copiedSuggestion,
    setCopiedSuggestion,
    expandedTemplate,
    setExpandedTemplate,
    onUseTemplate,
    kbQuery,
    setKBQuery,
    kbResults,
    expandedKBId,
    setExpandedKBId,
    onCopyKB,
    onOpenKBArticle,
    mobileRightOpen,
    setMobileRightOpen,
    mobileRightTab,
    setMobileRightTab,
    isNarrow,
    isVeryNarrow,
  } = props;

  const [newTag, setNewTag] = useState("");
  const [complaintOpen, setComplaintOpen] = useState(false);

  // 2-step confirm: first click arms, second click (within 2s) ends call
  const [endConfirming, setEndConfirming] = useState(false);
  const endConfirmTimer = useRef(null);

  const holdToEnd = () => {
    if (!endConfirming) {
      setEndConfirming(true);
      endConfirmTimer.current = setTimeout(() => setEndConfirming(false), 2000);
    } else {
      clearTimeout(endConfirmTimer.current);
      setEndConfirming(false);
      onEndCall();
    }
  };

  useEffect(() => () => clearTimeout(endConfirmTimer.current), []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f0f2f5]">
      <CallInfoBand
        call={call}
        duration={duration}
        waitDuration={waitDuration}
        isOnHold={isOnHold}
        holdDuration={holdDuration}
      />

      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <div className={`h-full grid gap-4 ${isNarrow ? "grid-cols-1" : "2xl:[grid-template-columns:8fr_4fr] [grid-template-columns:7fr_5fr]"}`}>
          <div className="min-h-0 grid grid-rows-2 gap-4">
            <CustomerCard
              call={call}
              customerTab={customerTab}
              setCustomerTab={setCustomerTab}
              isEditingCustomer={isEditingCustomer}
              setIsEditingCustomer={setIsEditingCustomer}
              editedCustomer={editedCustomer}
              setEditedCustomer={setEditedCustomer}
              isSavingCustomer={isSavingCustomer}
              customerSaveOk={customerSaveOk}
              saveCustomer={saveCustomer}
              selectedHistoryCall={selectedHistoryCall}
              setSelectedHistoryCall={setSelectedHistoryCall}
              hideHistoryTab={isVeryNarrow}
            />

            <NotePanel
              noteText={noteText}
              setNoteText={setNoteText}
              noteCategory={noteCategory}
              setNoteCategory={setNoteCategory}
              noteTags={noteTags}
              setNoteTags={setNoteTags}
              notePriority={notePriority}
              setNotePriority={setNotePriority}
              noteSaveStatus={noteSaveStatus}
              newTag={newTag}
              setNewTag={setNewTag}
            />
          </div>

          {!isNarrow && (
            <div className="min-h-0 grid grid-rows-2 gap-4">
              <AIAssistantPanel
                aiData={aiData}
                copiedSuggestion={copiedSuggestion}
                setCopiedSuggestion={setCopiedSuggestion}
                expandedTemplate={expandedTemplate}
                setExpandedTemplate={setExpandedTemplate}
                onUseTemplate={onUseTemplate}
              />

              <KnowledgeBasePanel
                kbQuery={kbQuery}
                setKBQuery={setKBQuery}
                kbResults={kbResults}
                expandedKBId={expandedKBId}
                setExpandedKBId={setExpandedKBId}
                onCopyKB={onCopyKB}
                onOpenKBArticle={onOpenKBArticle}
              />
            </div>
          )}
        </div>
      </div>

      {isNarrow && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <button
            className={`px-3 py-1.5 text-xs rounded ${mobileRightTab === "ai" ? "bg-[#7F77DD] text-white" : "bg-slate-200 text-slate-700"}`}
            onClick={() => {
              setMobileRightTab("ai");
              setMobileRightOpen(true);
            }}
          >
            AI Asistani
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded ${mobileRightTab === "kb" ? "bg-[#1DB954] text-white" : "bg-slate-200 text-slate-700"}`}
            onClick={() => {
              setMobileRightTab("kb");
              setMobileRightOpen(true);
            }}
          >
            Bilgi Bankasi
          </button>
        </div>
      )}

      {isNarrow && mobileRightOpen && (
        <div className="absolute inset-0 z-40 bg-black/40 flex justify-end">
          <div className="w-[min(420px,95vw)] h-full bg-white p-3 animate-slideFromRight overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">
                {mobileRightTab === "ai" ? "AI Asistani" : "Bilgi Bankasi"}
              </div>
              <button className="p-1 rounded hover:bg-slate-100" onClick={() => setMobileRightOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {mobileRightTab === "ai" ? (
                <AIAssistantPanel
                  aiData={aiData}
                  copiedSuggestion={copiedSuggestion}
                  setCopiedSuggestion={setCopiedSuggestion}
                  expandedTemplate={expandedTemplate}
                  setExpandedTemplate={setExpandedTemplate}
                  onUseTemplate={onUseTemplate}
                />
              ) : (
                <KnowledgeBasePanel
                  kbQuery={kbQuery}
                  setKBQuery={setKBQuery}
                  kbResults={kbResults}
                  expandedKBId={expandedKBId}
                  setExpandedKBId={setExpandedKBId}
                  onCopyKB={onCopyKB}
                  onOpenKBArticle={onOpenKBArticle}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <CallControlBar
        isOnHold={isOnHold}
        setIsOnHold={setIsOnHold}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        showTransferMenu={showTransferMenu}
        setShowTransferMenu={setShowTransferMenu}
        transferQuery={transferQuery}
        setTransferQuery={setTransferQuery}
        filteredTransferTargets={filteredTransferTargets}
        onTransfer={onTransfer}
        onOpenComplaint={() => setComplaintOpen(true)}
        holdToEnd={holdToEnd}
        endConfirming={endConfirming}
      />

      {complaintOpen && (
        <ComplaintModal
          call={call}
          onClose={() => setComplaintOpen(false)}
        />
      )}
    </div>
  );
}

function CallInfoBand({ call, duration, waitDuration, isOnHold, holdDuration }) {
  const timer = timerColor(duration);
  const customerLabel = call.customer?.name || "Bilinmeyen";
  const customerStyle = call.customer ? "font-semibold text-white" : "italic text-slate-400";
  const category = call.customer?.category || "Yeni";

  return (
    <div className="h-16 bg-[#1a1f2e] text-white px-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-700">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnHold ? "bg-[#f59e0b]" : "bg-red-500 animate-blinkDot"}`}></span>
          <span className={`text-xs font-bold tracking-wide ${isOnHold ? "text-[#f59e0b]" : "text-red-500"}`}>
            {isOnHold ? "BEKLETILIYOR" : "CANLI"}
          </span>
        </div>

        <div className="font-mono text-sm">{call.callerNumber}</div>
        <div className={`text-sm ${customerStyle}`}>{customerLabel}</div>

        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            category === "VIP"
              ? "border-amber-400/40 text-amber-300 bg-amber-500/10"
              : category === "Standart"
                ? "border-slate-400/30 text-slate-300 bg-slate-500/10"
                : "border-emerald-400/30 text-emerald-300 bg-emerald-500/10"
          }`}
        >
          {category}
        </span>

        <div className="text-xs text-slate-300">IVR: {call.ivrPath.join(" > ")}</div>
        <div className="text-xs text-slate-400">Bekledi: {formatDuration(waitDuration)}</div>
        {isOnHold && <div className="text-xs text-amber-300">Bekletme: {formatDuration(holdDuration)}</div>}
      </div>

      <div className="font-mono text-[28px] font-bold transition-colors duration-1000" style={{ color: timer }}>
        {formatDuration(duration)}
      </div>
    </div>
  );
}

function CustomerCard({
  call,
  customerTab,
  setCustomerTab,
  isEditingCustomer,
  setIsEditingCustomer,
  editedCustomer,
  setEditedCustomer,
  isSavingCustomer,
  customerSaveOk,
  saveCustomer,
  selectedHistoryCall,
  setSelectedHistoryCall,
  hideHistoryTab,
}) {
  if (call.crmStatus === "error") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 h-full p-5 flex flex-col justify-center">
        <div className="flex items-center gap-2 text-red-500 font-semibold mb-2">
          <AlertTriangle className="w-5 h-5" /> CRM'e ulasilamiyor
        </div>
        <div className="text-sm text-slate-500 mb-3">Baglanti hatasi - Son deneme: 3 sn once</div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded border border-slate-300 text-sm">Tekrar Dene</button>
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm">Manuel Kayit Ac</button>
        </div>
      </div>
    );
  }

  if (call.crmStatus === "not_found" || !call.customer) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 h-full p-5 flex flex-col">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <UserPlus className="w-5 h-5 text-blue-600" /> Yeni Musteri
        </div>
        <div className="text-sm text-slate-500 mt-1">Bu numara CRM'de kayitli degil.</div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
          <input className="border border-slate-300 rounded px-3 py-2" placeholder="Ad Soyad" />
          <input className="border border-slate-300 rounded px-3 py-2" placeholder="E-posta" />
          <select className="border border-slate-300 rounded px-3 py-2">
            <option>Standart</option>
            <option>VIP</option>
            <option>Yeni</option>
          </select>
          <input className="border border-slate-300 rounded px-3 py-2" placeholder="Not" />
        </div>

        <div className="mt-auto pt-4 flex gap-2">
          <button className="px-3 py-2 rounded bg-[#1DB954] text-white text-sm">Simdi Kaydet</button>
          <button className="px-3 py-2 rounded border border-slate-300 text-sm">Cagri Sonrasi Kaydet</button>
        </div>
      </div>
    );
  }

  const customer = call.customer;
  const initial = customer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase('tr-TR');

  const selectedHistory = customer.previousCalls.find((item) => item.id === selectedHistoryCall) || null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col overflow-hidden relative">
      <div className="px-4 border-b border-slate-100 flex items-center gap-4">
        <button
          onClick={() => setCustomerTab("info")}
          className={`py-3 text-sm font-semibold border-b-2 ${customerTab === "info" ? "border-[#1DB954] text-slate-900" : "border-transparent text-slate-500"}`}
        >
          Musteri Bilgileri
        </button>
        {!hideHistoryTab && (
          <button
            onClick={() => setCustomerTab("history")}
            className={`py-3 text-sm font-semibold border-b-2 ${customerTab === "history" ? "border-[#1DB954] text-slate-900" : "border-transparent text-slate-500"}`}
          >
            Gorusme Gecmisi {customer.totalCalls}
          </button>
        )}
      </div>

      <div className="p-4 flex-1 min-h-0 overflow-auto">
        {customerTab === "info" ? (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1DB954]/15 text-[#1DB954] grid place-items-center font-bold">{initial}</div>
                <div>
                  <div className="font-semibold text-slate-900">{customer.name}</div>
                  <div className="text-xs text-slate-500">ID: {customer.id}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Kayit: {formatDate(customer.registeredAt)}</div>
                </div>
              </div>

              {!isEditingCustomer ? (
                <button
                  className="text-sm text-blue-600"
                  onClick={() => {
                    setEditedCustomer({
                      name: customer.name,
                      email: customer.email,
                      category: customer.category,
                    });
                    setIsEditingCustomer(true);
                  }}
                >
                  Duzenle
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <button className="text-sm text-slate-500" onClick={() => setIsEditingCustomer(false)}>
                    Iptal
                  </button>
                  <button className="text-sm text-[#1DB954] font-semibold flex items-center gap-1" onClick={saveCustomer}>
                    {isSavingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingCustomer ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              )}
            </div>

            {customerSaveOk && (
              <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Kaydedildi
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-4">
              <InfoBox title="E-posta" value={isEditingCustomer ? "" : customer.email}>
                {isEditingCustomer && (
                  <input
                    value={editedCustomer.email || ""}
                    onChange={(e) => setEditedCustomer((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full mt-1 border border-slate-300 rounded px-2 py-1 text-sm"
                  />
                )}
              </InfoBox>
              <InfoBox title="Son Gorusme" value={formatDate(customer.lastCallAt)} />
              <InfoBox title="Toplam" value={`${customer.totalCalls} cagri`} />
            </div>

            <div className="mt-4 text-sm text-slate-700">
              Musteri Memnuniyeti: {" "}
              <span className="font-semibold">{customer.csatAverage.toFixed(1)}/5 ({customer.csatCount} anket)</span>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              Son not onizlemesi: "{customer.lastNote}" {" "}
              <button className="text-blue-600 text-xs">Tumunu gor</button>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              Yetki notu: Müşteri kaydı düzenlenebilir, silme işlemi yalnızca Admin tarafından yapılır.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {customer.previousCalls.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-10">
                Bu musteriyle ilk gorusmeniz. Notlar burada birikecek.
              </div>
            ) : (
              customer.previousCalls.map((history) => {
                const badge = getResultBadge(history.result);
                return (
                  <button
                    key={history.id}
                    onClick={() => setSelectedHistoryCall(history.id)}
                    className="w-full text-left border border-slate-200 rounded-lg p-3 hover:border-[#1DB954]/40"
                  >
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>
                        {formatDate(history.date)} - {history.duration ? formatDuration(history.duration) : "--:--"} - {history.agentName}
                      </span>
                      <span className={badge.color}>{badge.label}</span>
                    </div>
                    <div className="text-sm text-slate-700 mt-1 line-clamp-1">"{history.notePreview || "Not bulunamadi"}"</div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedHistory && (
        <div className="absolute right-0 top-0 h-full w-[330px] bg-white border-l border-slate-200 shadow-xl p-4 animate-slideFromRight">
          <button className="absolute top-2 right-2 p-1 rounded hover:bg-slate-100" onClick={() => setSelectedHistoryCall(null)}>
            <X className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-slate-900 mt-5">Cagri Detayi</div>
          <div className="text-xs text-slate-500 mt-1">{formatDate(selectedHistory.date)} - {formatDuration(selectedHistory.duration)}</div>

          <div className="mt-4 text-sm text-slate-700">Not: {selectedHistory.notePreview || "Not yok"}</div>
          <div className="mt-3 text-sm text-slate-700">AI Ozeti: {selectedHistory.hasAISummary ? "Mevcut" : "Yok"}</div>
          <div className="mt-2 text-sm text-slate-700">Kayit: {selectedHistory.hasRecording ? "Cal" : "Yok"}</div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ title, value, children }) {
  return (
    <div className="border border-slate-200 rounded-lg p-2">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-sm text-slate-800 mt-0.5">{value}</div>
      {children}
    </div>
  );
}

function NotePanel({
  noteText,
  setNoteText,
  noteCategory,
  setNoteCategory,
  noteTags,
  setNoteTags,
  notePriority,
  setNotePriority,
  noteSaveStatus,
  newTag,
  setNewTag,
}) {
  const saveInfo = {
    idle: { text: "Yaziliyor...", dot: "bg-slate-400" },
    saving: { text: "Otomatik kaydediliyor", dot: "bg-slate-500" },
    saved: { text: "Otomatik kaydedildi", dot: "bg-[#1DB954]" },
    error: { text: "Kayit hatasi", dot: "bg-red-500" },
  }[noteSaveStatus] || { text: "Yaziliyor...", dot: "bg-slate-400" };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || noteTags.includes(tag)) return;
    setNoteTags((prev) => [...prev, tag]);
    setNewTag("");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">GORUSME NOTU</div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5" title={noteSaveStatus === "error" ? "Yerel olarak saklandi" : ""}>
          <span className={`w-2 h-2 rounded-full ${saveInfo.dot}`}></span>
          {saveInfo.text}
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0 overflow-auto flex flex-col gap-4">
        <div className="relative flex-1 min-h-[120px]">
          <textarea
            className="w-full h-full min-h-[120px] resize-none border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            placeholder="Buraya not yazin... Ctrl+Enter ile satir ekle"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="absolute bottom-2 right-3 text-xs text-slate-400">{noteText.length}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Kategori (zorunlu)</div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "sikayet", label: "Sikayet" },
              { id: "bilgi", label: "Bilgi" },
              { id: "satis", label: "Satis" },
              { id: "teknik", label: "Teknik" },
              { id: "diger", label: "Diger" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setNoteCategory(item.id)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  noteCategory === item.id
                    ? "bg-[#1DB954]/10 border-[#1DB954]/40 text-[#1DB954]"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Oncelik</div>
          <div className="flex gap-5 text-sm">
            {[
              { id: "dusuk", label: "Dusuk" },
              { id: "orta", label: "Orta" },
              { id: "yuksek", label: "Yuksek" },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  checked={notePriority === item.id}
                  onChange={() => setNotePriority(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Etiketler</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {noteTags.map((tag) => (
              <div key={tag} className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                {tag}
                <button onClick={() => setNoteTags((prev) => prev.filter((x) => x !== tag))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
              placeholder="Etiket ekle"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white" onClick={addTag}>
              Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIAssistantPanel({
  aiData,
  copiedSuggestion,
  setCopiedSuggestion,
  expandedTemplate,
  setExpandedTemplate,
  onUseTemplate,
}) {
  if (!aiData || !aiData.isAvailable) {
    return (
      <div className="h-full rounded-xl bg-[#EEEDFE] border border-[#E0DDF0] border-l-[3px] border-l-[#7F77DD] p-4">
        <div className="text-sm font-semibold text-[#4B44A4]">AI Asistani Baglanamiyor</div>
        <div className="text-sm text-[#675FB8] mt-2">AI onerileri su an kullanilamiyor.</div>
        <button className="mt-3 text-xs px-3 py-1.5 rounded bg-white border border-[#cdc9f1] text-[#4B44A4]">
          Bilgi Bankasi'ni Ac
        </button>
      </div>
    );
  }

  const sentimentColor =
    aiData.sentimentScore >= 65 ? "#1DB954" : aiData.sentimentScore >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="h-full rounded-xl bg-[#F8F7FF] border border-[#E0DDF0] border-l-[3px] border-l-[#7F77DD] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E0DDF0] flex items-center justify-between">
        <div className="text-sm font-semibold text-[#4B44A4]">AI Asistani</div>
        <div className="text-xs text-[#7F77DD] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#7F77DD] animate-pulse"></span> Canli
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0 overflow-auto space-y-4">
        <div>
          <div className="text-[11px] font-semibold text-[#6f68be] uppercase">Duygu Analizi</div>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${aiData.sentimentScore}%`, backgroundColor: sentimentColor }}></div>
          </div>
          <div className="text-xs mt-1" style={{ color: sentimentColor }}>
            {aiData.sentimentLabel} {aiData.sentimentScore}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-[#6f68be] uppercase">Onerilen Yanit</div>
          <div className="mt-2 border border-[#E0DDF0] bg-white rounded-lg p-3 text-sm text-slate-700 animate-replyIn">
            "{aiData.suggestedReply}"
          </div>
          <button
            className={`mt-2 w-full text-xs px-3 py-1.5 rounded border ${
              copiedSuggestion ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-[#d6d3ef] text-[#574ECC]"
            }`}
            onClick={() => {
              navigator.clipboard.writeText(aiData.suggestedReply);
              setCopiedSuggestion(true);
              setTimeout(() => setCopiedSuggestion(false), 2000);
            }}
          >
            {copiedSuggestion ? "Kopyalandi" : "Panoya Kopyala"}
          </button>
        </div>

        {aiData.triggerAlerts.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#6f68be] uppercase">Anahtar Kelime Uyarisi</div>
            <div className="mt-2 space-y-2">
              {aiData.triggerAlerts.map((alert) => (
                <div key={alert.id} className="bg-amber-50 border-l-4 border-amber-400 rounded-r p-2 text-sm text-amber-800">
                  "{alert.keyword}" kelimesi tespit edildi
                  <div className="text-xs mt-1">{alert.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold text-[#6f68be] uppercase">Hazir Cevap Sablonlari</div>
          <div className="mt-2 space-y-2">
            {aiData.templates.map((tpl) => (
              <div key={tpl.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  className="w-full px-3 py-2 text-sm flex items-center justify-between"
                  onClick={() => setExpandedTemplate((prev) => (prev === tpl.id ? null : tpl.id))}
                >
                  <span>{tpl.title}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedTemplate === tpl.id ? "rotate-180" : ""}`} />
                </button>
                {expandedTemplate === tpl.id && (
                  <div className="px-3 pb-3 text-sm text-slate-600 border-t border-slate-100">
                    <div className="pt-2">{tpl.content}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded border border-slate-300"
                        onClick={() => navigator.clipboard.writeText(tpl.content)}
                      >
                        Kopyala
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-[#7F77DD] text-white"
                        onClick={() => onUseTemplate(tpl.content)}
                      >
                        Not'a Ekle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeBasePanel({
  kbQuery,
  setKBQuery,
  kbResults,
  expandedKBId,
  setExpandedKBId,
  onCopyKB,
  onOpenKBArticle,
}) {
  return (
    <div className="h-full rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-sm font-semibold text-slate-800">Bilgi Bankasi</div>
        <div className="mt-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-slate-300 rounded pl-8 pr-2 py-2 text-sm"
            placeholder="Konu veya anahtar kelime..."
            value={kbQuery}
            onChange={(e) => setKBQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {kbQuery.trim().length > 1 ? (
          kbResults.length > 0 ? (
            kbResults.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 flex items-center justify-between"
                  onClick={() => setExpandedKBId((prev) => (prev === item.id ? null : item.id))}
                >
                  <span>{item.title}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedKBId === item.id ? "rotate-180" : ""}`} />
                </button>
                {expandedKBId === item.id && (
                  <div className="px-3 pb-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600 pt-2">{item.content}</p>
                    <div className="mt-2 flex gap-2">
                      <button className="text-xs px-2 py-1 rounded border border-slate-300" onClick={() => onCopyKB(item.preview)}>
                        Kopyala
                      </button>
                      <button className="text-xs px-2 py-1 rounded bg-slate-900 text-white" onClick={() => onOpenKBArticle(item.title)}>
                        Tam Makaleyi Ac
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">
              "{kbQuery}" icin sonuc bulunamadi.
              <button className="block mt-2 text-xs text-blue-600">+ Bilgi Bankasi'na ekle</button>
            </div>
          )
        ) : (
          <div className="space-y-1">
            {mockKBArticles.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 text-sm text-slate-700"
                onClick={() => {
                  setKBQuery(item.title);
                  setExpandedKBId(item.id);
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CallControlBar({
  isOnHold,
  setIsOnHold,
  isRecording,
  setIsRecording,
  showTransferMenu,
  setShowTransferMenu,
  transferQuery,
  setTransferQuery,
  filteredTransferTargets,
  onTransfer,
  onOpenComplaint,
  holdToEnd,
  endConfirming,
}) {
  return (
    <div className="h-14 bg-[#1a1f2e] px-4 border-t border-slate-700 sticky bottom-0 z-30 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 ${
            isOnHold ? "bg-[#f59e0b] text-white" : "bg-slate-700 text-slate-100"
          }`}
          onClick={() => setIsOnHold((prev) => !prev)}
        >
          {isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {isOnHold ? "Devam Et" : "Beklet"}
        </button>

        <div className="relative">
          <button
            className="px-3 py-1.5 rounded text-sm font-semibold bg-slate-700 text-slate-100 flex items-center gap-1"
            onClick={() => setShowTransferMenu((prev) => !prev)}
          >
            Aktar <ChevronDown className="w-4 h-4" />
          </button>

          {showTransferMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-40">
              <input
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mb-2"
                placeholder="Dahili veya departman ara"
                value={transferQuery}
                onChange={(e) => setTransferQuery(e.target.value)}
              />
              <div className="max-h-56 overflow-auto">
                {filteredTransferTargets.map((target) => (
                  <button
                    key={target.id}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between ${
                      target.isAvailable ? "hover:bg-slate-100" : "opacity-60"
                    }`}
                    onClick={() => onTransfer(target)}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${target.isAvailable ? "bg-[#1DB954]" : "bg-slate-400"}`}></span>
                      {target.name}
                    </span>
                    <span className="text-xs text-slate-500">{target.extension ? `Dahili ${target.extension}` : "Departman"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className={`px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 ${
            isRecording ? "bg-slate-700 text-slate-300" : "bg-red-500/15 text-red-500 border border-red-500/30"
          }`}
          onClick={() => setIsRecording((prev) => !prev)}
        >
          <Mic className="w-4 h-4" />
          {isRecording ? "Otomatik" : "REC Aktif"}
        </button>

        <button
          type="button"
          onClick={onOpenComplaint}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
        >
          Şikayet Kaydı
        </button>
      </div>

      <button
        onClick={holdToEnd}
        className={`relative px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all duration-150 ${
          endConfirming
            ? "bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-1 ring-offset-[#1a1f2e] scale-105"
            : "bg-rose-500 text-white hover:bg-rose-600"
        }`}
        title={endConfirming ? "Bir kez daha tıkla — onaylandı" : "Çağrıyı kapat"}
      >
        <PhoneOff className="w-4 h-4" />
        {endConfirming ? "Onayla?" : "Kapat"}
      </button>
    </div>
  );
}

function ComplaintModal({ call, onClose }) {
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/35 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Şikayet Akışı</div>
            <div className="text-sm font-semibold">Görüşme Sırasında Şikayet Kaydı</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white/10 grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="p-5 space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 font-semibold">
              Şikayet kaydı oluşturuldu ve Supervisor onay merkezine iletildi.
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 leading-relaxed">
              Akış: Personel oluşturur {"->"} Supervisor onaylar (doğrulanırsa -20 XP) {"->"} Admin gerekirse iptal edip XP iadesi yapabilir.
            </div>
            <div className="text-xs text-slate-500">Müşteri: {call?.callerName || "Bilinmeyen"} · {call?.callerNumber || "-"}</div>
            <div className="flex justify-end">
              <button onClick={onClose} className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold">Kapat</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 leading-relaxed">
              Bu kayıt doğrudan Supervisor onayına gider. Açık ve doğrulanabilir bilgi girin.
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Konu</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                required
                placeholder="Örn: Ürün kalitesi / teslimat şikayeti"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Detay</label>
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                required
                minLength={20}
                rows={4}
                placeholder="Müşterinin açık şikayet beyanını ve çağrı bağlamını yazın."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Minimum 20 karakter detay zorunludur.</span>
              <span>{detail.length} karakter</span>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-300 text-sm">Vazgeç</button>
              <button type="submit" disabled={sending} className="h-9 px-4 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-60">
                {sending ? "Gönderiliyor..." : "Kaydı Oluştur"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PostCallScreen({
  postCallData,
  editingAISummary,
  setEditingAISummary,
  editedSummary,
  setEditedSummary,
  xpAnimated,
  postCallCountdown,
  autoProceeding,
  setAutoProceeding,
  onApprove,
  onSkip,
}) {
  const countdownPct = (postCallCountdown / 5) * 100;

  return (
    <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm p-4 overflow-auto">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="text-2xl font-semibold text-slate-900">Cagri Tamamlandi</div>
          <div className="text-sm text-slate-500 mt-1">
            Sure: {formatDuration(postCallData.duration)} - {postCallData.result}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-800">AI OZETI</div>
              <button className="text-sm text-blue-600" onClick={() => setEditingAISummary((prev) => !prev)}>
                {editingAISummary ? "Bitir" : "Duzenle"}
              </button>
            </div>

            {postCallData.aiSummaryStatus === "failed" ? (
              <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                <div className="text-sm text-red-700 mb-2">Ozet otomatik olusturulamadi. AI servisi yanit vermedi.</div>
                <textarea
                  className="w-full min-h-[110px] border border-slate-300 rounded p-3 text-sm"
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  placeholder="Manuel ozet girebilirsiniz"
                />
              </div>
            ) : editingAISummary ? (
              <textarea
                className="w-full min-h-[110px] border border-slate-300 rounded p-3 text-sm"
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
              />
            ) : (
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                {editedSummary || postCallData.aiSummary}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-500">Tespit edilen talep</div>
                <div className="font-semibold text-slate-800 mt-1">{postCallData.detectedRequest}</div>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-500">Onerilen sonraki adim</div>
                <div className="font-semibold text-slate-800 mt-1">{postCallData.suggestedNextStep}</div>
              </div>
            </div>
          </div>

          <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/40">
            <div className="text-sm font-semibold text-amber-700 mb-2">XP KAZANILDI</div>
            <div className="space-y-1 text-sm">
              {postCallData.xpBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-slate-700">
                  <span>{item.label}</span>
                  <span className="font-semibold text-emerald-600">+{item.points}</span>
                </div>
              ))}
              <div className="h-px bg-amber-200 my-1"></div>
              <div className="flex items-center justify-between text-slate-900 font-semibold">
                <span>Toplam</span>
                <span>+{postCallData.totalXP}</span>
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-amber-600">+{xpAnimated} XP</div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border border-slate-300 text-sm" onClick={onSkip}>
                Atla
              </button>
              <button className="px-3 py-2 rounded border border-slate-300 text-sm" onClick={() => setEditingAISummary(true)}>
                Duzenle
              </button>
            </div>
            <button className="px-4 py-2 rounded bg-[#1DB954] text-white text-sm font-semibold" onClick={onApprove}>
              Onayla ve Kaydet
            </button>
          </div>

          <div className="mt-3">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#1DB954] transition-all duration-1000" style={{ width: `${countdownPct}%` }}></div>
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
              <span>Otomatik devam: {postCallCountdown} saniye</span>
              <button className="text-slate-700" onClick={() => setAutoProceeding((prev) => !prev)}>
                {autoProceeding ? "Iptal" : "Devam"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyNoteWarning({ countdown, onAdd, onSkip }) {
  const pct = (countdown / 5) * 100;
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-4">
        <div className="font-semibold text-slate-900">Not eklemek ister misiniz?</div>
        <div className="text-sm text-slate-500 mt-1">{countdown} saniye sonra atlanacak...</div>
        <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#1DB954] transition-all duration-1000" style={{ width: `${pct}%` }}></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 rounded border border-slate-300 text-sm" onClick={onSkip}>
            Atla
          </button>
          <button className="px-3 py-2 rounded bg-[#1DB954] text-white text-sm" onClick={onAdd}>
            Not Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, tone }) {
  const toneClass =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className={`absolute right-4 bottom-4 z-[70] px-3 py-2 rounded-lg border text-sm shadow ${toneClass}`}>
      {message}
    </div>
  );
}
