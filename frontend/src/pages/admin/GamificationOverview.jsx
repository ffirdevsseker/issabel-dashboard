/**
 * ADMIN · GAMIFICATION ÖZET  —  /admin/gamification
 * ──────────────────────────────────────────────────
 * Backend: GET /gamification/leaderboard  (gamification.py)
 * Response: [{ id, rank, name, extension, points, calls, total_billsec, badge, isMe }]
 *
 * Tema: ADMIN_THEME + Panel (Overview.jsx)
 *   - Top 3 podyum (altın/gümüş/bronz)
 *   - XP bar (C.teal)
 *   - Satıra tıklayınca /admin/personnel/:id
 *
 * Defansif: backend'ten gelen sayısal değerlerde negatif/null gelirse Math.max(0, ...)
 * ile temizlenir (geçmişteki "negatif süre" hatasına karşı güvenlik).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Crown, Medal, Award, RefreshCw, Users,
} from "lucide-react";

import { adminOpsApi }   from "@/services/api";
import { Panel }         from "@/pages/admin/Overview";
import { ADMIN_THEME }   from "@/constants/adminTheme";

const C = ADMIN_THEME;

/* ─── Podyum rütbe renkleri ─────────────────────────────────────────────── */
const PODIUM = {
  1: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)", label: "Altın",  icon: Crown },
  2: { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)", label: "Gümüş",  icon: Medal },
  3: { color: "#a16207", bg: "rgba(161,98,7,0.08)",    border: "rgba(161,98,7,0.25)",   label: "Bronz",  icon: Award  },
};

/* ─── Sayı güvenliği ────────────────────────────────────────────────────── */
const safe = (v) => Math.max(0, Number.isFinite(+v) ? +v : 0);

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

/* ─── Podyum Kartı (1-2-3) ──────────────────────────────────────────────── */
function PodiumCard({ kisi, rank, onClick, maxXp }) {
  const cfg = PODIUM[rank] ?? PODIUM[3];
  const Icon = cfg.icon;
  const xp   = safe(kisi.points);
  const pct  = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;

  // Podyum yüksekliği: 1. → 100%, 2. → 88%, 3. → 78%
  const heightPct = rank === 1 ? 1 : rank === 2 ? 0.88 : 0.78;

  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        background: "#fff",
        border: `1px solid ${cfg.border}`,
        borderTop: `3px solid ${cfg.color}`,
        borderRadius: 14,
        padding: "16px 14px 14px",
        cursor: "pointer",
        transition: "transform 0.18s, box-shadow 0.18s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        position: "relative",
        minHeight: 200 * heightPct + 20,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 20px ${cfg.color}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
      }}
    >
      {/* Madalya ikonu */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: cfg.bg, border: `2px solid ${cfg.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: rank === 1 ? -28 : -22,
        boxShadow: `0 4px 12px ${cfg.color}40`,
      }}>
        <Icon size={rank === 1 ? 26 : 22} color={cfg.color} strokeWidth={2.4} />
      </div>

      {/* Rank pill */}
      <div style={{
        fontSize: 10, fontWeight: 800,
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        borderRadius: 99, padding: "2px 10px",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        #{rank} · {cfg.label}
      </div>

      {/* Ad Soyad */}
      <div style={{
        fontSize: rank === 1 ? 15 : 14, fontWeight: 800,
        color: C.text, textAlign: "center", lineHeight: 1.2,
        overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", maxWidth: "100%",
      }}>
        {kisi.name || "—"}
      </div>

      {kisi.extension && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: -4 }}>
          Dahili {kisi.extension}
        </div>
      )}

      {/* XP */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: rank === 1 ? 22 : 18, fontWeight: 800,
          color: C.purple, fontVariantNumeric: "tabular-nums", lineHeight: 1,
        }}>
          {xp.toLocaleString("tr-TR")}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, marginTop: 2,
          textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700,
        }}>
          XP
        </div>
      </div>

      {/* XP bar */}
      <div style={{
        width: "100%", height: 5, borderRadius: 99,
        background: "rgba(0,0,0,0.05)", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.teal}, ${cfg.color})`,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Rozet (unvan) */}
      {kisi.badge && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.muted,
          background: "rgba(0,0,0,0.03)",
          borderRadius: 99, padding: "2px 9px",
        }}>
          {kisi.badge}
        </div>
      )}
    </div>
  );
}

/* ─── Liste Satırı (4-50) ───────────────────────────────────────────────── */
function LeaderRow({ kisi, maxXp, onClick }) {
  const xp  = safe(kisi.points);
  const pct = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;
  const isMe = !!kisi.isMe;

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 90px 200px 100px",
        alignItems: "center", gap: 12,
        padding: "11px 14px", borderRadius: 10,
        background: isMe ? `${C.purple}06` : "transparent",
        border: isMe ? `1px solid ${C.purple}25` : "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.14s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isMe ? `${C.purple}10` : C.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = isMe ? `${C.purple}06` : "transparent")}
    >
      {/* Rank */}
      <span style={{
        fontSize: 13, fontWeight: 800,
        color: C.muted, textAlign: "center",
        fontVariantNumeric: "tabular-nums",
      }}>
        #{kisi.rank}
      </span>

      {/* Ad + Dahili */}
      <div style={{ minWidth: 0 }}>
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
              borderRadius: 99, padding: "1px 6px",
              letterSpacing: "0.05em",
            }}>
              SEN
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
          {kisi.extension ? `Dahili ${kisi.extension}` : "—"}
          {kisi.badge && (
            <span style={{ color: C.faint }}> · {kisi.badge}</span>
          )}
        </div>
      </div>

      {/* XP */}
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: C.purple,
          fontVariantNumeric: "tabular-nums", lineHeight: 1,
        }}>
          {safe(kisi.points).toLocaleString("tr-TR")}
        </div>
        <div style={{
          fontSize: 9, color: C.muted, marginTop: 1,
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
        }}>
          XP
        </div>
      </div>

      {/* XP bar */}
      <div style={{
        height: 6, borderRadius: 99,
        background: "rgba(0,0,0,0.05)", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.teal}, ${C.teal}cc)`,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Çağrı sayısı (varsa) */}
      <div style={{ textAlign: "right" }}>
        {safe(kisi.calls) > 0 ? (
          <>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.text,
              fontVariantNumeric: "tabular-nums",
            }}>
              {safe(kisi.calls)}
            </div>
            <div style={{
              fontSize: 9, color: C.muted, marginTop: 1,
              letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
            }}>
              çağrı
            </div>
          </>
        ) : (
          <span style={{ fontSize: 10, color: C.faint }}>Hesaplanıyor</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function GamificationOverviewPage() {
  const navigate = useNavigate();
  const [list,       setList]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const { data } = await adminOpsApi.getLeaderboard();
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxXp = useMemo(
    () => Math.max(1, ...list.map(k => safe(k.points))),
    [list]
  );

  const top3   = list.slice(0, 3);
  const others = list.slice(3);

  const totalXp = useMemo(
    () => list.reduce((acc, k) => acc + safe(k.points), 0),
    [list]
  );

  const goDetail = (id) => navigate(`/admin/personnel/${id}`);

  return (
    <>
      <style>{`
        @keyframes gxShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes gxSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

        {/* ── BAŞLIK ──────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${C.purple}12`, border: `1px solid ${C.purple}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trophy size={18} color={C.purple} strokeWidth={2.3} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
                Gamification Liderlik Tablosu
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
                {loading
                  ? "Yükleniyor…"
                  : `${list.length} personel · Toplam ${totalXp.toLocaleString("tr-TR")} XP`}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "#fff",
              color: C.text, fontSize: 12, fontWeight: 700,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <RefreshCw size={13} style={{
              animation: refreshing ? "gxSpin 1s linear infinite" : "none",
            }} />
            Yenile
          </button>
        </div>

        {/* ── PODYUM (Top 3) ──────────────────────────────────────────── */}
        <Panel title="Podyum" accentColor={C.purple}>
          {loading ? (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
              <Shimmer h={170} /><Shimmer h={200} /><Shimmer h={160} />
            </div>
          ) : top3.length === 0 ? (
            <div style={{
              padding: "40px 0", textAlign: "center",
              color: C.muted, fontSize: 13,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <Users size={28} color={C.faint} />
              Henüz personel verisi yok.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              alignItems: "stretch",
              paddingTop: 18,
            }}>
              {/* Sahne sırası: 2-1-3 (1 ortada ve daha yüksek)
                  Mobilde grid 3 kolon, masaüstünde da öyle. */}
              {top3[1] && (
                <PodiumCard
                  kisi={top3[1]} rank={2}
                  maxXp={maxXp}
                  onClick={() => goDetail(top3[1].id)}
                />
              )}
              {top3[0] && (
                <PodiumCard
                  kisi={top3[0]} rank={1}
                  maxXp={maxXp}
                  onClick={() => goDetail(top3[0].id)}
                />
              )}
              {top3[2] && (
                <PodiumCard
                  kisi={top3[2]} rank={3}
                  maxXp={maxXp}
                  onClick={() => goDetail(top3[2].id)}
                />
              )}
            </div>
          )}
        </Panel>

        {/* ── DİĞER SIRALAMA ──────────────────────────────────────────── */}
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
              padding: "40px 0", textAlign: "center",
              color: C.muted, fontSize: 13,
            }}>
              {top3.length > 0
                ? "Sadece podyum kadar kayıt var."
                : "Liderlik tablosu boş."}
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {/* Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 90px 200px 100px",
                gap: 12,
                padding: "6px 14px 8px",
                borderBottom: `1px solid ${C.borderL}`,
                fontSize: 10, fontWeight: 700, color: C.muted,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                <span style={{ textAlign: "center" }}>#</span>
                <span>Personel</span>
                <span style={{ textAlign: "right" }}>XP</span>
                <span>İlerleme</span>
                <span style={{ textAlign: "right" }}>Çağrı</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {others.map(k => (
                  <LeaderRow
                    key={k.id ?? k.rank}
                    kisi={k}
                    maxXp={maxXp}
                    onClick={() => k.id && goDetail(k.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
