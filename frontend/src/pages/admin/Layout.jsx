import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Building2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Coffee,
  FileClock,
  LayoutDashboard,
  LogOut,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Phone,
  Send,
  Shield,
  ShieldX,
  SlidersHorizontal,
  Trophy,
  UserCheck,
  Headphones,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import logoCompact from "@/assets/logo2.png";

const ADMIN_NAV = [
  { label: "Genel Bakış", to: "/admin",           icon: LayoutDashboard },
  { label: "Personel",    to: "/admin/personnel", icon: Users           },
];

const COUNTS = {
  directives: 14,
  pendingRequests: 8,
  criticalAlerts: 3,
};

const HEALTH = {
  label: "Sistem Sağlığı",
  status: "Yeşil",
  color: "#059669",
  detail: "AMI, CRM, DB, WebSocket, AI, Kayıt sunucusu aktif",
  updatedAt: "Bugün 11:42",
};

const OPERATIONAL_STATS = [
  { label: "Aktif", value: 8, icon: UserCheck, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { label: "Mola", value: 2, icon: Coffee, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { label: "Meşgul", value: 3, icon: Headphones, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { label: "Kuyruk", value: 7, suffix: "bekleyen", icon: Phone, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  const displayName = user?.full_name || user?.username || "Admin";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    const close = (e) => {
      if (!sidebarRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const activeRoute = useMemo(
    () =>
      ADMIN_NAV.find((item) =>
        item.to === "/admin"
          ? location.pathname === "/admin"
          : location.pathname.startsWith(item.to)
      ) || ADMIN_NAV[0],
    [location.pathname]
  );

  const overviewItem = ADMIN_NAV[0];
  const groupedItems = ADMIN_NAV.slice(1);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        boxSizing: "border-box",
        overflow: "hidden",
        alignItems: "flex-start",
        background: "linear-gradient(135deg, #f1f5f9 0%, #edf3f8 50%, #e6eef6 100%)",
        padding: "12px",
        gap: "12px",
      }}
    >
      <aside
        ref={sidebarRef}
        style={{
          width: collapsed ? 64 : 236,
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
        <div
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            gap: collapsed ? 0 : 10,
            padding: collapsed ? 0 : "0 12px",
          }}
        >
          <img src={logoCompact} alt="Logo" style={{ height: 36, width: 36, objectFit: "contain" }} />
          {!collapsed && (
            <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>
              Sporthink
            </span>
          )}
        </div>

        {!collapsed && (
          <div
            style={{
              margin: "10px 12px 0",
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 10,
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Shield style={{ width: 12, height: 12, color: "#60a5fa" }} />
            <span
              style={{
                color: "#93c5fd",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Admin Komuta Merkezi
            </span>
          </div>
        )}

        <nav
          style={{
            flex: 1,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 6 }}>{renderNavItem(overviewItem, collapsed, "#378ADD")}</div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "rgba(28,49,68,0.95)",
              borderRadius: 22,
              padding: collapsed ? 4 : 6,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {groupedItems.map((item) => renderNavItem(item, collapsed, "#45c392"))}
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              onClick={() => setCollapsed((c) => !c)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: collapsed ? "9px" : "8px 10px",
                borderRadius: 15,
                cursor: "pointer",
                transition: "all 0.2s",
                color: "#E8F0FB",
                opacity: 0.74,
              }}
            >
              {collapsed ? (
                <PanelLeftOpen style={{ width: 18, height: 18 }} />
              ) : (
                <PanelLeftClose style={{ width: 18, height: 18 }} />
              )}
              {!collapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>Daralt</span>}
            </div>
          </div>
        </nav>

        <div style={{ padding: "8px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px" : "10px 10px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#274462",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(59,130,246,0.4)",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{initials}</span>
            </div>

            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <p
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {displayName}
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>
                    En Yetkili Rol
                  </p>
                </div>
                <ChevronRight
                  style={{
                    width: 14,
                    height: 14,
                    color: "rgba(255,255,255,0.3)",
                    transform: profileOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </>
            )}
          </button>

          {profileOpen && (
            <div
              style={{
                position: "absolute",
                left: collapsed ? 68 : 8,
                bottom: 8,
                width: collapsed ? 200 : "calc(100% - 16px)",
                background: "#fff",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 12px 28px rgba(15,23,42,0.2)",
                overflow: "hidden",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 14px",
                  color: "#dc2626",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, height: "calc(100vh - 24px)", display: "flex", flexDirection: "column" }}>
        <header style={{ marginBottom: 12 }}>
          <div
            style={{
              background: "linear-gradient(180deg,#132334 0%,#18293a 60%,#102131 100%)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 14,
              padding: "10px 14px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 520px" }}>
              {OPERATIONAL_STATS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      paddingRight: index === OPERATIONAL_STATS.length - 1 ? 0 : 14,
                      borderRight: index === OPERATIONAL_STATS.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: item.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon strokeWidth={2.4} style={{ width: 22, height: 22, color: item.color }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>
                        {item.label}
                      </span>
                      <span style={{ color: item.color, fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                        {item.value}
                        {item.suffix ? (
                          <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 600, marginLeft: 6 }}>
                            {item.suffix}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Activity style={{ width: 16, height: 16, color: "#34d399" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ color: "#34d399", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {HEALTH.label}: {HEALTH.status}
                  </div>
                  <div style={{ color: "#a7f3d0", fontSize: 12, fontWeight: 600 }}>{HEALTH.detail}</div>
                </div>
              </div>

            </div>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: 16,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function renderNavItem(item, collapsed, activeColor) {
  const Icon = item.icon;
  return (
    <NavLink key={item.to} to={item.to} end={item.to === "/admin"} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: collapsed ? "9px" : "8px 10px",
            borderRadius: 15,
            cursor: "pointer",
            transition: "all 0.2s",
            justifyContent: collapsed ? "center" : "flex-start",
            background: isActive ? activeColor : "transparent",
            color: isActive ? "#fff" : "#E8F0FB",
            opacity: isActive ? 1 : 0.72,
          }}
        >
          <Icon style={{ width: 17, height: 17, flexShrink: 0 }} strokeWidth={isActive ? 2.5 : 2} />
          {!collapsed && (
            <span
              style={{
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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

function MetricChip({ label, value, color }) {
  const palette = {
    blue: {
      bg: "rgba(59,130,246,0.15)",
      border: "rgba(59,130,246,0.3)",
      text: "#60a5fa",
    },
    orange: {
      bg: "rgba(249,115,22,0.15)",
      border: "rgba(249,115,22,0.3)",
      text: "#fb923c",
    },
    red: {
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.3)",
      text: "#f87171",
    },
  };

  const tone = palette[color] || palette.blue;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
        borderRadius: 999,
        padding: "6px 10px",
      }}
    >
      {color === "red" && <AlertTriangle style={{ width: 13, height: 13 }} />}
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800 }}>{value}</span>
    </div>
  );
}
