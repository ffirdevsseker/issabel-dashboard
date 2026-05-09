import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  ChevronRight,
  Coffee,
  Headphones,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Radio,
  Search,
  Settings2,
  Shield,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { headerApi } from "@/services/api";
import logoCompact from "@/assets/logo2.png";

const ADMIN_NAV = [
  { label: "Genel Bakış",        to: "/admin",                icon: LayoutDashboard },
  { label: "Personel",           to: "/admin/personnel",      icon: Users           },
  { label: "Canlı Operasyon",    to: "/admin/operations",     icon: Radio           },
  { label: "Otomasyon & Kurallar", to: "/admin/automation",   icon: Settings2       },
  { label: "Sistem Sağlığı",     to: "/admin/system-health",  icon: BrainCircuit    },
];

// Sağlık renkleri
const SAGLIK = {
  yesil:   { color: "#10b981", bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.3)",  label: "Sistem Sağlıklı" },
  sari:    { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.3)",  label: "Dikkat Gerekli"  },
  kirmizi: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.3)",   label: "Kritik Durum"    },
};

// Bildirim tipi → ikon metni
function alertIcon(tip) {
  const map = {
    sip_kopuk:      "📡",
    kuyruk_dolu:    "📋",
    mola_asimi:     "⏰",
    gec_giris:      "🕐",
    talimat:        "📢",
    sistem_alarmi:  "🚨",
  };
  return map[tip] ?? "⚠️";
}

// Durum renk dot
function StatusDot({ renk, pulse = false }) {
  const c = SAGLIK[renk] ?? SAGLIK.yesil;
  return (
    <span
      style={{
        display:       "inline-block",
        width:         10,
        height:        10,
        borderRadius:  "50%",
        background:    c.color,
        boxShadow:     pulse ? `0 0 0 3px ${c.bg}` : "none",
        flexShrink:    0,
        animation:     pulse && renk !== "yesil" ? "pulseRing 1.6s ease-in-out infinite" : "none",
      }}
    />
  );
}

export default function AdminLayout() {
  const [collapsed,    setCollapsed]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);

  // Header canlı veri
  const [liveData,     setLiveData]     = useState(null);

  // Bell
  const [bellOpen,     setBellOpen]     = useState(false);
  const [alerts,       setAlerts]       = useState([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);

  // Omni-search
  const [searchVal,    setSearchVal]    = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchFocus,  setSearchFocus]  = useState(false);
  const [searchRes,    setSearchRes]    = useState(null);
  const [searching,    setSearching]    = useState(false);

  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const sidebarRef       = useRef(null);
  const bellRef          = useRef(null);
  const searchRef        = useRef(null);
  const searchTimer      = useRef(null);

  const displayName = user?.full_name || user?.username || "Admin";
  const initials    = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ── Canlı veri çekimi (30 sn interval) ──────────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const { data } = await headerApi.getLive();
      setLiveData(data);
    } catch {
      // sessizce geç
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 30_000);
    return () => clearInterval(id);
  }, [fetchLive]);

  // ── Bell açılınca alert listesini çek ───────────────────────────────────────
  useEffect(() => {
    if (bellOpen && !alertsLoaded) {
      headerApi.getCriticalAlerts(20).then(({ data }) => {
        setAlerts(data);
        setAlertsLoaded(true);
      }).catch(() => {});
    }
  }, [bellOpen, alertsLoaded]);

  // ── Omni-search debounce ─────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (searchVal.trim().length < 2) {
      setSearchRes(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await headerApi.search(searchVal.trim());
        setSearchRes(data);
      } catch {
        setSearchRes(null);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchVal]);

  // ── Dışarı tıklayınca kapat ──────────────────────────────────────────────────
  useEffect(() => {
    const close = (e) => {
      if (!sidebarRef.current?.contains(e.target)) setProfileOpen(false);
      if (!bellRef.current?.contains(e.target))    setBellOpen(false);
      if (!searchRef.current?.contains(e.target)) {
        setSearchFocus(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  const activeRoute = useMemo(
    () =>
      ADMIN_NAV.find((item) =>
        item.to === "/admin"
          ? location.pathname === "/admin"
          : location.pathname.startsWith(item.to)
      ) || ADMIN_NAV[0],
    [location.pathname]
  );

  const overviewItem  = ADMIN_NAV[0];
  const groupedItems  = ADMIN_NAV.slice(1);

  // Türetilmiş header değerler
  const personel      = liveData?.personel     ?? { aktif: 0, mola: 0, mesgul: 0 };
  const kuyBekleyen   = liveData?.kuyruk_bekleyen ?? 0;
  const sistem        = liveData?.sistem        ?? { aktif_kanal: 0, trunk_limiti: 0, kapasite_yuzde: 0, saglik_rengi: "yesil" };
  const kritikSayi    = liveData?.kritik_bildirim_sayisi ?? 0;
  const saglik        = SAGLIK[sistem.saglik_rengi] ?? SAGLIK.yesil;

  const STAT_ITEMS = [
    { label: "Aktif",    value: personel.aktif,   icon: UserCheck,  color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    { label: "Mola",     value: personel.mola,    icon: Coffee,     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    { label: "Meşgul",   value: personel.mesgul,  icon: Headphones, color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
    { label: "Kuyruk",   value: kuyBekleyen,      icon: Phone,      color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  ];

  // Arama sonucu toplam sayısı
  const totalRes = searchRes
    ? (searchRes.personel?.length || 0) + (searchRes.musteriler?.length || 0) + (searchRes.cagrilar?.length || 0)
    : 0;

  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.6); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0);   }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);   }
        }
        @keyframes bellShake {
          0%,100% { transform: rotate(0);   }
          20%     { transform: rotate(-18deg); }
          40%     { transform: rotate(18deg);  }
          60%     { transform: rotate(-10deg); }
          80%     { transform: rotate(10deg);  }
        }
        .bell-shake { animation: bellShake 0.55s ease-in-out; }
        .search-dropdown { animation: fadeSlide 0.15s ease-out; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div
        style={{
          display:    "flex",
          height:     "100vh",
          boxSizing:  "border-box",
          overflow:   "hidden",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #f1f5f9 0%, #edf3f8 50%, #e6eef6 100%)",
          padding:    "12px",
          gap:        "12px",
        }}
      >
        {/* ═══ SIDEBAR ═══ */}
        <aside
          ref={sidebarRef}
          style={{
            width:       collapsed ? 64 : 236,
            height:      "calc(100vh - 24px)",
            position:    "sticky",
            top:         12,
            display:     "flex",
            flexDirection: "column",
            background:  "linear-gradient(180deg,#132334 0%,#18293a 60%,#102131 100%)",
            border:      "1px solid rgba(255,255,255,0.05)",
            borderRadius: 18,
            transition:  "width 0.3s ease",
            zIndex:      20,
            overflow:    "visible",
            flexShrink:  0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              height:          60,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              borderBottom:    "1px solid rgba(255,255,255,0.05)",
              gap:             collapsed ? 0 : 10,
              padding:         collapsed ? 0 : "0 12px",
            }}
          >
            <img src={logoCompact} alt="Logo" style={{ height: 36, width: 36, objectFit: "contain" }} />
            {!collapsed && (
              <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>
                Sporthink
              </span>
            )}
          </div>

          {/* Badge */}
          {!collapsed && (
            <div
              style={{
                margin:     "10px 12px 0",
                background: "rgba(59,130,246,0.12)",
                border:     "1px solid rgba(59,130,246,0.2)",
                borderRadius: 10,
                padding:    "5px 10px",
                display:    "flex",
                alignItems: "center",
                gap:        6,
              }}
            >
              <Shield style={{ width: 12, height: 12, color: "#60a5fa" }} />
              <span
                style={{
                  color:          "#93c5fd",
                  fontSize:       10,
                  fontWeight:     700,
                  letterSpacing:  "0.12em",
                  textTransform:  "uppercase",
                }}
              >
                Admin Komuta Merkezi
              </span>
            </div>
          )}

          {/* Nav */}
          <nav
            style={{
              flex:          1,
              padding:       "8px 10px",
              display:       "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap:           4,
              overflowY:     "auto",
            }}
          >
            <div style={{ marginBottom: 6 }}>{renderNavItem(overviewItem, collapsed, "#378ADD")}</div>
            <div
              style={{
                display:       "flex",
                flexDirection: "column",
                gap:           2,
                background:    "rgba(28,49,68,0.95)",
                borderRadius:  22,
                padding:       collapsed ? 4 : 6,
                boxShadow:     "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {groupedItems.map((item) => renderNavItem(item, collapsed, "#45c392"))}
            </div>
            <div style={{ marginTop: 8 }}>
              <div
                onClick={() => setCollapsed((c) => !c)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        8,
                  padding:    collapsed ? "9px" : "8px 10px",
                  borderRadius: 15,
                  cursor:     "pointer",
                  transition: "all 0.2s",
                  color:      "#E8F0FB",
                  opacity:    0.74,
                }}
              >
                {collapsed
                  ? <PanelLeftOpen  style={{ width: 18, height: 18 }} />
                  : <PanelLeftClose style={{ width: 18, height: 18 }} />}
                {!collapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>Daralt</span>}
              </div>
            </div>
          </nav>

          {/* Profile */}
          <div style={{ padding: "8px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              style={{
                width:          "100%",
                display:        "flex",
                alignItems:     "center",
                gap:            10,
                padding:        collapsed ? "8px" : "10px 10px",
                borderRadius:   16,
                border:         "1px solid rgba(255,255,255,0.1)",
                background:     "rgba(255,255,255,0.05)",
                cursor:         "pointer",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <div
                style={{
                  width:       36,
                  height:      36,
                  borderRadius: "50%",
                  background:  "#274462",
                  display:     "flex",
                  alignItems:  "center",
                  justifyContent: "center",
                  border:      "2px solid rgba(59,130,246,0.4)",
                  flexShrink:  0,
                }}
              >
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>En Yetkili Rol</p>
                  </div>
                  <ChevronRight
                    style={{
                      width:      14,
                      height:     14,
                      color:      "rgba(255,255,255,0.3)",
                      transform:  profileOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </>
              )}
            </button>

            {profileOpen && (
              <div
                style={{
                  position:    "absolute",
                  left:        collapsed ? 68 : 8,
                  bottom:      8,
                  width:       collapsed ? 200 : "calc(100% - 16px)",
                  background:  "#fff",
                  borderRadius: 14,
                  border:      "1px solid rgba(0,0,0,0.08)",
                  boxShadow:   "0 12px 28px rgba(15,23,42,0.2)",
                  overflow:    "hidden",
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    width:       "100%",
                    background:  "transparent",
                    border:      "none",
                    display:     "flex",
                    alignItems:  "center",
                    gap:         8,
                    padding:     "12px 14px",
                    color:       "#dc2626",
                    fontSize:    13,
                    fontWeight:  700,
                    cursor:      "pointer",
                  }}
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ═══ MAIN AREA ═══ */}
        <div style={{ flex: 1, minWidth: 0, height: "calc(100vh - 24px)", display: "flex", flexDirection: "column" }}>

          {/* ─── HEADER ─────────────────────────────────────────────────────── */}
          <header style={{ marginBottom: 12 }}>
            <div
              style={{
                background:    "linear-gradient(180deg,#132334 0%,#18293a 60%,#102131 100%)",
                border:        "1px solid rgba(255,255,255,0.05)",
                borderRadius:  14,
                padding:       "10px 16px",
                boxShadow:     "0 8px 32px rgba(0,0,0,0.15)",
                display:       "flex",
                alignItems:    "center",
                gap:           12,
              }}
            >

              {/* ── Personel durum şeridi ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                {STAT_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      style={{
                        display:     "flex",
                        alignItems:  "center",
                        gap:         8,
                        padding:     "0 14px",
                        borderRight: i < STAT_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width:           36,
                          height:          36,
                          borderRadius:    "50%",
                          background:      item.bg,
                          display:         "flex",
                          alignItems:      "center",
                          justifyContent:  "center",
                          flexShrink:      0,
                        }}
                      >
                        <Icon strokeWidth={2.2} style={{ width: 18, height: 18, color: item.color }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500 }}>
                          {item.label}
                        </span>
                        <span style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>
                          {item.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Separator ── */}
              <div style={{ width: 1, height: 38, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

              {/* ── Trunk & Kuyruk özeti ── */}
              <div
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         8,
                  padding:     "7px 12px",
                  borderRadius: 10,
                  background:  "rgba(59,130,246,0.1)",
                  border:      "1px solid rgba(59,130,246,0.2)",
                  flexShrink:  0,
                }}
              >
                <Zap style={{ width: 15, height: 15, color: "#60a5fa", flexShrink: 0 }} />
                <div>
                  <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Trunk & Kuyruk
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                    Aktif Kanal:{" "}
                    <span style={{ color: "#60a5fa" }}>%{sistem.kapasite_yuzde}</span>
                    {"  ·  "}
                    Bekleyen:{" "}
                    <span style={{ color: kuyBekleyen > 10 ? "#f87171" : "#34d399" }}>{kuyBekleyen}</span>
                  </div>
                </div>
              </div>

              {/* ── Spacer ── */}
              <div style={{ flex: 1 }} />

              {/* ── Sistem sağlık indikatörü ── */}
              <div
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         8,
                  padding:     "7px 12px",
                  borderRadius: 10,
                  background:  saglik.bg,
                  border:      `1px solid ${saglik.border}`,
                  flexShrink:  0,
                }}
              >
                <StatusDot renk={sistem.saglik_rengi} pulse />
                <div>
                  <div
                    style={{
                      color:         saglik.color,
                      fontSize:      10,
                      fontWeight:    800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Sistem
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {saglik.label}
                    {sistem.cpu > 0 && (
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginLeft: 6 }}>
                        CPU {sistem.cpu}% · RAM {sistem.ram}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Bell (Kritik Uyarı Merkezi) ── */}
              <div ref={bellRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setBellOpen((o) => !o)}
                  className={kritikSayi > 0 ? "bell-shake" : ""}
                  style={{
                    position:       "relative",
                    width:          40,
                    height:         40,
                    borderRadius:   12,
                    border:         kritikSayi > 0
                      ? "1px solid rgba(239,68,68,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background:     kritikSayi > 0
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(255,255,255,0.06)",
                    cursor:         "pointer",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    transition:     "all 0.2s",
                  }}
                >
                  <Bell
                    style={{
                      width:  18,
                      height: 18,
                      color:  kritikSayi > 0 ? "#f87171" : "rgba(255,255,255,0.6)",
                    }}
                  />
                  {kritikSayi > 0 && (
                    <span
                      style={{
                        position:       "absolute",
                        top:            -5,
                        right:          -5,
                        minWidth:       18,
                        height:         18,
                        borderRadius:   9,
                        background:     "#ef4444",
                        border:         "2px solid #132334",
                        color:          "#fff",
                        fontSize:       10,
                        fontWeight:     800,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        padding:        "0 4px",
                      }}
                    >
                      {kritikSayi > 99 ? "99+" : kritikSayi}
                    </span>
                  )}
                </button>

                {/* Bell dropdown */}
                {bellOpen && (
                  <div
                    className="search-dropdown"
                    style={{
                      position:    "absolute",
                      top:         48,
                      right:       0,
                      width:       340,
                      maxHeight:   420,
                      background:  "#1a2d3e",
                      border:      "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14,
                      boxShadow:   "0 20px 40px rgba(0,0,0,0.4)",
                      overflow:    "hidden",
                      zIndex:      50,
                    }}
                  >
                    {/* Bell header */}
                    <div
                      style={{
                        padding:       "12px 14px",
                        borderBottom:  "1px solid rgba(255,255,255,0.07)",
                        display:       "flex",
                        alignItems:    "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: "#f87171" }} />
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Kritik Uyarılar</span>
                        {kritikSayi > 0 && (
                          <span
                            style={{
                              background: "#ef4444",
                              color:      "#fff",
                              fontSize:   10,
                              fontWeight: 800,
                              padding:    "1px 6px",
                              borderRadius: 99,
                            }}
                          >
                            {kritikSayi}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setBellOpen(false)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>

                    {/* Alert list */}
                    <div style={{ overflowY: "auto", maxHeight: 360 }}>
                      {!alertsLoaded && (
                        <div style={{ padding: "20px 14px", color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>
                          Yükleniyor…
                        </div>
                      )}
                      {alertsLoaded && alerts.length === 0 && (
                        <div style={{ padding: "24px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                          <div style={{ color: "#34d399", fontSize: 13, fontWeight: 600 }}>Kritik uyarı yok</div>
                        </div>
                      )}
                      {alerts.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            padding:       "10px 14px",
                            borderBottom:  "1px solid rgba(255,255,255,0.05)",
                            display:       "flex",
                            gap:           10,
                            alignItems:    "flex-start",
                          }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{alertIcon(a.tip)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color:       "#fecaca",
                                fontSize:    13,
                                fontWeight:  600,
                                whiteSpace:  "nowrap",
                                overflow:    "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {a.baslik}
                            </div>
                            {a.mesaj && (
                              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.mesaj}
                              </div>
                            )}
                            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 3 }}>
                              {a.tarih ? new Date(a.tarih).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Global Arama ── */}
              <div ref={searchRef} style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    display:     "flex",
                    alignItems:  "center",
                    gap:         8,
                    background:  searchFocus ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                    border:      searchFocus
                      ? "1px solid rgba(99,179,237,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding:     "0 12px",
                    height:      40,
                    width:       searchFocus ? 240 : 180,
                    transition:  "all 0.25s ease",
                  }}
                >
                  <Search style={{ width: 15, height: 15, color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                  <input
                    value={searchVal}
                    onChange={(e) => { setSearchVal(e.target.value); setSearchOpen(true); }}
                    onFocus={() => { setSearchFocus(true); setSearchOpen(true); }}
                    placeholder="Çağrı ID, Telefon, Personel…"
                    style={{
                      background:   "transparent",
                      border:       "none",
                      outline:      "none",
                      color:        "#fff",
                      fontSize:     12,
                      width:        "100%",
                      fontWeight:   500,
                    }}
                  />
                  {searchVal && (
                    <button
                      onClick={() => { setSearchVal(""); setSearchRes(null); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0, display: "flex" }}
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>

                {/* Arama sonuçları dropdown */}
                {searchOpen && searchFocus && (searchRes !== null || searching) && (
                  <div
                    className="search-dropdown"
                    style={{
                      position:    "absolute",
                      top:         48,
                      right:       0,
                      width:       320,
                      maxHeight:   400,
                      background:  "#1a2d3e",
                      border:      "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14,
                      boxShadow:   "0 20px 40px rgba(0,0,0,0.4)",
                      overflow:    "auto",
                      zIndex:      50,
                    }}
                  >
                    {searching && (
                      <div style={{ padding: "14px", color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>
                        Aranıyor…
                      </div>
                    )}

                    {!searching && searchRes !== null && totalRes === 0 && (
                      <div style={{ padding: "16px 14px", color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "center" }}>
                        Sonuç bulunamadı
                      </div>
                    )}

                    {!searching && searchRes !== null && (
                      <>
                        {/* Personel */}
                        {searchRes.personel?.length > 0 && (
                          <SearchSection title="Personel" icon="👤">
                            {searchRes.personel.map((p) => (
                              <SearchRow
                                key={p.id}
                                primary={p.ad_soyad}
                                secondary={`Dahili: ${p.dahili_no ?? "—"} · ${p.unvan ?? ""}`}
                                badge={p.durum}
                                badgeColor={p.durum === "aktif" ? "#10b981" : p.durum === "mesgul" ? "#ef4444" : "#f59e0b"}
                                onClick={() => { navigate(`/admin/personnel/${p.id}`); setSearchOpen(false); setSearchVal(""); }}
                              />
                            ))}
                          </SearchSection>
                        )}

                        {/* Müşteriler */}
                        {searchRes.musteriler?.length > 0 && (
                          <SearchSection title="Müşteri" icon="📞">
                            {searchRes.musteriler.map((m) => (
                              <SearchRow
                                key={m.id}
                                primary={m.ad_soyad ?? m.telefon}
                                secondary={`${m.telefon} · ${m.toplam_cagri} çağrı · CSAT ${m.ort_csat?.toFixed(1)}`}
                                badge={m.segment}
                                badgeColor="#60a5fa"
                                onClick={() => {}}
                              />
                            ))}
                          </SearchSection>
                        )}

                        {/* Çağrılar */}
                        {searchRes.cagrilar?.length > 0 && (
                          <SearchSection title="Çağrı" icon="📋">
                            {searchRes.cagrilar.map((c) => (
                              <SearchRow
                                key={c.id}
                                primary={c.id.slice(0, 8) + "…"}
                                secondary={`${c.personel ?? "—"} · ${c.durum ?? ""} · ${c.sure}sn`}
                                badge={c.durum}
                                badgeColor={c.durum === "cevaplandi" ? "#10b981" : "#ef4444"}
                                onClick={() => {}}
                              />
                            ))}
                          </SearchSection>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>
          </header>
          {/* ─── END HEADER ─── */}

          <main style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

// ── Yardımcı bileşenler ────────────────────────────────────────────────────────

function renderNavItem(item, collapsed, activeColor) {
  const Icon = item.icon;
  return (
    <NavLink key={item.to} to={item.to} end={item.to === "/admin"} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            8,
            padding:        collapsed ? "9px" : "8px 10px",
            borderRadius:   15,
            cursor:         "pointer",
            transition:     "all 0.2s",
            justifyContent: collapsed ? "center" : "flex-start",
            background:     isActive ? activeColor : "transparent",
            color:          isActive ? "#fff" : "#E8F0FB",
            opacity:        isActive ? 1 : 0.72,
          }}
        >
          <Icon style={{ width: 17, height: 17, flexShrink: 0 }} strokeWidth={isActive ? 2.5 : 2} />
          {!collapsed && (
            <span
              style={{
                fontSize:      12,
                fontWeight:    isActive ? 700 : 500,
                flex:          1,
                whiteSpace:    "nowrap",
                overflow:      "hidden",
                textOverflow:  "ellipsis",
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
}

function SearchSection({ title, icon, children }) {
  return (
    <div>
      <div
        style={{
          padding:       "8px 14px 4px",
          color:         "rgba(255,255,255,0.35)",
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          display:       "flex",
          alignItems:    "center",
          gap:           5,
        }}
      >
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function SearchRow({ primary, secondary, badge, badgeColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding:      "8px 14px",
        cursor:       "pointer",
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        transition:   "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {primary}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {secondary}
        </div>
      </div>
      {badge && (
        <span
          style={{
            background:   `${badgeColor}22`,
            border:       `1px solid ${badgeColor}55`,
            color:        badgeColor,
            fontSize:     10,
            fontWeight:   700,
            padding:      "2px 7px",
            borderRadius: 99,
            whiteSpace:   "nowrap",
            flexShrink:   0,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
