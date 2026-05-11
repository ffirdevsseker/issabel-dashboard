/**
 * ADMIN · GAMIFICATION MERKEZİ  —  /admin/gamification
 * ─────────────────────────────────────────────────────
 * Üç sekmeli yapı:
 *   1. 🏆 Liderlik Tablosu  — gamificationApi.getLeaderboard()
 *   2. 📋 XP Hareketleri    — gamificationApi.getXpLogs({ personel_id, kategori, from, to, page })
 *   3. ⚙️ XP Kuralları      — gamificationApi.getXpRules()  + CRUD
 *
 * Özet kartlar (sayfa üstü): gamificationApi.getStats()
 *
 * Tema: ADMIN_THEME + Panel (Overview.jsx)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Crown, Medal, Award, RefreshCw, Users, History, Settings2,
  Filter, X, Edit2, Plus, Check, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, Sparkles,
} from "lucide-react";

import { gamificationApi } from "@/services/api";
import { Panel }       from "@/pages/admin/Overview";
import { ADMIN_THEME } from "@/constants/adminTheme";

const C = ADMIN_THEME;

const TABS = [
  { id: "liderlik",  label: "Liderlik Tablosu", Icon: Trophy   },
  { id: "hareket",   label: "XP Hareketleri",   Icon: History  },
  { id: "kural",     label: "XP Kuralları",     Icon: Settings2 },
];

const safe = (v) => Math.max(0, Number.isFinite(+v) ? +v : 0);

/* ─── Podyum rütbe renkleri ─────────────────────────────────────────────── */
const PODIUM = {
  1: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)", label: "Altın",  icon: Crown },
  2: { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)", label: "Gümüş",  icon: Medal },
  3: { color: "#a16207", bg: "rgba(161,98,7,0.08)",    border: "rgba(161,98,7,0.25)",   label: "Bronz",  icon: Award  },
};

/* ─── Shimmer ───────────────────────────────────────────────────────────── */
function Shimmer({ h = 60, mb = 6 }) {
  return (
    <div style={{
      height: h, borderRadius: 10, marginBottom: mb,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "gxShim 1.4s infinite",
    }} />
  );
}

/* ─── Özet Kart ─────────────────────────────────────────────────────────── */
function StatChip({ label, value, sub, color, icon: Icon, accent }) {
  return (
    <div
      style={{
        background: accent
          ? `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`
          : "#fff",
        border: `1px solid ${color}${accent ? "30" : "25"}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: "14px 18px",
        boxShadow: accent
          ? `0 2px 12px ${color}18, 0 1px 4px rgba(0,0,0,0.04)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex", alignItems: "center", gap: 12,
        transition: "transform 0.18s, box-shadow 0.18s",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 18px ${color}20, 0 1px 4px rgba(0,0,0,0.06)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = accent
          ? `0 2px 12px ${color}18, 0 1px 4px rgba(0,0,0,0.04)`
          : "0 1px 4px rgba(0,0,0,0.04)";
      }}
    >
      {accent && (
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 80, height: 80, borderRadius: "50%",
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}14`,
        border: `1px solid ${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        position: "relative", zIndex: 1,
      }}>
        <Icon size={18} color={color} strokeWidth={2.4} />
      </div>
      <div style={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          fontSize: accent ? 18 : 20, fontWeight: 800, color, lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          maxWidth: 180,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.muted,
          textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4,
        }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 1 — Liderlik Tablosu
════════════════════════════════════════════════════════════════════════════ */
function PodiumCard({ kisi, rank, onClick, maxXp }) {
  const cfg = PODIUM[rank] ?? PODIUM[3];
  const Icon = cfg.icon;
  const xp   = safe(kisi.points);
  const pct  = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;

  // Podyum yüksekliği — 1. en yüksek, gerçek sahne hissi
  const standH = rank === 1 ? 48 : rank === 2 ? 32 : 22;
  const offsetY = rank === 1 ? 0 : rank === 2 ? 16 : 26;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "stretch", marginTop: offsetY,
    }}>
      {/* Kart */}
      <div
        onClick={onClick}
        style={{
          background: `linear-gradient(180deg, #fff 0%, ${cfg.bg} 100%)`,
          border: `1px solid ${cfg.border}`,
          borderTop: `3px solid ${cfg.color}`,
          borderRadius: "14px 14px 0 0",
          padding: "20px 14px 14px",
          cursor: "pointer",
          transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s",
          boxShadow: `0 2px 10px ${cfg.color}15`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = `0 10px 24px ${cfg.color}30`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = `0 2px 10px ${cfg.color}15`;
        }}
      >
        {/* Madalya — 1. için daha büyük, parlama efekti */}
        <div style={{
          width: rank === 1 ? 60 : 50,
          height: rank === 1 ? 60 : 50,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}dd)`,
          border: `3px solid #fff`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: rank === 1 ? -36 : -28,
          boxShadow: `0 6px 16px ${cfg.color}50, inset 0 1px 0 rgba(255,255,255,0.5)`,
          position: "relative",
        }}>
          <Icon size={rank === 1 ? 28 : 22} color="#fff" strokeWidth={2.6} />
          {rank === 1 && (
            <div style={{
              position: "absolute", inset: -4,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${cfg.color}40 0%, transparent 70%)`,
              animation: "podPulse 2.5s ease-in-out infinite",
              pointerEvents: "none", zIndex: -1,
            }} />
          )}
        </div>

        {/* Rank pill */}
        <div style={{
          fontSize: 10, fontWeight: 800,
          background: "#fff",
          color: cfg.color,
          border: `1.5px solid ${cfg.color}`,
          borderRadius: 99, padding: "3px 12px",
          letterSpacing: "0.08em", textTransform: "uppercase",
          boxShadow: `0 1px 3px ${cfg.color}25`,
        }}>
          #{rank} · {cfg.label}
        </div>

        {/* Ad Soyad */}
        <div style={{
          fontSize: rank === 1 ? 16 : 14, fontWeight: 800,
          color: C.text, textAlign: "center", lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", maxWidth: "100%", marginTop: 2,
        }}>
          {kisi.name || "—"}
        </div>

        {kisi.extension && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: -4 }}>
            Dahili {kisi.extension}
          </div>
        )}

        {/* XP */}
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <div style={{
            fontSize: rank === 1 ? 26 : 20, fontWeight: 800,
            color: C.purple, fontVariantNumeric: "tabular-nums", lineHeight: 1,
            letterSpacing: "-0.02em",
          }}>
            {xp.toLocaleString("tr-TR")}
          </div>
          <div style={{
            fontSize: 9, color: C.muted, marginTop: 3,
            textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800,
          }}>
            XP
          </div>
        </div>

        {/* XP bar */}
        <div style={{
          width: "100%", height: 5, borderRadius: 99,
          background: "rgba(0,0,0,0.06)", overflow: "hidden",
          marginTop: 2,
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: `linear-gradient(90deg, ${C.teal}, ${cfg.color})`,
            transition: "width 0.6s ease",
            boxShadow: `0 0 6px ${cfg.color}50`,
          }} />
        </div>

        {kisi.badge && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 99, padding: "2px 10px",
            marginTop: 2,
          }}>
            {kisi.badge}
          </div>
        )}
      </div>

      {/* Podyum standı */}
      <div style={{
        height: standH,
        background: `linear-gradient(180deg, ${cfg.color}cc 0%, ${cfg.color}88 100%)`,
        borderTop: `2px solid ${cfg.color}`,
        borderRadius: "0 0 10px 10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px ${cfg.color}30`,
      }}>
        <span style={{
          fontSize: rank === 1 ? 24 : 18, fontWeight: 900,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "0.05em",
          textShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}>
          {rank}
        </span>
      </div>
    </div>
  );
}

function LeaderRow({ kisi, maxXp, onClick, onFilterLogs }) {
  const xp  = safe(kisi.points);
  const pct = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;
  const isMe = !!kisi.isMe;
  const podiumCfg = PODIUM[kisi.rank];  // Rank 4+ ise undefined

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr 90px 200px 80px 36px",
        alignItems: "center", gap: 12,
        padding: "11px 14px", borderRadius: 10,
        background: isMe ? `${C.purple}06` : "transparent",
        border: isMe ? `1px solid ${C.purple}25` : "1px solid transparent",
        transition: "all 0.14s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isMe ? `${C.purple}10` : C.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = isMe ? `${C.purple}06` : "transparent")}
    >
      <span style={{
        fontSize: 12, fontWeight: 800,
        color: podiumCfg ? podiumCfg.color : C.muted,
        background: podiumCfg ? podiumCfg.bg : "transparent",
        border: podiumCfg ? `1px solid ${podiumCfg.border}` : "1px solid transparent",
        textAlign: "center", fontVariantNumeric: "tabular-nums",
        padding: "3px 0", borderRadius: 99,
        minWidth: 32,
      }}>
        #{kisi.rank}
      </span>

      <div style={{ minWidth: 0, cursor: "pointer" }} onClick={onClick}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {kisi.name || "—"}
          {isMe && (
            <span style={{
              fontSize: 9, fontWeight: 800, marginLeft: 8,
              color: C.purple, background: `${C.purple}12`,
              border: `1px solid ${C.purple}25`,
              borderRadius: 99, padding: "1px 6px", letterSpacing: "0.05em",
            }}>SEN</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
          {kisi.extension ? `Dahili ${kisi.extension}` : "—"}
          {kisi.badge && <span style={{ color: C.faint }}> · {kisi.badge}</span>}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: C.purple,
          fontVariantNumeric: "tabular-nums", lineHeight: 1,
        }}>
          {xp.toLocaleString("tr-TR")}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, marginTop: 1,
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
        }}>
          XP
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 99, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.teal}, ${C.teal}cc)`,
          transition: "width 0.5s ease",
        }} />
      </div>

      <div style={{ textAlign: "right" }}>
        {safe(kisi.calls) > 0 ? (
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }}>
            {safe(kisi.calls)}
          </div>
        ) : (
          <span style={{ fontSize: 10, color: C.faint }}>—</span>
        )}
      </div>

      <button
        title="XP hareketlerini gör"
        onClick={() => onFilterLogs(kisi.id, kisi.name)}
        style={{
          width: 30, height: 30, borderRadius: 8, border: "none",
          background: `${C.teal}12`, color: C.teal,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${C.teal}25`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = `${C.teal}12`; }}
      >
        <History size={14} />
      </button>
    </div>
  );
}

function LeaderboardTab({ loading, list, onDetail, onFilterLogs }) {
  const maxXp = useMemo(
    () => Math.max(1, ...list.map(k => safe(k.points))),
    [list]
  );
  const top3   = list.slice(0, 3);
  const others = list.slice(3);

  return (
    <>
      <Panel title="Podyum" accentColor={C.purple}>
        {loading ? (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <Shimmer h={170} /><Shimmer h={200} /><Shimmer h={160} />
          </div>
        ) : top3.length === 0 ? (
          <div style={{
            padding: "56px 0", textAlign: "center",
            color: C.muted, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `${C.purple}08`,
              border: `1px dashed ${C.purple}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trophy size={24} color={C.purple} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
              Henüz podyum oluşmadı
            </div>
            <div style={{ fontSize: 12, color: C.muted, maxWidth: 320 }}>
              Personel XP kazandıkça ilk üç buraya yansıyacak.
            </div>
          </div>
        ) : (
          <div className="podyum-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16, alignItems: "flex-end",
            paddingTop: 30, paddingBottom: 8,
          }}>
            {top3[1] && <PodiumCard kisi={top3[1]} rank={2} maxXp={maxXp} onClick={() => onDetail(top3[1].id)} />}
            {top3[0] && <PodiumCard kisi={top3[0]} rank={1} maxXp={maxXp} onClick={() => onDetail(top3[0].id)} />}
            {top3[2] && <PodiumCard kisi={top3[2]} rank={3} maxXp={maxXp} onClick={() => onDetail(top3[2].id)} />}
          </div>
        )}
      </Panel>

      <Panel
        title="Genel Sıralama"
        accentColor={C.teal}
        badge={!loading && others.length > 0 ? `${others.length} kayıt` : null}
        noPad
      >
        {loading ? (
          <div style={{ padding: 16 }}>
            {[0, 1, 2, 3, 4].map(i => <Shimmer key={i} h={50} />)}
          </div>
        ) : others.length === 0 ? (
          <div style={{
            padding: "48px 0", textAlign: "center",
            color: C.muted, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <Users size={28} color={C.faint} />
            <div style={{ fontWeight: 600, color: C.text }}>
              {top3.length > 0
                ? "Podyum dışında kayıt yok"
                : "Liderlik tablosu boş"}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted }}>
              {top3.length > 0
                ? "Daha fazla personel XP kazanmaya başladıkça liste burada uzayacak."
                : "Henüz puanlanmış personel bulunmuyor."}
            </div>
          </div>
        ) : (
          <div style={{ padding: 8 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr 90px 200px 80px 36px",
              gap: 12, padding: "8px 14px 10px",
              borderBottom: `1px solid ${C.borderL}`,
              fontSize: 10, fontWeight: 800, color: C.muted,
              letterSpacing: "0.08em", textTransform: "uppercase",
              background: "#fafbfc",
              borderRadius: "8px 8px 0 0",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <span style={{ textAlign: "center" }}>#</span>
              <span>Personel</span>
              <span style={{ textAlign: "right" }}>XP</span>
              <span>İlerleme</span>
              <span style={{ textAlign: "right" }}>Çağrı</span>
              <span></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
              {others.map(k => (
                <LeaderRow
                  key={k.id ?? k.rank}
                  kisi={k} maxXp={maxXp}
                  onClick={() => k.id && onDetail(k.id)}
                  onFilterLogs={onFilterLogs}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 2 — XP Hareketleri
════════════════════════════════════════════════════════════════════════════ */
const LOG_PAGE_SIZE = 20;

function XpLogsTab({ filterUser, onClearUserFilter, onPersonelClick }) {
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [kategori, setKategori] = useState("");
  const [kategoriler, setKategoriler] = useState([]);
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [loading,  setLoading]  = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await gamificationApi.getXpLogs({
        personel_id: filterUser?.id || undefined,
        kategori:    kategori || undefined,
        from_date:   from || undefined,
        to_date:     to   || undefined,
        page,
        limit: LOG_PAGE_SIZE,
      });
      setLogs(data?.data || []);
      setTotal(data?.total ?? 0);
      if (Array.isArray(data?.kategoriler)) setKategoriler(data.kategoriler);
    } catch {
      setLogs([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterUser?.id, kategori, from, to, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // filtre değişince sayfa 1'e dön
  useEffect(() => { setPage(1); }, [filterUser?.id, kategori, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));

  const formatTarih = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit", month: "short", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "—"; }
  };

  return (
    <Panel
      title="XP Hareket Logları"
      accentColor={C.teal}
      badge={!loading && total > 0 ? `${total} kayıt` : null}
      noPad
    >
      {/* Filtre Çubuğu */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8,
        padding: "12px 16px",
        borderBottom: `1px solid ${C.borderL}`,
        background: "#f8fafc",
        alignItems: "center",
      }}>
        <Filter size={13} color={C.muted} />

        {filterUser && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${C.purple}12`, color: C.purple,
            border: `1px solid ${C.purple}28`,
            borderRadius: 99, padding: "4px 10px",
            fontSize: 11, fontWeight: 700,
          }}>
            Personel: {filterUser.name}
            <button
              onClick={onClearUserFilter}
              style={{
                background: "none", border: "none",
                color: C.purple, cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center",
              }}
            >
              <X size={11} />
            </button>
          </span>
        )}

        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          style={{
            fontSize: 11, padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "#fff", color: C.text, outline: "none",
            fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
          }}
        >
          <option value="">Tüm Kategoriler</option>
          {kategoriler.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            fontSize: 11, padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "#fff", color: C.text, outline: "none",
            fontFamily: "inherit",
          }}
        />
        <span style={{ fontSize: 11, color: C.muted }}>→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            fontSize: 11, padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "#fff", color: C.text, outline: "none",
            fontFamily: "inherit",
          }}
        />

        {(kategori || from || to) && (
          <button
            onClick={() => { setKategori(""); setFrom(""); setTo(""); }}
            style={{
              fontSize: 11, padding: "5px 10px", borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "#fff", color: C.muted,
              cursor: "pointer", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            <X size={11} /> Filtreleri temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      {loading ? (
        <div style={{ padding: 16 }}>
          {[0, 1, 2, 3, 4].map(i => <Shimmer key={i} h={42} />)}
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          padding: "60px 0", textAlign: "center",
          color: C.muted, fontSize: 13,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <History size={32} color={C.faint} />
          {filterUser
            ? `${filterUser.name} için kayıt bulunamadı.`
            : "Filtre kriterlerine uyan XP hareketi bulunamadı."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto", maxHeight: 600, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Tarih", "Personel", "Miktar", "Kategori", "Açıklama"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      color: C.muted, fontWeight: 700, fontSize: 10,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      borderBottom: `1px solid ${C.border}`,
                      background: "#f8fafc", whiteSpace: "nowrap",
                      position: "sticky", top: 0,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const pos = l.miktar >= 0;
                  return (
                    <tr key={l.id}
                      style={{ borderBottom: `1px solid ${C.borderL}`, transition: "background 0.12s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "9px 16px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={11} color={C.faint} />
                          {formatTarih(l.created_at)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "9px 16px", color: C.text, fontWeight: 600, fontSize: 12,
                          cursor: l.personel_id ? "pointer" : "default",
                        }}
                        onClick={() => l.personel_id && onPersonelClick?.(l.personel_id)}
                        onMouseEnter={(e) => {
                          if (l.personel_id) e.currentTarget.style.color = C.purple;
                        }}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}
                      >
                        {l.personel_adi}
                        {l.dahili_no && (
                          <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>
                            · {l.dahili_no}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "9px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 12.5, fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: pos ? C.active : C.alarm,
                          background: pos ? `${C.active}10` : `${C.alarm}10`,
                          border: `1px solid ${pos ? C.active : C.alarm}25`,
                          borderRadius: 99, padding: "2px 9px",
                        }}>
                          {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {pos ? "+" : ""}{l.miktar}
                        </span>
                      </td>
                      <td style={{ padding: "9px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px", borderRadius: 99,
                          background: `${C.purple}10`,
                          border: `1px solid ${C.purple}25`,
                          color: C.purple, fontWeight: 700, fontSize: 10,
                          letterSpacing: "0.03em",
                        }}>
                          {l.kategori || "—"}
                        </span>
                      </td>
                      <td style={{
                        padding: "9px 16px", color: C.text, fontSize: 12,
                        maxWidth: 480, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={l.aciklama}>
                        {l.aciklama || <span style={{ color: C.faint }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderTop: `1px solid ${C.borderL}`,
              background: "#f8fafc",
            }}>
              <span style={{ fontSize: 11, color: C.muted }}>
                <strong style={{ color: C.text }}>{total}</strong> kayıt · Sayfa{" "}
                <strong style={{ color: C.text }}>{page}</strong> / {totalPages}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${C.border}`, background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.3 : 1,
                  }}
                >
                  <ChevronLeft size={14} color={C.text} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page - 2 + i;
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button key={pg} onClick={() => setPage(pg)} style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: `1px solid ${pg === page ? C.teal : C.border}`,
                      background: pg === page ? C.teal : "#fff",
                      color: pg === page ? "#fff" : C.text,
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>{pg}</button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${C.border}`, background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.3 : 1,
                  }}
                >
                  <ChevronRight size={14} color={C.text} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 3 — XP Kuralları
════════════════════════════════════════════════════════════════════════════ */
const BOSH_KURAL = { kategori: "", aciklama: "", xp_miktari: 0, aktif: true };

function RuleModal({ rule, onClose, onSave, saving }) {
  const [form, setForm] = useState(rule ?? BOSH_KURAL);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const valid = form.kategori.trim().length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${C.borderL}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={C.purple} />
            <strong style={{ fontSize: 14, color: C.text }}>
              {rule ? "XP Kuralı Düzenle" : "Yeni XP Kuralı"}
            </strong>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Kategori (kaynak)
            </label>
            <input
              type="text"
              value={form.kategori}
              onChange={(e) => set("kategori", e.target.value)}
              placeholder="cagri_cevaplama, csat_yuksek, manuel..."
              style={{
                width: "100%", marginTop: 5,
                padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: "#f8fafc", fontSize: 13,
                color: C.text, outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Açıklama
            </label>
            <input
              type="text"
              value={form.aciklama}
              onChange={(e) => set("aciklama", e.target.value)}
              placeholder="Bu kural ne zaman uygulanır?"
              style={{
                width: "100%", marginTop: 5,
                padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: "#f8fafc", fontSize: 13,
                color: C.text, outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                XP Miktarı (negatif = ceza)
              </label>
              <input
                type="number"
                value={form.xp_miktari}
                onChange={(e) => set("xp_miktari", parseInt(e.target.value || "0", 10))}
                style={{
                  width: "100%", marginTop: 5,
                  padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: "#f8fafc", fontSize: 14,
                  color: form.xp_miktari >= 0 ? C.active : C.alarm,
                  fontWeight: 700, outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Aktif
              </label>
              <button
                onClick={() => set("aktif", !form.aktif)}
                style={{
                  width: 50, height: 26, borderRadius: 99, border: "none",
                  background: form.aktif ? C.active : "#e2e8f0",
                  cursor: "pointer", position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div style={{
                  position: "absolute", top: 3,
                  left: form.aktif ? 26 : 3,
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>
        </div>

        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${C.borderL}`,
          display: "flex", gap: 8, justifyContent: "flex-end",
          background: "#f8fafc",
        }}>
          <button onClick={onClose}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: "#fff",
              color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
            İptal
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || saving}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: valid && !saving ? C.purple : C.faint,
              color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: valid && !saving ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            {saving ? (
              <RefreshCw size={12} style={{ animation: "gxSpin 0.8s linear infinite" }} />
            ) : (
              <Check size={12} />
            )}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function XpRulesTab({ onToast }) {
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);   // null | "new" | rule
  const [saving,  setSaving]  = useState(false);
  const [busy,    setBusy]    = useState({});     // { [id]: true } toggle/delete

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await gamificationApi.getXpRules();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal && modal !== "new") {
        await gamificationApi.updateXpRule(modal.id, form);
        onToast({ kind: "ok", msg: "Kural güncellendi" });
      } else {
        await gamificationApi.createXpRule(form);
        onToast({ kind: "ok", msg: "Kural eklendi" });
      }
      setModal(null);
      fetchRules();
    } catch (e) {
      onToast({ kind: "err", msg: e?.response?.data?.detail || "Kayıt başarısız" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule) => {
    setBusy(b => ({ ...b, [rule.id]: true }));
    try {
      await gamificationApi.toggleXpRule(rule.id, !rule.aktif);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, aktif: !r.aktif } : r));
    } catch (e) {
      onToast({ kind: "err", msg: e?.response?.data?.detail || "Güncellenemedi" });
    } finally {
      setBusy(b => { const n = { ...b }; delete n[rule.id]; return n; });
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`"${rule.kategori}" kuralı silinsin mi?`)) return;
    setBusy(b => ({ ...b, [rule.id]: true }));
    try {
      await gamificationApi.deleteXpRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      onToast({ kind: "ok", msg: "Kural silindi" });
    } catch (e) {
      onToast({ kind: "err", msg: e?.response?.data?.detail || "Silinemedi" });
    } finally {
      setBusy(b => { const n = { ...b }; delete n[rule.id]; return n; });
    }
  };

  return (
    <>
      <Panel
        title="XP Kazanım Kuralları"
        accentColor={C.purple}
        badge={!loading && rules.length > 0 ? `${rules.length} kural` : null}
        action={
          <button
            onClick={() => setModal("new")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8, border: "none",
              background: C.purple, color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={12} /> Yeni Kural
          </button>
        }
        noPad
      >
        {loading ? (
          <div style={{ padding: 16 }}>
            {[0, 1, 2, 3, 4].map(i => <Shimmer key={i} h={50} />)}
          </div>
        ) : rules.length === 0 ? (
          <div style={{
            padding: "60px 0", textAlign: "center",
            color: C.muted, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <Settings2 size={32} color={C.faint} />
            <div>Henüz XP kuralı tanımlanmamış.</div>
            <button
              onClick={() => setModal("new")}
              style={{
                marginTop: 8,
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: C.purple, color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Plus size={12} /> İlk kuralı ekle
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Kategori", "Açıklama", "XP", "Aktif", "Aksiyon"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      color: C.muted, fontWeight: 700, fontSize: 10,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      borderBottom: `1px solid ${C.border}`,
                      background: "#f8fafc", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(r => {
                  const pos    = r.xp_miktari >= 0;
                  const busyR  = !!busy[r.id];
                  return (
                    <tr key={r.id}
                      style={{
                        borderBottom: `1px solid ${C.borderL}`,
                        opacity: busyR ? 0.5 : 1,
                        transition: "opacity 0.2s, background 0.12s",
                      }}
                      onMouseEnter={(e) => !busyR && (e.currentTarget.style.background = C.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 9px", borderRadius: 99,
                          background: `${C.purple}10`,
                          border: `1px solid ${C.purple}25`,
                          color: C.purple, fontWeight: 700, fontSize: 11,
                          fontFamily: "monospace",
                        }}>
                          {r.kategori}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: C.text, fontSize: 12 }}>
                        {r.aciklama || <span style={{ color: C.faint }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 13, fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: pos ? C.active : C.alarm,
                        }}>
                          {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {pos ? "+" : ""}{r.xp_miktari}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <button
                          onClick={() => handleToggle(r)}
                          disabled={busyR}
                          style={{
                            width: 38, height: 20, borderRadius: 99, border: "none",
                            background: r.aktif ? C.active : "#e2e8f0",
                            cursor: busyR ? "not-allowed" : "pointer",
                            position: "relative",
                            transition: "background 0.2s",
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 2,
                            left: r.aktif ? 20 : 2,
                            width: 16, height: 16, borderRadius: "50%", background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => setModal(r)}
                            disabled={busyR}
                            title="Düzenle"
                            style={{
                              width: 28, height: 28, borderRadius: 7, border: "none",
                              background: `${C.busy}12`, color: C.busy,
                              cursor: busyR ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={busyR}
                            title="Sil"
                            style={{
                              width: 28, height: 28, borderRadius: 7, border: "none",
                              background: `${C.alarm}12`, color: C.alarm,
                              cursor: busyR ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal && (
        <RuleModal
          rule={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function GamificationOverviewPage() {
  const navigate = useNavigate();

  const [tab,        setTab]        = useState("liderlik");
  const [list,       setList]       = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUser, setFilterUser] = useState(null);  // { id, name }
  const [toast,      setToast]      = useState(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const [lbRes, stRes] = await Promise.allSettled([
      gamificationApi.getLeaderboard(),
      gamificationApi.getStats(),
    ]);
    if (lbRes.status === "fulfilled") setList(Array.isArray(lbRes.value.data) ? lbRes.value.data : []);
    if (stRes.status === "fulfilled") setStats(stRes.value.data);
    setLoading(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFilterLogs = (id, name) => {
    setFilterUser({ id, name });
    setTab("hareket");
  };

  const goDetail = (id) => id && navigate(`/admin/personnel/${id}`);

  return (
    <>
      <style>{`
        @keyframes gxShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes gxSpin { to { transform: rotate(360deg); } }
        @keyframes gxLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.8); }
        }
        @keyframes podPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(1.15); }
        }
        @media (max-width: 920px) {
          .gm-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 540px) {
          .gm-stats-grid { grid-template-columns: 1fr !important; }
          .podyum-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 32 }}>

        {/* ── BAŞLIK ──────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          paddingBottom: 4,
          borderBottom: `1px solid ${C.borderL}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.purple}15 0%, ${C.purple}25 100%)`,
              border: `1px solid ${C.purple}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 2px 8px ${C.purple}15`,
            }}>
              <Trophy size={20} color={C.purple} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{
                  margin: 0, fontSize: 20, fontWeight: 800, color: C.text,
                  letterSpacing: "-0.02em",
                }}>
                  Gamification Merkezi
                </h1>
                {!loading && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 99,
                    background: `${C.active}10`,
                    border: `1px solid ${C.active}25`,
                    fontSize: 9.5, fontWeight: 800,
                    color: C.active, letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: C.active,
                      animation: "gxLivePulse 1.6s ease-in-out infinite",
                    }} />
                    Canlı
                  </span>
                )}
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted }}>
                Leaderboard · XP hareketleri · Kazanım kuralları
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: "#fff",
              color: C.text, fontSize: 12, fontWeight: 700,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.currentTarget.style.borderColor = C.purple + "40";
                e.currentTarget.style.color = C.purple;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.text;
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "gxSpin 1s linear infinite" : "none" }} />
            Yenile
          </button>
        </div>

        {/* ── ÖZET KARTLAR ────────────────────────────────────────────── */}
        <div className="gm-stats-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}>
          {loading || !stats ? (
            [0, 1, 2, 3].map(i => <Shimmer key={i} h={76} />)
          ) : (
            <>
              <StatChip
                label="Toplam Personel"
                value={safe(stats.toplam_personel).toLocaleString("tr-TR")}
                color={C.busy} icon={Users}
              />
              <StatChip
                label="Toplam XP"
                value={safe(stats.toplam_xp).toLocaleString("tr-TR")}
                color={C.purple} icon={Trophy}
              />
              <StatChip
                label="Bu Ay Kazanılan"
                value={`+${safe(stats.bu_ay_xp).toLocaleString("tr-TR")}`}
                sub="XP (sadece kazanım)"
                color={C.active} icon={TrendingUp}
              />
              {stats.bu_ay_lider ? (
                <StatChip
                  label="Bu Ayın Lideri"
                  value={stats.bu_ay_lider.ad_soyad}
                  sub={`+${safe(stats.bu_ay_lider.kazanilan_xp).toLocaleString("tr-TR")} XP bu ay`}
                  color="#f59e0b" icon={Crown} accent
                />
              ) : (
                <StatChip
                  label="Bu Ayın Lideri"
                  value="—"
                  sub="Henüz hareket yok"
                  color={C.muted} icon={Crown}
                />
              )}
            </>
          )}
        </div>

        {/* ── SEKME ÇUBUĞU ────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 4,
          background: "#f8fafc",
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 4,
          width: "fit-content",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
        }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: active
                    ? `linear-gradient(180deg, #fff 0%, ${C.purple}06 100%)`
                    : "transparent",
                  boxShadow: active
                    ? `0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px ${C.purple}25`
                    : "none",
                  color: active ? C.purple : C.muted,
                  fontSize: 12, fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  position: "relative",
                  letterSpacing: active ? "0" : "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.text;
                    e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.muted;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={13} strokeWidth={active ? 2.6 : 2} />
                {label}
                {id === "hareket" && filterUser && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, marginLeft: 4,
                    color: "#fff", background: C.purple,
                    borderRadius: 99, padding: "1px 6px", letterSpacing: "0.05em",
                    boxShadow: `0 1px 3px ${C.purple}55`,
                  }}>1</span>
                )}
                {active && (
                  <span style={{
                    position: "absolute", bottom: -1, left: "20%", right: "20%",
                    height: 2, borderRadius: 99,
                    background: `linear-gradient(90deg, transparent, ${C.purple}, transparent)`,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── İÇERİK ──────────────────────────────────────────────────── */}
        {tab === "liderlik" && (
          <LeaderboardTab
            loading={loading}
            list={list}
            onDetail={goDetail}
            onFilterLogs={handleFilterLogs}
          />
        )}

        {tab === "hareket" && (
          <XpLogsTab
            filterUser={filterUser}
            onClearUserFilter={() => setFilterUser(null)}
            onPersonelClick={goDetail}
          />
        )}

        {tab === "kural" && (
          <XpRulesTab onToast={setToast} />
        )}

        {/* ── TOAST ───────────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            padding: "12px 16px", borderRadius: 10,
            background: "#fff",
            border: `1px solid ${toast.kind === "ok" ? C.active : C.alarm}40`,
            borderLeft: `3px solid ${toast.kind === "ok" ? C.active : C.alarm}`,
            boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
            fontSize: 12.5, fontWeight: 600,
            color: toast.kind === "ok" ? C.active : C.alarm,
            display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
          }}>
            {toast.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
