/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · PERSONEL  (V3 Komuta Modeli)
   ────────────────────────────────────────────────────────────────────────────
   Genel Bakış ile AYNI tasarım dili:
     · Beyaz Panel kartları, soft shadow, üst renk şeridi
     · #0f172a metin, #94a3b8 muted, accent renkleri eşleşir
   Üstte canlı stats bar · ortada filtre + master tablo · row click → /:id
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw, Phone, ExternalLink,
  Shield, KeyRound, Lock, UserMinus, Plus, Users, Headphones, Coffee,
  PowerOff, AlertTriangle, WifiOff, MoreVertical,
} from "lucide-react";
import { personnelApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Panel } from "@/pages/admin/Overview";

/* ─── Tema (Genel Bakış ile birebir) ───────────────────────────────────────── */
const C = {
  text:    "#0f172a",
  muted:   "#94a3b8",
  faint:   "#cbd5e1",
  border:  "rgba(0,0,0,0.07)",
  borderL: "rgba(0,0,0,0.05)",
  hover:   "rgba(0,0,0,0.02)",

  active:  "#10b981",  // aktif / yeşil
  busy:    "#3b82f6",  // görüşmede / mavi
  break:   "#f59e0b",  // mola / amber
  offline: "#94a3b8",
  alarm:   "#ef4444",  // aşım / kırmızı
  purple:  "#8b5cf6",  // XP
};

const DURUM = {
  aktif:   { color: C.active,  bg: "rgba(16,185,129,0.08)",  label: "Aktif"     },
  mesgul:  { color: C.busy,    bg: "rgba(59,130,246,0.08)",  label: "Görüşmede" },
  mola:    { color: C.break,   bg: "rgba(245,158,11,0.08)",  label: "Molada"    },
  offline: { color: C.offline, bg: "rgba(148,163,184,0.08)", label: "Offline"   },
};

const UNVAN_STYLE = {
  Bronz:  { color: "#92400e", bg: "rgba(146,64,14,0.08)" },
  Gumus:  { color: "#475569", bg: "rgba(71,85,105,0.08)" },
  Altin:  { color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  Platin: { color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
};

const PER_PAGE = 25;

/* ─── Mini bileşenler ───────────────────────────────────────────────────────── */
function Avatar({ name, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}15`, border: `1.5px solid ${color}28`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color,
    }}>
      {name?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function StatusPill({ durum }) {
  const d = DURUM[durum] || DURUM.offline;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999,
      background: d.bg, border: `1px solid ${d.color}28`,
      fontSize: 11, fontWeight: 700, color: d.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: d.color,
      }} />
      {d.label}
    </div>
  );
}

function XpBar({ xp = 0, seviye = 1 }) {
  const xpPerLevel = 500;
  const pct = Math.min(100, Math.round((xp % xpPerLevel) / xpPerLevel * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: C.purple,
        background: "rgba(139,92,246,0.1)",
        border: "1px solid rgba(139,92,246,0.22)",
        borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap",
      }}>
        Lv {seviye}
      </div>
      <div style={{ flex: 1, minWidth: 36, height: 4, borderRadius: 3, background: "rgba(0,0,0,0.05)" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.purple}, #6366f1)`,
          borderRadius: 3, transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ─── Stats kart (üst özet bar) ─────────────────────────────────────────────── */
function StatsCard({ label, value, color, Icon, active, onClick, alarm }) {
  return (
    <button onClick={onClick} style={{
      flex: "1 1 0", minWidth: 150,
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px",
      background: "#ffffff",
      border: `1px solid ${active ? `${color}45` : C.border}`,
      borderTop: `2px solid ${active ? color : "transparent"}`,
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      cursor: "pointer", outline: "none", textAlign: "left",
      transition: "all 0.15s",
      animation: alarm ? "softPulse 2s ease-in-out infinite" : "none",
    }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={color} strokeWidth={2.4} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color,
          lineHeight: 1, fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}>
          {value ?? "—"}
        </div>
        <div style={{
          fontSize: 11.5, fontWeight: 600, color: C.text,
          marginTop: 5, letterSpacing: "0.01em",
        }}>
          {label}
        </div>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function Personnel() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";

  const [data,    setData]    = useState(null);
  const [filters, setFilters] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [params,  setParams]  = useState({
    q: "", ekip_id: "", rol: "", durum: "",
    page: 1, per_page: PER_PAGE,
  });
  const [actionMenu, setActionMenu] = useState(null);
  const menuRef   = useRef(null);
  const pollRef   = useRef(null);

  /* Veri çekimi */
  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== "" && v !== null)
      );
      const [listRes, statsRes, filtersRes] = await Promise.allSettled([
        personnelApi.getList(cleanParams),
        personnelApi.getStats(),
        filters ? Promise.resolve({ value: { data: filters } }) : personnelApi.getFilters(),
      ]);
      if (listRes.status    === "fulfilled") setData(listRes.value.data);
      if (statsRes.status   === "fulfilled") setStats(statsRes.value.data);
      if (filtersRes.status === "fulfilled" && !filters) setFilters(filtersRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Stats canlı: 20 sn'de bir yenile */
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await personnelApi.getStats();
        setStats(r.data);
      } catch { /* sessiz */ }
    }, 20_000);
    return () => clearInterval(pollRef.current);
  }, []);

  /* Aksiyon menüsü dış tıklamada kapansın */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActionMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Ekipler — backend zaten Müşteri Hizmetleri'ne filtrelidir */
  const ekipOptions = filters?.ekipler || [];

  const items      = data?.items || [];
  const total      = data?.total ?? data?.toplam ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const overrun    = stats?.mola_asimi || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>

      {/* ─── BAŞLIK ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 4, borderBottom: "1px solid rgba(0,0,0,0.06)",
        gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: C.text, letterSpacing: "-0.025em",
          }}>
            Personel
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted, fontWeight: 500 }}>
            Müşteri Hizmetleri · canlı durum · mola aşımı izleme · admin override
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAdmin && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px",
              background: "rgba(239,68,68,0.06)",
              border: "1.5px solid rgba(239,68,68,0.22)",
              borderRadius: 8,
            }}>
              <Shield size={12} color={C.alarm} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.alarm }}>
                Admin Override Aktif
              </span>
            </div>
          )}

          <button onClick={() => fetchData(true)} disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "6px 14px",
              fontSize: 12, fontWeight: 600, color: "#475569",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            Yenile
          </button>
        </div>
      </div>

      {/* ─── ÜST ÖZET BAR (canlı, 20 sn yenilenir) ──────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatsCard label="Tümü"      value={stats?.toplam}  color={C.text}    Icon={Users}      active={params.durum === ""}        onClick={() => setParams((p) => ({ ...p, durum: "",        page: 1 }))} />
        <StatsCard label="Aktif"     value={stats?.aktif}   color={C.active}  Icon={Users}      active={params.durum === "aktif"}   onClick={() => setParams((p) => ({ ...p, durum: "aktif",   page: 1 }))} />
        <StatsCard label="Görüşmede" value={stats?.mesgul}  color={C.busy}    Icon={Headphones} active={params.durum === "mesgul"}  onClick={() => setParams((p) => ({ ...p, durum: "mesgul",  page: 1 }))} />
        <StatsCard label="Molada"    value={stats?.mola}    color={C.break}   Icon={Coffee}     active={params.durum === "mola"}    onClick={() => setParams((p) => ({ ...p, durum: "mola",    page: 1 }))} />
        <StatsCard label="Offline"   value={stats?.offline} color={C.offline} Icon={PowerOff}   active={params.durum === "offline"} onClick={() => setParams((p) => ({ ...p, durum: "offline", page: 1 }))} />
        {overrun > 0 && (
          <StatsCard label="Mola Aşımı" value={overrun} color={C.alarm} Icon={AlertTriangle}
            active={false} alarm onClick={() => alert(`${overrun} personel mola süresini aştı`)} />
        )}
      </div>

      {/* ─── ANA PANEL: filtre + tablo ─────────────────────────────────── */}
      <Panel
        title="Personel Listesi"
        accentColor="#10b981"
        badge={loading ? null : total}
        action={
          isAdmin && (
            <button onClick={() => alert("TODO: Yeni personel modali")} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 11px", borderRadius: 7, border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 1px 4px rgba(16,185,129,0.25)",
            }}>
              <Plus size={11} /> Yeni Personel
            </button>
          )
        }
      >
        {/* Filtre satırı */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          paddingBottom: 14, borderBottom: `1px solid ${C.borderL}`, marginBottom: 12,
        }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: C.muted, pointerEvents: "none",
            }} />
            <input
              value={params.q}
              onChange={(e) => setParams((p) => ({ ...p, q: e.target.value, page: 1 }))}
              placeholder="Ad, kullanıcı, dahili..."
              style={{
                height: 34, paddingLeft: 32, paddingRight: 12, width: 220,
                background: "#f8fafc",
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 12.5, outline: "none",
              }}
            />
          </div>

          {[
            { key: "ekip_id", label: "Ekip",
              options: ekipOptions.map((e) => ({ v: e.id, l: e.ad })) },
            { key: "rol", label: "Rol",
              options: filters?.roller?.map((r) => ({ v: r.ad, l: r.ad })) || [] },
          ].map(({ key, label, options }) => (
            <select key={key} value={params[key]}
              onChange={(e) => setParams((p) => ({
                ...p, [key]: e.target.value, page: 1,
              }))}
              style={{
                height: 34, padding: "0 12px", minWidth: 140,
                background: "#f8fafc",
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: params[key] ? C.text : C.muted,
                fontSize: 12.5, outline: "none", cursor: "pointer",
              }}
            >
              <option value="">{label}</option>
              {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}

          {(params.q || params.ekip_id || params.rol || params.durum) && (
            <button onClick={() => setParams({
              q: "", ekip_id: "", rol: "", durum: "",
              page: 1, per_page: PER_PAGE,
            })} style={{
              height: 34, padding: "0 12px", borderRadius: 8,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            }}>
              Filtreleri Temizle
            </button>
          )}

          <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
            {loading ? "..." : `${total} personel`}
          </span>
        </div>

        {/* Tablo başlığı */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) 150px 90px 100px 140px 110px 70px 56px",
          padding: "0 14px 8px",
          color: C.muted, fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          {["Personel", "Dept / Ekip", "Dahili", "Rol", "XP / Seviye",
            "Durum", "Bugün", ""].map((h) => <span key={h}>{h}</span>)}
        </div>

        {/* Satırlar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                height: 56, borderRadius: 10,
                background: "rgba(0,0,0,0.025)",
                animation: "pulse 1.6s ease-in-out infinite",
              }} />
            ))
          ) : items.length === 0 ? (
            <div style={{
              textAlign: "center", color: C.muted,
              padding: "60px 0", fontSize: 13,
            }}>
              Filtrelere uygun personel bulunamadı
            </div>
          ) : (
            items.map((p) => {
              const d        = DURUM[p.anlik_durum] || DURUM.offline;
              const overrun  = (p.mola_asimi_dk || 0) > 0;
              const sipBroken = p.sip_durumu === "koptu";
              const unvanS   = UNVAN_STYLE[p.unvan];

              return (
                <div key={p.id} onClick={() => navigate(`/admin/personnel/${p.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px,2fr) 150px 90px 100px 140px 110px 70px 56px",
                    alignItems: "center",
                    padding: "11px 14px",
                    borderRadius: 10,
                    background: overrun ? "rgba(239,68,68,0.04)" : "transparent",
                    border: `1px solid ${overrun ? "rgba(239,68,68,0.18)" : "transparent"}`,
                    borderLeft: overrun ? `3px solid ${C.alarm}` : "3px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.12s, border-color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!overrun) e.currentTarget.style.background = C.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = overrun ? "rgba(239,68,68,0.04)" : "transparent";
                  }}
                >
                  {/* Personel */}
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <Avatar name={p.ad_soyad} color={overrun ? C.alarm : d.color} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: C.text,
                        display: "flex", alignItems: "center", gap: 6,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {p.ad_soyad}
                        {unvanS && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                            color: unvanS.color, background: unvanS.bg,
                            border: `1px solid ${unvanS.color}25`,
                            borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap",
                          }}>
                            {p.unvan?.toUpperCase()}
                          </span>
                        )}
                        {overrun && (
                          <span style={{
                            fontSize: 9, fontWeight: 800,
                            color: C.alarm, background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap",
                            animation: "softPulse 1.6s ease-in-out infinite",
                          }}>
                            +{p.mola_asimi_dk}DK AŞIM
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                        @{p.kullanici_adi}
                      </div>
                    </div>
                  </div>

                  {/* Dept / Ekip */}
                  <div style={{ fontSize: 11.5, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.departman || "—"}
                    </div>
                    <div style={{
                      fontSize: 10.5, color: C.muted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.ekip || "—"}
                    </div>
                  </div>

                  {/* Dahili */}
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: C.text,
                    fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {p.dahili_no || "—"}
                    {sipBroken && <WifiOff size={10} color={C.alarm} />}
                  </div>

                  {/* Rol */}
                  <div style={{
                    fontSize: 11.5, color: C.muted, fontWeight: 600,
                    textTransform: "capitalize",
                  }}>
                    {p.rol || "—"}
                  </div>

                  {/* XP / Seviye */}
                  <div>
                    <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, marginBottom: 3 }}>
                      {(p.xp || 0).toLocaleString("tr-TR")} XP
                    </div>
                    <XpBar xp={p.xp} seviye={p.seviye} />
                  </div>

                  {/* Durum */}
                  <StatusPill durum={p.anlik_durum} />

                  {/* Bugün çağrı */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Phone size={11} color={C.muted} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                      {p.bugun_cagri || 0}
                    </span>
                  </div>

                  {/* Aksiyonlar */}
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActionMenu(actionMenu?.userId === p.id ? null : {
                            userId: p.id, ad: p.ad_soyad,
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                          });
                        }}
                        title="Aksiyonlar"
                        style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: "transparent",
                          border: `1px solid ${C.border}`,
                          color: C.muted, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <MoreVertical size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            justifyContent: "center", marginTop: 16, paddingTop: 14,
            borderTop: `1px solid ${C.borderL}`,
          }}>
            <button onClick={() => setParams((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={params.page === 1 || loading}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#ffffff", border: `1px solid ${C.border}`,
                color: params.page === 1 ? C.faint : C.text,
                cursor: params.page === 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, minWidth: 80, textAlign: "center" }}>
              Sayfa {params.page} / {totalPages}
            </span>
            <button onClick={() => setParams((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
              disabled={params.page === totalPages || loading}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#ffffff", border: `1px solid ${C.border}`,
                color: params.page === totalPages ? C.faint : C.text,
                cursor: params.page === totalPages ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </Panel>

      {/* Aksiyon menüsü */}
      {actionMenu && isAdmin && (
        <div ref={menuRef} style={{
          position: "fixed",
          top: actionMenu.top, right: actionMenu.right,
          zIndex: 999,
          background: "#ffffff",
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 6,
          boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
          minWidth: 200,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: C.muted,
            letterSpacing: "0.08em", padding: "6px 10px 4px",
            textTransform: "uppercase",
          }}>
            {actionMenu.ad}
          </div>

          {[
            { label: "Detaya Git",     Icon: ExternalLink, color: C.busy,
              onClick: () => { navigate(`/admin/personnel/${actionMenu.userId}`); setActionMenu(null); } },
            { label: "Şifre Sıfırla",  Icon: KeyRound,     color: C.break,
              onClick: () => { alert("TODO: Şifre sıfırlama"); setActionMenu(null); } },
            { label: "Hesabı Kilitle", Icon: Lock,         color: C.muted,
              onClick: () => { alert("TODO: Hesap kilitleme"); setActionMenu(null); } },
          ].map(({ label, Icon, color, onClick }) => (
            <button key={label} onClick={onClick} style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "8px 10px", borderRadius: 7,
              border: "none", background: "transparent",
              color, fontSize: 12, fontWeight: 600,
              cursor: "pointer", textAlign: "left",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Icon size={12} /> {label}
            </button>
          ))}

          <div style={{ height: 1, background: C.borderL, margin: "4px 6px" }} />

          <button
            onClick={() => {
              if (window.confirm(`${actionMenu.ad} pasif edilecek. Onaylıyor musunuz?`)) {
                alert("TODO: Soft delete endpoint'i");
              }
              setActionMenu(null);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "8px 10px", borderRadius: 7,
              border: "none", background: "rgba(239,68,68,0.05)",
              color: C.alarm, fontSize: 12, fontWeight: 700,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <UserMinus size={12} /> Soft Delete (Pasif Et)
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 0.3; }
        }
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(0,0,0,0.04), 0 0 0 0 rgba(239,68,68,0); }
          50%      { box-shadow: 0 2px 12px rgba(0,0,0,0.04), 0 0 0 4px rgba(239,68,68,0.1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #ffffff; color: ${C.text}; }
      `}</style>
    </div>
  );
}
