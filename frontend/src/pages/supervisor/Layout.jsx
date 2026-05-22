import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Coffee, CheckSquare,
  Trophy, BarChart3, Settings, PanelLeftClose, PanelLeftOpen,
  Bell, AlertTriangle, X, ChevronRight, LogOut, Shield,
  Phone, Headphones, Clock, Eye, FileText, UserCheck
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Softphone from "@/components/Softphone";
import { useCall } from "@/context/CallContext";
import logoCompact from "@/assets/logo2.png";

const SUP_NAV = [
  { label: "Genel Bakış",      to: "/supervisor",            icon: LayoutDashboard },
  { label: "Ekip İzleme",      to: "/supervisor/team",       icon: Users },
  { label: "Vardiya",          to: "/supervisor/shifts",      icon: Calendar },
  { label: "Mola Yönetimi",    to: "/supervisor/breaks",      icon: Coffee },
  { label: "Onay Merkezi",     to: "/supervisor/approvals",   icon: CheckSquare },
  { label: "Gamification",     to: "/supervisor/gamification",icon: Trophy },
  { label: "Raporlar",         to: "/supervisor/reports",     icon: BarChart3 },
  { label: "Ayarlar",          to: "/supervisor/settings",    icon: Settings },
];

// Mock pending counts
const usePendingCounts = () => ({
  breaks: 3,
  complaints: 2,
  kb: 1,
  adminDirectives: 3,
});

const MOCK_DIRECTIVES = [
  { id: 1, date: "16.05.2025  12:30", title: "Sistem Güncellemesi Hakkında", priority: "ACİL", read: false },
  { id: 2, date: "16.05.2025  11:10", title: "Yeni Script Kullanımı", priority: "NORMAL", read: false },
  { id: 3, date: "16.05.2025  10:45", title: "Haftalık Eğitim Duyurusu", priority: "DÜŞÜK", read: false },
];

const PRIORITY_BADGE = {
  ACİL:   { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", border: "rgba(239,68,68,0.3)" },
  NORMAL: { bg: "rgba(249,115,22,0.12)",  color: "#ea580c", border: "rgba(249,115,22,0.3)" },
  DÜŞÜK:  { bg: "rgba(16,185,129,0.12)",  color: "#059669", border: "rgba(16,185,129,0.3)" },
};

const PRIORITY_BTN = {
  ACİL:   { bg: "#ef4444", hover: "#dc2626" },
  NORMAL: { bg: "#f97316", hover: "#ea580c" },
  DÜŞÜK:  { bg: "#10b981", hover: "#059669" },
};

export default function SupervisorLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toggleSoftphone } = useCall();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const pending = usePendingCounts();

  // Ctrl+P (veya Cmd+P) → softphone aç/kapat
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        toggleSoftphone();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSoftphone]);

  const displayName = user?.full_name || user?.username || "Süpervizör";
  const initials = displayName.split(" ").map(p => p[0]).slice(0, 2).join("").toLocaleUpperCase('tr-TR');
  const totalPending = pending.breaks + pending.complaints + pending.kb;
  const hasUnreadDirectives = pending.adminDirectives > 0;
  const overviewItem = SUP_NAV[0];
  const groupedItems = SUP_NAV.slice(1);
  const sidebarTones = {
    text: "#E8F0FB",
    inactiveOpacity: 0.7,
    hoverBg: "rgba(255,255,255,0.06)",
    collapseHoverBg: "rgba(255,255,255,0.08)",
    activeMain: "#378ADD",
    activeGroup: "#45c392",
    groupBg: "rgba(28,49,68,0.95)",
  };

  const getPendingCount = (path) => {
    if (path === "/supervisor/approvals") return totalPending;
    if (path === "/supervisor/breaks") return pending.breaks;
    return 0;
  };

  const renderNavItem = (item, activeColor = sidebarTones.activeMain) => {
    const Icon = item.icon;
    const pendingCount = getPendingCount(item.to);

    return (
      <NavLink key={item.to} to={item.to} end={item.to === "/supervisor"} style={{ textDecoration: "none" }}>
        {({ isActive }) => (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "9px" : "8px 10px",
            borderRadius: 15, cursor: "pointer", transition: "all 0.2s",
            justifyContent: collapsed ? "center" : "flex-start",
            background: isActive ? activeColor : "transparent",
            color: isActive ? "#fff" : sidebarTones.text,
            opacity: isActive ? 1 : sidebarTones.inactiveOpacity,
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.background = sidebarTones.hoverBg;
              e.currentTarget.style.color = sidebarTones.text;
              e.currentTarget.style.opacity = "1";
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = sidebarTones.text;
              e.currentTarget.style.opacity = String(sidebarTones.inactiveOpacity);
            }
          }}
          >
            <Icon style={{ width: 18, height: 18, flexShrink: 0 }} strokeWidth={isActive ? 2.5 : 2} />
            {!collapsed && (
              <>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                {pendingCount > 0 && (
                  <span style={{ background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{pendingCount}</span>
                )}
              </>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  useEffect(() => {
    const close = (e) => {
      if (!sidebarRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  return (
    <div style={{ display: "flex", height: "100vh", boxSizing: "border-box", overflow: "hidden", alignItems: "flex-start", background: "linear-gradient(135deg, #f1f5f9 0%, #edf3f8 50%, #e6eef6 100%)", padding: "12px", gap: "12px", fontFamily: "Inter, sans-serif" }}>

      {/* ─── SIDEBAR ─── */}
      <aside
        ref={sidebarRef}
        style={{
          width: collapsed ? 64 : 220,
          height: "calc(100vh - 24px)",
          position: "sticky",
          top: 12,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg,#132334 0%,#18293a 60%,#102131 100%)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 18,
          transition: "width 0.3s ease",
          zIndex: 20,
          overflow: "visible",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: collapsed ? 0 : 10, padding: collapsed ? 0 : "0 12px" }}>
          <img src={logoCompact} alt="Logo" style={{ height: 36, width: 36, objectFit: "contain" }} />
          {!collapsed && <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>Sporthink</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, overflowY: "auto" }}>
          {overviewItem && (
            <div style={{ marginBottom: 6 }}>
              {renderNavItem(overviewItem, "#378ADD")}
            </div>
          )}

          {groupedItems.length > 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: sidebarTones.groupBg,
              borderRadius: 22,
              padding: collapsed ? 4 : 6,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>
              {groupedItems.map((item) => renderNavItem(item, sidebarTones.activeGroup))}
            </div>
          )}

          {/* Collapse btn */}
          <div style={{ marginTop: 8 }}>
            <div onClick={() => setCollapsed(c => !c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "9px" : "8px 10px", borderRadius: 15, cursor: "pointer", transition: "all 0.2s", color: sidebarTones.text, opacity: sidebarTones.inactiveOpacity }}
              onMouseEnter={e => { e.currentTarget.style.background = sidebarTones.collapseHoverBg; e.currentTarget.style.color = sidebarTones.text; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = sidebarTones.text; e.currentTarget.style.opacity = String(sidebarTones.inactiveOpacity); }}>
              {collapsed ? <PanelLeftOpen style={{ width: 18, height: 18 }} /> : <PanelLeftClose style={{ width: 18, height: 18 }} />}
              {!collapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>Daralt</span>}
            </div>
          </div>
        </nav>

        {/* Profile */}
        <div style={{ padding: "8px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
          <button onClick={() => setProfileOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "8px" : "10px 10px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#274462", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(52,211,153,0.4)", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{initials}</span>
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <p title={displayName} style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>Süpervizör</p>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", transform: profileOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
              </>
            )}
          </button>

          {/* Profile popup */}
          {profileOpen && (
            <div style={{ position: "absolute", bottom: 8, left: "calc(100% + 8px)", width: 200, background: "#132334", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, zIndex: 50, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#274462", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{initials}</span>
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0 }}>{displayName}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: 0 }}>Süpervizör</p>
                </div>
              </div>
              <button onClick={() => { navigate("/supervisor/settings"); setProfileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)", fontSize: 12, cursor: "pointer", marginBottom: 6 }}>
                <Settings style={{ width: 13, height: 13 }} /> Ayarlar
              </button>
              <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 12, cursor: "pointer" }}>
                <LogOut style={{ width: 13, height: 13 }} /> Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "calc(100vh - 24px)", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ background: "linear-gradient(180deg,#132334 0%,#18293a 60%,#102131 100%)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "0 24px", height: 76, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)" }}>
          {/* Team status */}
          <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 20 }}>
            {/* Aktif */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCheck strokeWidth={2.5} style={{ width: 22, height: 22, color: "#10b981" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>Aktif</span>
                <span style={{ color: "#10b981", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>8</span>
              </div>
            </div>

            <div style={{ width: 1, height: "45%", background: "rgba(255,255,255,0.1)" }} />

            {/* Mola */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Coffee strokeWidth={2.5} style={{ width: 22, height: 22, color: "#f59e0b" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>Mola</span>
                <span style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>2</span>
              </div>
            </div>

            <div style={{ width: 1, height: "45%", background: "rgba(255,255,255,0.1)" }} />

            {/* Meşgul */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Headphones strokeWidth={2.5} style={{ width: 22, height: 22, color: "#ef4444" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>Meşgul</span>
                <span style={{ color: "#ef4444", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>3</span>
              </div>
            </div>

            <div style={{ width: 1, height: "45%", background: "rgba(255,255,255,0.1)" }} />

            {/* Kuyruk */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59, 130, 246, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Phone strokeWidth={2.5} style={{ width: 22, height: 22, color: "#3b82f6" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 2 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>Kuyruk</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ color: "#3b82f6", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>7</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 500 }}>bekleyen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Bekleyen onaylar badge */}
            {totalPending > 0 && (
              <button onClick={() => navigate("/supervisor/approvals")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>
                <Bell style={{ width: 14, height: 14, color: "#f97316" }} />
                <span style={{ color: "#f97316", fontSize: 12, fontWeight: 700 }}>{totalPending} Bekleyen Onay</span>
              </button>
            )}
            {/* Sistem sağlık */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "6px 14px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "block", animation: "sup-ping 2s infinite", boxShadow: "0 0 8px rgba(16,185,129,0.5)" }} />
              <span style={{ color: "#34d399", fontSize: 12, fontWeight: 600 }}>Sistem Aktif</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowX: "hidden", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes sup-ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>

      {/* ── Softphone (sağdan açılan rol-renkli panel, Ctrl+P ile aç/kapat) ── */}
      <Softphone />
    </div>
  );
}
