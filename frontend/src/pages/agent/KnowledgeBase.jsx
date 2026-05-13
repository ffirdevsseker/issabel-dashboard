import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agentApi } from "@/services/api";

/* ─── useDebounce — değeri belirli süre sabit kaldıktan sonra döndürür ── */
function useDebounce(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── renderMarkdown — basit markdown → JSX (sınırlı altküme) ─────── */
function renderMarkdown(text) {
  const src = String(text ?? "");
  if (!src.trim()) {
    return <p className="text-slate-400 italic">İçerik bulunmuyor.</p>;
  }

  const lines = src.split(/\r?\n/);
  const blocks = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 my-2 text-slate-700 text-[13px]">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();

    // Liste maddesi
    const liMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (liMatch) {
      listBuffer.push(liMatch[1]);
      return;
    }

    // Liste değilse önceki listeyi kapat
    flushList(idx);

    // Başlıklar
    const h3 = /^###\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h3) {
      blocks.push(<h4 key={idx} className="text-[13px] font-bold text-slate-800 mt-3 mb-1">{renderInline(h3[1])}</h4>);
      return;
    }
    if (h2) {
      blocks.push(<h3 key={idx} className="text-[14px] font-bold text-slate-800 mt-4 mb-1.5">{renderInline(h2[1])}</h3>);
      return;
    }
    if (h1) {
      blocks.push(<h2 key={idx} className="text-[15px] font-extrabold text-slate-900 mt-4 mb-2">{renderInline(h1[1])}</h2>);
      return;
    }

    // Boş satır
    if (line.trim() === "") {
      blocks.push(<div key={idx} className="h-2" />);
      return;
    }

    // Normal paragraf
    blocks.push(<p key={idx} className="text-[13px] text-slate-700 leading-relaxed my-1">{renderInline(line)}</p>);
  });

  flushList("end");
  return <div className="prose-sm max-w-none">{blocks}</div>;
}

/* Inline: **bold**, *italic*, `code` */
function renderInline(line) {
  const parts = [];
  let rest = line;
  let key = 0;
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/;
  while (rest) {
    const m = re.exec(rest);
    if (!m) { parts.push(rest); break; }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={`b-${key++}`} className="font-bold text-slate-900">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<em key={`i-${key++}`} className="italic">{m[3]}</em>);
    } else if (m[4] !== undefined) {
      parts.push(<code key={`c-${key++}`} className="px-1 py-0.5 rounded bg-slate-100 text-rose-600 text-[12px] font-mono">{m[4]}</code>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

/* ─── fmtDate — ISO/string tarihi tr-TR formatına çevirir ──────────── */
function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── highlight — aranan kelimeyi <mark> ile sarar ─────────────────── */
function highlight(text, query) {
  const s = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return s;
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    const parts = s.split(re);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="bg-amber-200/70 text-amber-900 rounded px-0.5">{part}</mark>
        : part
    );
  } catch {
    return s;
  }
}
import {
  Search, Sparkles, ChevronRight, ChevronDown,
  Copy, Printer, ThumbsUp, ThumbsDown,
  X, Send, Plus, FileText, Folder, FolderOpen,
  Clock, Tag, User, AlertTriangle, CheckCircle2,
  Loader2, Lightbulb, BookOpen, RotateCcw, Check,
  Package, Wrench, HelpCircle, MessageSquare, ClipboardList,
  RefreshCcw, Star
} from "lucide-react";

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const PAGE_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes aiTyping {
    0%,100% { opacity: 0.3; }
    50%      { opacity: 1; }
  }
  .kb-fade-in { animation: fadeIn 250ms ease-out both; }
  .ai-dot     { animation: aiTyping 1.2s ease-in-out infinite; }
  .ai-dot:nth-child(2) { animation-delay: 0.2s; }
  .ai-dot:nth-child(3) { animation-delay: 0.4s; }
  .premium-card { box-shadow: 0 8px 30px rgba(0,0,0,0.04); border: 1px solid rgba(226,232,240,0.8); }
  .kb-scrollbar::-webkit-scrollbar { width: 4px; }
  .kb-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .kb-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

/* ─────────────────────────────── MOCK DATA (Categories only, dynamic articles) ──────────────────────────── */
const CATEGORIES = [
  {
    id: "urunler", label: "Ürünler & Markalar", icon: Package, count: 20,
    children: [
      { id: "ayakkabi", label: "Ayakkabı",          count: 5 },
      { id: "giyim",    label: "Giyim & Takım",     count: 5 },
      { id: "aksesuar", label: "Aksesuar & Ekipman", count: 4 },
      { id: "markalar", label: "Marka Rehberi",      count: 2 },
      { id: "sporthink", label: "Sporthink Özel",   count: 4 },
    ],
  },
  { id: "kargo",       label: "Kargo & Teslimat",      icon: Wrench,        count: 5,  children: [] },
  { id: "sss",         label: "Sık Sorulan Sorular",   icon: HelpCircle,    count: 6,  children: [] },
  {
    id: "scriptler",   label: "Konuşma Scriptleri",    icon: MessageSquare, count: 9,
    children: [
      { id: "satis",   label: "Satış",    count: 3 },
      { id: "sikayet", label: "Şikayet",  count: 3 },
      { id: "bilgi",   label: "Bilgi",    count: 3 },
    ],
  },
  { id: "prosedurler", label: "Prosedürler",            icon: ClipboardList, count: 4,  children: [] },
  { id: "acil",        label: "Acil Durum Yönergeleri", icon: AlertTriangle, count: 2,  children: [] },
];

const SPORTHINK_MOCK_ARTICLES = [
  {
    id: "sp1",
    categoryId: "sporthink",
    categoryLabel: "Sporthink Özel",
    title: "Sporthink Mağaza Değişim Prosedürü",
    preview: "Müşterilerin online alınan ürünleri mağazadan değişim şartları ve süreci hakkında bilgiler.",
    updatedAt: new Date().toISOString(),
    author: "Sistem",
    tags: ["sporthink", "değişim", "mağaza"],
    related: [],
    content: `## Sporthink Mağaza Değişim Prosedürü
### Genel Kurallar
Sporthink online mağazasından alınan ürünler, teslimat tarihinden itibaren **14 gün** içerisinde tüm Sporthink fiziksel mağazalarından değiştirilebilir.

### Gerekli Belgeler
- Fatura veya E-Arşiv Fatura çıktısı
- Ürünün orijinal kutusu ve etiketleri

### İstisnalar
> İç giyim, mayo ve kişiselleştirilmiş (isim yazılı forma vb.) ürünlerde hijyen ve özel üretim sebebiyle değişim yapılmamaktadır.

### Personel Notu
Müşteriyi en yakın mağazaya yönlendirirken mağaza stok durumunu kontrol etmenize gerek yoktur, müşteri dilediği ürünle fark ödeyerek değişim yapabilir.`
  },
  {
    id: "sp2",
    categoryId: "sporthink",
    categoryLabel: "Sporthink Özel",
    title: "Sporthink Card Puan Kullanımı",
    preview: "Sporthink Card sadakat programı puan kazanımı ve harcama detayları.",
    updatedAt: new Date().toISOString(),
    author: "Sistem",
    tags: ["sadakat", "puan", "sporthink card"],
    related: ["sp1"],
    content: `## Sporthink Card Sadakat Programı
### Puan Kazanımı
Her 100 TL'lik alışverişte **5 Sporthink Puan** kazanılır. (1 Puan = 1 TL)

### Puan Harcama
- Puanlar sadece asıl üründe (indirimli olmayan) kullanılabilir.
- Minimum 50 puan biriktiğinde harcama yapılabilir.

### Üyelik Avantajları
1. Doğum günlerinde 2 kat puan.
2. Yeni sezon ürünlerde öncelikli erişim.
3. Kargo bedava kampanyalarından sınırsız yararlanma.`
  },
  {
    id: "sp3",
    categoryId: "sporthink",
    categoryLabel: "Sporthink Özel",
    title: "Orijinallik Garantisi ve Tedarikçiler",
    preview: "Sporthink bünyesinde satılan markaların orijinallik belgeleri ve garanti süreçleri.",
    updatedAt: new Date().toISOString(),
    author: "Sistem",
    tags: ["orijinallik", "nike", "adidas", "puma"],
    related: [],
    content: `## Orijinallik Garantisi
Sporthink, sattığı tüm markaların (Nike, Adidas, Puma, Skechers vb.) **resmi yetkili satıcısıdır**.

### Garanti Süreci
- Ayakkabılarda üretim hatalarına karşı **6 ay** inceleme garantisi mevcuttur.
- İnceleme süresi ortalama **21 iş günüdür**.

### Tedarikçi Bilgileri
Ürünler doğrudan markaların Türkiye distribütörlerinden veya global genel merkezlerinden tedarik edilmektedir. Faturamız aynı zamanda orijinallik belgesi hükmündedir.`
  },
  {
    id: "sp4",
    categoryId: "sporthink",
    categoryLabel: "Sporthink Özel",
    title: "Sporthink Mobil Uygulama Desteği",
    preview: "Mobil uygulamaya özel indirim kodları ve teknik destek adımları.",
    updatedAt: new Date().toISOString(),
    author: "Sistem",
    tags: ["mobil", "app", "teknik destek"],
    related: ["sp2"],
    content: `## Sporthink Mobil Uygulama
### Uygulama Özel İndirimleri
Uygulamayı ilk kez indiren kullanıcılara **APP20** kodu ile %20 indirim tanımlanır.

### Teknik Sorun Giderme
1. Ödeme ekranında donma: Önbelleği temizlemesini isteyin.
2. Puan görme sorunu: Çıkış-Giriş işlemi yaptırın.
3. Sipariş takip: Uygulama içindeki "Hesabım > Siparişlerim" sekmesinden anlık kargo takibi yapılabilir.`
  }
];

const CAT_COLORS = {
  prosedurler: "bg-blue-50 text-blue-700 border-blue-200",
  sss:         "bg-violet-50 text-violet-700 border-violet-200",
  satis:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  sikayet:     "bg-rose-50 text-rose-700 border-rose-200",
  bilgi:       "bg-sky-50 text-sky-700 border-sky-200",
  ayakkabi:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  giyim:       "bg-pink-50 text-pink-700 border-pink-200",
  aksesuar:    "bg-teal-50 text-teal-700 border-teal-200",
  markalar:    "bg-amber-50 text-amber-700 border-amber-200",
  sporthink:   "bg-orange-50 text-orange-700 border-orange-200",
  kargo:       "bg-orange-50 text-orange-700 border-orange-200",
  urunler:     "bg-slate-100 text-slate-700 border-slate-300",
  acil:        "bg-red-50 text-red-700 border-red-200",
};
function catCls(id) {
  return CAT_COLORS[id] || "bg-slate-100 text-slate-600 border-slate-200";
}

/* ─────────────────────────── CATEGORY TREE ──────────────────────────── */
function CategoryTree({ selected, onSelect, articles }) {
  const [open, setOpen] = useState({});

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold transition-colors flex items-center justify-between
          ${!selected ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" />
          Tüm İçerikler
        </div>
        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${!selected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
          {articles.length}
        </span>
      </button>

      <div className="h-px bg-slate-100 my-1.5" />

      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isOpen = open[cat.id];
        const isActive = selected === cat.id;
        const hasChildren = cat.children.length > 0;

        return (
          <div key={cat.id}>
            <button
              onClick={() => { onSelect(cat.id); if (hasChildren) toggle(cat.id); }}
              className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold transition-colors flex items-center justify-between group
                ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{cat.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {cat.count}
                </span>
                {hasChildren && (
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                )}
              </div>
            </button>

            {hasChildren && isOpen && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5">
                {cat.children.map((child) => {
                  const isChildActive = selected === child.id;
                  return (
                    <button
                      key={child.id}
                      onClick={() => onSelect(child.id)}
                      className={`w-full text-left pl-5 pr-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-between
                        ${isChildActive ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 opacity-50" />
                        {child.label}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isChildActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-500"}`}>
                        {child.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── ARTICLE LIST ───────────────────────────── */
function ArticleCard({ article, isSelected, query, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-200 kb-fade-in
        ${isSelected
          ? "border-slate-800 bg-slate-900 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-white/10" : "bg-slate-100"}`}>
          <FileText className={`h-4 w-4 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-extrabold leading-snug truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
            {highlight(article.title, query)}
          </p>
          <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
            {highlight(article.preview, query)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isSelected ? "bg-white/10 text-slate-300 border-white/10" : catCls(article.categoryId)}`}>
              {article.categoryLabel}
            </span>
            <span className={`text-[9px] flex items-center gap-1 ${isSelected ? "text-slate-500" : "text-slate-400"}`}>
              <Clock className="h-2.5 w-2.5" />
              {fmtDate(article.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────── DETAIL PANEL ───────────────────────────── */
function DetailPanel({ article, onClear, articles }) {
  const [copied, setCopied]     = useState(false);
  const [feedback, setFeedback] = useState(null);

  const relatedArticles = articles.filter((a) => article.related.includes(a.id));

  const handleCopy = () => {
    navigator.clipboard.writeText(article.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between border-b border-white/5 shrink-0">
        <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">İçerik Detayı</span>
        <button onClick={onClear} className="text-slate-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto kb-scrollbar p-4 flex flex-col gap-4">
        {/* Title block */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catCls(article.categoryId)}`}>
              {article.categoryLabel}
            </span>
            {article.tags.map((t) => (
              <span key={t} className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
          <h2 className="text-[15px] font-extrabold text-slate-800 leading-snug">{article.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{article.author}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(article.updatedAt)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-bold border transition-all ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Kopyalandı!" : "Kopyala"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-bold border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Yazdır
          </button>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-1">
          {renderMarkdown(article.content)}
        </div>

        {/* Related */}
        {relatedArticles.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">İlgili Maddeler</p>
            <div className="flex flex-col gap-1.5">
              {relatedArticles.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50 transition-colors cursor-default">
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-[12px] text-slate-700 font-semibold truncate">{r.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          {feedback ? (
            <div className="flex items-center gap-2 text-[12px] text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Geri bildiriminiz alındı, teşekkürler!
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">Bu içerik faydalı oldu mu?</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFeedback("up")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <ThumbsUp className="h-3 w-3" /> Evet
                </button>
                <button
                  onClick={() => setFeedback("down")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <ThumbsDown className="h-3 w-3" /> Hayır
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── AI PANEL ──────────────────────────────── */
const AI_MOCK_RESPONSES = {
  default: {
    answer: `Sorunuzu analiz ettim. Sporthink bilgi bankasına göre şu bilgileri derledim:

**İade Hakkı:**
Sporthink'te teslimden itibaren **15 gün** koşulsuz iade hakkı mevcuttur. Ürün kullanılmamış, etiketli ve orijinal ambalajında olmalıdır.

**Süreç:**
Sipariş numarasını sisteme girerek iade talebi açın. Yurtiçi Kargo ile ücretsiz iade kodu SMS ile gönderilir. Depo teslimatından sonra **3–5 iş günü** içinde para iadesi yapılır.

**İstisna:**
15 günü geçen talepler yönetici onayına tabidir. Müşteriyi bekletmeden bilgilerini alıp geri arayın.`,
    sources: ["a1", "a11"],
  },
};

function AIPanel({ onClose, articles = [] }) {
  const [question, setQuestion]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [answer, setAnswer]       = useState(null);
  const [copied, setCopied]       = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const inputRef                  = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleAsk = () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    setFeedback(null);
    setTimeout(() => {
      setAnswer(AI_MOCK_RESPONSES.default);
      setLoading(false);
    }, 1600);
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer.answer).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sourcedArticles = answer ? articles.filter((a) => answer.sources.includes(a.id)) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between border-b border-white/5 shrink-0">
        <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          AI Cevap Modu
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto kb-scrollbar p-4 flex flex-col gap-3">
        {/* Input */}
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-[10px] uppercase tracking-widest text-violet-500 font-bold mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3" /> Sorunuzu yazın
          </p>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder="Örn: Müşteri 20 gün önce aldığı ürünü iade etmek istiyor, ne yapmalıyım?"
            className="w-full resize-none bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 outline-none leading-relaxed"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAsk}
              disabled={!question.trim() || loading}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {loading ? "Yanıtlanıyor..." : "Sor"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex gap-1">
              <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" />
              <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" />
              <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" />
            </div>
            <span className="text-[12px] text-slate-500">Bilgi bankası taranıyor...</span>
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div className="kb-fade-in flex flex-col gap-3">
            <div className="rounded-2xl border border-violet-100 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-violet-500 font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> AI Yanıtı
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 h-6 px-2 rounded-lg text-[10px] font-bold border transition-all ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {renderMarkdown(answer.answer)}
              </div>
            </div>

            {/* Sources */}
            {sourcedArticles.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Kaynak İçerikler</p>
                {sourcedArticles.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 mb-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-700 font-semibold truncate">{a.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              {feedback ? (
                <div className="flex items-center gap-2 text-[12px] text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Geri bildiriminiz alındı!
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 font-medium">Yanıt doğru muydu?</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setFeedback("up")} className="flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <ThumbsUp className="h-3 w-3" /> Evet
                    </button>
                    <button onClick={() => setFeedback("down")} className="flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors">
                      <ThumbsDown className="h-3 w-3" /> Hayır
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* New question */}
            <button
              onClick={() => { setAnswer(null); setQuestion(""); setFeedback(null); inputRef.current?.focus(); }}
              className="flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Yeni Soru Sor
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !answer && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-violet-400" />
            </div>
            <p className="text-[12px] text-slate-500 max-w-[200px] leading-relaxed">
              Doğal dilde sorunuzu yazın, bilgi bankasından cevap üreteyim.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── SUGGEST MODAL ──────────────────────────── */
function SuggestModal({ onClose }) {
  const [form, setForm]     = useState({ title: "", description: "", reason: "", categoryId: "" });
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-[460px] rounded-[1.5rem] bg-white border border-slate-200 shadow-[0_16px_48px_rgba(0,0,0,0.18)] overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-[1.5rem] px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            Yeni İçerik Öner
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold text-slate-800">Teşekkürler!</p>
              <p className="text-[12px] text-slate-500 mt-1">Öneriniz Supervisor onayına iletildi. Onaylanırsa yayına alınır ve +20 XP kazanırsınız. Admin gerekirse sonradan override edebilir.</p>
            </div>
            <button onClick={onClose} className="h-9 px-6 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 transition-colors">Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            {[
              { key: "title",       label: "Konu Başlığı",  placeholder: "Örn: Banka ödeme entegrasyonu hataları" },
              { key: "description", label: "Açıklama",      placeholder: "Bu konuyu neden eklenmeli?", textarea: true },
              { key: "reason",      label: "Neden Önemli",  placeholder: "Müşterilerden sık soruluyor / süreç eksikliği..." },
            ].map(({ key, label, placeholder, textarea }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{label}</label>
                {textarea ? (
                  <textarea
                    value={form[key]} onChange={set(key)} required placeholder={placeholder} rows={3}
                    className="resize-none w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 focus:bg-white transition-all"
                  />
                ) : (
                  <input
                    value={form[key]} onChange={set(key)} required placeholder={placeholder}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 focus:bg-white transition-all"
                  />
                )}
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kategori</label>
              <select
                value={form.categoryId} onChange={set("categoryId")} required
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400"
              >
                <option value="">Seçin...</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 leading-relaxed">
              Akış: Personel önerir {"->"} Supervisor onaylar/reddeder {"->"} Admin gerekirse iptal/override edebilir.
            </div>
            <button
              type="submit" disabled={loading}
              className="mt-1 h-10 w-full rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Gönderiliyor..." : "Öneriyi Gönder"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── MAIN PAGE ────────────────────────────── */
export default function KnowledgeBase() {
  const [query, setQuery]             = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedArt, setSelectedArt] = useState(null);
  const [aiMode, setAiMode]           = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [articles, setArticles]       = useState([]);
  const searchRef                     = useRef(null);

  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    agentApi.getKbArticles()
      .then((res) => {
        const remote = res.data || [];
        // Mock verileri ekle, eğer zaten gelmiyorlarsa
        const combined = [...remote];
        SPORTHINK_MOCK_ARTICLES.forEach(mock => {
          if (!combined.find(a => a.id === mock.id)) {
            combined.push(mock);
          }
        });
        setArticles(combined);
      })
      .catch(() => setArticles(SPORTHINK_MOCK_ARTICLES));
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setAiMode(false);
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (selectedCat) {
      list = list.filter((a) => a.categoryId === selectedCat || a.categoryId.startsWith(selectedCat));
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.preview.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [selectedCat, debouncedQuery, articles]);

  const handleCatSelect = (id) => {
    setSelectedCat(id);
    setSelectedArt(null);
    setQuery("");
  };

  const handleAiToggle = () => {
    setAiMode((v) => !v);
    setSelectedArt(null);
  };

  const rightPanelEmpty = !aiMode && !selectedArt;

  return (
    <div className="p-3 flex flex-col gap-3 h-full">
      <style>{PAGE_STYLES}</style>

      {/* ── Arama Çubuğu ── */}
      <div className="premium-card rounded-2xl bg-white flex items-center gap-3 px-4 py-3">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bilgi bankasında ara... (Ctrl+K)"
          className="flex-1 text-[14px] text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="h-5 w-px bg-slate-200 shrink-0" />
        <button
          onClick={handleAiToggle}
          className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold transition-all shrink-0 ${aiMode ? "bg-violet-600 text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]" : "bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"}`}
        >
          <Sparkles className="h-4 w-4" />
          AI'ya Sor
        </button>
        <button
          onClick={() => setSuggestOpen(true)}
          className="flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          İçerik Öner
        </button>
      </div>

      {/* ── Üç Sütun ── */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0" style={{ minHeight: 0 }}>

        {/* Sol: Kategoriler */}
        <div className="col-span-3 premium-card rounded-[1.5rem] bg-white flex flex-col overflow-hidden">
          <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Kategoriler</span>
          </div>
          <div className="flex-1 overflow-y-auto kb-scrollbar">
            <CategoryTree selected={selectedCat} onSelect={handleCatSelect} articles={articles} />
          </div>
        </div>

        {/* Orta: Makale Listesi */}
        <div className="col-span-5 premium-card rounded-[1.5rem] bg-white flex flex-col overflow-hidden">
          <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
              {debouncedQuery ? `"${debouncedQuery}" Sonuçları` : selectedCat ? CATEGORIES.find((c) => c.id === selectedCat)?.label || "Sonuçlar" : "Tüm İçerikler"}
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-white/10 font-bold">
              {filteredArticles.length} makale
            </span>
          </div>
          <div className="flex-1 overflow-y-auto kb-scrollbar p-3 flex flex-col gap-2">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="h-8 w-8 text-slate-300" />
                <p className="text-[13px] text-slate-400 font-semibold">Sonuç bulunamadı</p>
                <p className="text-[11px] text-slate-400">Farklı anahtar kelimeler deneyin ya da kategori seçin.</p>
              </div>
            ) : (
              filteredArticles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  isSelected={selectedArt?.id === a.id}
                  query={debouncedQuery}
                  onClick={() => { setSelectedArt(a); setAiMode(false); }}
                />
              ))
            )}
          </div>
        </div>

        {/* Sağ: Detay / AI */}
        <div className="col-span-4 premium-card rounded-[1.5rem] bg-white flex flex-col overflow-hidden">
          {aiMode ? (
            <AIPanel onClose={() => setAiMode(false)} articles={articles} />
          ) : selectedArt ? (
            <DetailPanel article={selectedArt} onClear={() => setSelectedArt(null)} articles={articles} />
          ) : (
            <>
              <div className="rounded-t-[1.5rem] px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Detay</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-slate-300" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-500">Bir makale seçin</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Orta panelden bir içeriğe tıklayın ya da AI moduna geçin.</p>
                </div>
                <button
                  onClick={handleAiToggle}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  AI'ya Sor
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {suggestOpen && <SuggestModal onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}
