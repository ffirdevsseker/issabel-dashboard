import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, ChevronRight, Coffee, LogOut, PanelLeftClose, PanelLeftOpen, Power, Settings, X } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { filterNavForRole, getNavConfigForPath } from "@/config/nav";

import logoCompact from "@/assets/logo2.png";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [presence, setPresence] = useState("online");
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1360 : false
  );
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  // URL path'ine göre nav set'i (personel / supervisor / admin)
  const { main: NAV_ITEMS } = getNavConfigForPath(location.pathname);

  const displayName = user?.full_name || user?.username || "Ahmet";
  const extension = user?.extension || "-";
  const avatarSrc = user?.avatar_url || "";

  const statusMap = {
    online: {
      label: "Çalışıyor",
      ring: "ring-emerald-400",
      dot: "bg-emerald-400",
      soft: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    },
    break: {
      label: "Mola",
      ring: "ring-amber-400",
      dot: "bg-amber-400",
      soft: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    },
    busy: {
      label: "Çalışmıyor",
      ring: "ring-rose-400",
      dot: "bg-rose-400",
      soft: "bg-rose-500/15 text-rose-200 border-rose-400/30",
    },
  };

  const currentStatus = statusMap[presence];

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase('tr-TR');

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!sidebarRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 1360);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const items = filterNavForRole(NAV_ITEMS, user?.role || "personel");
  const first = items[0];
  const rest = items.slice(1);
  const minimalProfile = collapsed || isNarrowViewport;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        ref={sidebarRef}
        className={`
          h-[calc(100vh-24px)] sticky top-3 flex flex-col z-20
          bg-gradient-to-b from-[#132334] via-[#18293a] to-[#102131] border border-white/[0.05]
          rounded-2xl overflow-visible
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[64px]" : "w-[220px]"}
        `}
      >

        {/* ── LOGO ── */}
        <div className={`
          h-[60px] shrink-0 flex items-center justify-center
          border-b border-white/[0.05] transition-all duration-300
          ${collapsed ? "gap-0" : "gap-3 px-2"}
        `}>
          <img 
            src={logoCompact} 
            alt="Logo" 
            className={`object-contain transition-all duration-300 ${collapsed ? "h-8 w-8" : "h-[38px] w-[38px]"}`} 
          />
          {!collapsed && (
            <span className="text-white text-[19px] font-bold tracking-wide mt-1">
              Sporthink
            </span>
          )}
        </div>

        {/* ── MENÜ ── */}
        <nav className="flex-1 overflow-y-auto px-2.5 flex flex-col justify-center gap-1 -mt-4">

          {/* Dashboard — solo */}
          {first && (
            <div className="mb-2">
              <NavItemEl item={first} collapsed={collapsed} solo />
            </div>
          )}

          {/* Diğerleri — grupta */}
          {rest.length > 0 && (
            <div className={`flex flex-col gap-1 bg-[#1c3144]/95 rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${collapsed ? "p-1 -mx-0.5" : "p-1 -mx-1"}`}>
              {rest.map((item) => (
                <NavItemEl key={item.to} item={item} collapsed={collapsed} variant="green" />
              ))}
            </div>
          )}

          {/* ── ALT AKSIYONLAR ── */}
          <div className="mt-2 flex flex-col gap-1">
            {/* DARALT BUTONU (Ayarların hemen altında) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => setCollapsed((c) => !c)}
                  className={`
                    flex items-center w-full group cursor-pointer
                    ${collapsed ? "justify-center" : ""} 
                  `}
                >
                  {/* 1. Çerçeve: İkon */}
                  <div className={`
                    flex items-center justify-center w-[44px] h-[44px] shrink-0
                    transition-all duration-300 rounded-[15px]
                    bg-transparent text-[#E8F0FB] opacity-70 hover:opacity-100 hover:bg-white/[0.08]
                  `}>
                    {collapsed ? (
                      <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={2} />
                    ) : (
                      <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={2} />
                    )}
                  </div>

                  {/* 2. Çerçeve: İsim */}
                  {!collapsed && (
                    <div className={`
                      flex items-center flex-1 h-[44px] pl-3 pr-4 font-bold text-[13px] tracking-wide
                      transition-all duration-300 rounded-[15px]
                      bg-transparent text-[#E8F0FB] opacity-70 hover:opacity-100 hover:bg-white/[0.08]
                    `}>
                      <span className="truncate">Daralt</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent
                  side="right"
                  className="bg-[#1c3144] text-[#E8F0FB] border border-white/10 shadow-[0_6px_16px_rgba(20,34,50,0.4)]"
                >
                  Genişlet
                </TooltipContent>
              )}
            </Tooltip>

          </div>

        </nav>

        <div className="px-2.5 pb-2.5 pt-1 border-t border-white/[0.05]">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className={`
              w-full flex items-center rounded-2xl transition-all duration-200
              ${minimalProfile
                ? "justify-center p-1.5 bg-transparent border border-transparent"
                : "gap-2.5 border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] px-2.5 py-2.5"}
            `}
          >
            <div className={`relative h-10 w-10 rounded-full ring-2 ${currentStatus.ring} ring-offset-2 ring-offset-[#132334] shrink-0 overflow-hidden bg-[#274462]`}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-xs font-bold tracking-wide">
                  {initials}
                </div>
              )}
              <span className={`absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full border border-[#1A2B3C] ${currentStatus.dot}`} />
            </div>

            {!minimalProfile && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] leading-tight font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-300 truncate">Dahili {extension}</p>
                </div>
                <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${profileOpen ? "rotate-90" : ""}`} />
              </>
            )}
          </button>
        </div>

        <div
          className={`
            absolute bottom-2 right-[-2px] z-50
            w-[232px] rounded-2xl border border-white/15 bg-[#132334]/95 backdrop-blur-md
            shadow-[0_12px_28px_rgba(6,12,20,0.42)] p-2.5
            transition-all duration-300 ease-out origin-left
            ${profileOpen ? "translate-x-full scale-100 opacity-100 pointer-events-auto" : "translate-x-[92%] scale-[0.96] opacity-0 pointer-events-none"}
          `}
        >
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[12px] font-semibold tracking-wide text-white/95">Profil</h3>
            <button
              onClick={() => setProfileOpen(false)}
              className="h-5.5 w-5.5 rounded-md grid place-items-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className={`relative h-10 w-10 rounded-full ring-2 ${currentStatus.ring} ring-offset-2 ring-offset-[#132334] overflow-hidden bg-[#274462]`}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-[14px] font-bold tracking-wide">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] leading-tight font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-slate-300 truncate">Dahili {extension}</p>
              <span className={`inline-flex mt-0.5 items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border ${currentStatus.soft}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot}`} />
                {currentStatus.label}
              </span>
            </div>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-300/90 px-1">Durum</p>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPresence("online")}
                className={`h-7 rounded-lg text-[9px] font-medium border transition-colors flex items-center justify-center gap-1 ${presence === "online" ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/40" : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}
              >
                <Briefcase className="h-2.5 w-2.5" />
                Çalışıyor
              </button>
              <button
                onClick={() => setPresence("break")}
                className={`h-7 rounded-lg text-[9px] font-medium border transition-colors flex items-center justify-center gap-1 ${presence === "break" ? "bg-amber-500/20 text-amber-100 border-amber-400/40" : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}
              >
                <Coffee className="h-2.5 w-2.5" />
                Mola
              </button>
              <button
                onClick={() => setPresence("busy")}
                className={`h-7 rounded-lg text-[9px] font-medium border transition-colors flex items-center justify-center gap-1 ${presence === "busy" ? "bg-rose-500/20 text-rose-100 border-rose-400/40" : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}
              >
                <Power className="h-2.5 w-2.5" />
                Çalışmıyor
              </button>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
            <button
              onClick={() => {
                // Rol/path'e göre uygun ayarlar sayfasına git
                const settingsPath = location.pathname.startsWith("/admin")
                  ? "/admin/settings"
                  : location.pathname.startsWith("/supervisor")
                    ? "/supervisor/settings"
                    : "/settings";
                navigate(settingsPath);
                setProfileOpen(false);
              }}
              className="w-full h-7 rounded-lg text-[10px] font-medium border border-white/10 text-slate-100 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <Settings className="h-3 w-3" />
              Ayarlar
            </button>
            <button
              onClick={handleLogout}
              className="w-full h-7 rounded-lg text-[10px] font-medium border border-rose-400/30 text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3 w-3" />
              Çıkış
            </button>
          </div>
        </div>

      </aside>
    </TooltipProvider>
  );
}

/* ─── NavItem ─────────────────────────────────────────────── */
function NavItemEl({ item, collapsed, variant = "blue" }) {
  const { to, icon: Icon, label } = item;

  const inner = ({ isActive }) => {
    // Çerçeve stilleri (ovallik [18px] ile [12px] ortası olan [15px]'e ayarlandı)
    const frameBase = "flex items-center transition-all duration-300 rounded-[15px]";

    // Aktif ve inaktif durumu için renkleri (Parlamalar ve gölgeler kaldırıldı)
    const activeColor = variant === "green"
      ? "bg-[#45c392] text-white"
      : "bg-[#378ADD] text-white";
    const currentActiveColor = isActive ? activeColor : "";
    const inactiveStyle = "bg-transparent text-[#E8F0FB] opacity-70 hover:opacity-100 hover:bg-white/[0.06]";

    return (
      <div className={`
        flex items-center w-full group cursor-pointer
        ${collapsed ? "justify-center" : ""}
      `}
      >
        {/* 1. Çerçeve: İkon */}
        <div className={`
          ${frameBase} justify-center w-[34px] h-[34px] shrink-0
          ${isActive ? currentActiveColor : inactiveStyle}
        `}>
          <Icon className={`${collapsed ? "h-[16px] w-[16px]" : "h-[18px] w-[18px]"}`} strokeWidth={isActive ? 2.5 : 2} />
        </div>

        {/* 2. Çerçeve: İsim (Yanında hemen) */}
        {!collapsed && (
          <div className={`
            ${frameBase} flex-1 min-w-0 h-[34px] pl-3 pr-4 font-bold text-[13px] tracking-wide
            ${isActive ? currentActiveColor : inactiveStyle}
          `}>
            <span className="truncate block w-full">{label}</span>
          </div>
        )}
      </div>
    );
  };

  // Root path'ler `end` ile exact match edilir; diğerleri prefix match (default).
  // /admin, /supervisor, / tam eşleşme gerektirir — alt rotalar aktif göstermemeli.
  const isDashboardRoot = to === "/" || to === "/supervisor" || to === "/admin";
  const link = (
    <NavLink to={to} end={isDashboardRoot}>
      {inner}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center items-center w-full my-0.5">
            {link}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-[#20344A] text-[#E8F0FB] border border-white/10 shadow-[0_6px_16px_rgba(32,52,74,0.35)]"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}