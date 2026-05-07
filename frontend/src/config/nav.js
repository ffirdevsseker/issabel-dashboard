import {
  LayoutDashboard,
  Phone,
  PhoneCall,
  BarChart3,
  BookOpen,
  Wrench,
  Settings,
  Inbox,
  CalendarDays,
  Coffee,
  Users,
  Send,
  CheckSquare,
  Building2,
  Server,
  Database,
  Trophy,
  AlertOctagon,
  ScrollText,
  Receipt,
} from "lucide-react";

/* ─── PERSONEL ─── */
export const NAV_ITEMS = [
  {
    label: "Genel Bakış",
    to: "/",
    icon: LayoutDashboard,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
  {
    label: "Aktif Çağrı",
    to: "/active-calls",
    icon: PhoneCall,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
  {
    label: "Geçmiş & Kayıtlar",
    to: "/calls",
    icon: Phone,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
  {
    label: "Performans",
    to: "/performance",
    icon: BarChart3,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
  {
    label: "Bilgi Bankası",
    to: "/knowledge",
    icon: BookOpen,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
  {
    label: "Operasyonel Araçlar",
    to: "/operational",
    icon: Wrench,
    roles: ["admin", "staff", "personel"],
    group: "main",
  },
];

export const BOTTOM_NAV_ITEMS = [
  {
    label: "Ayarlar",
    to: "/settings",
    icon: Settings,
    roles: ["admin", "staff", "personel"],
  },
];

/* ─── SUPERVISOR ─── */
export const SUPERVISOR_NAV_ITEMS = [
  { label: "Genel Bakış",      to: "/supervisor",             icon: LayoutDashboard, roles: ["supervisor", "admin"], group: "main" },
  { label: "Ekip İzleme",      to: "/supervisor/team",        icon: Users,           roles: ["supervisor", "admin"], group: "main" },
  { label: "Onay Merkezi",     to: "/supervisor/approvals",   icon: Inbox,           roles: ["supervisor", "admin"], group: "main" },
  { label: "Vardiya Yönetimi", to: "/supervisor/shifts",      icon: CalendarDays,    roles: ["supervisor", "admin"], group: "main" },
  { label: "Mola Yönetimi",    to: "/supervisor/breaks",      icon: Coffee,          roles: ["supervisor", "admin"], group: "main" },
  { label: "Gamification",     to: "/supervisor/gamification",icon: Trophy,          roles: ["supervisor", "admin"], group: "main" },
  { label: "Raporlar",         to: "/supervisor/reports",     icon: BarChart3,       roles: ["supervisor", "admin"], group: "main" },
];

export const SUPERVISOR_BOTTOM_NAV_ITEMS = [
  { label: "Ayarlar", to: "/supervisor/settings", icon: Settings, roles: ["supervisor", "admin"] },
];

/* ─── ADMIN ─── */
export const ADMIN_NAV_ITEMS = [
  { label: "Genel Bakış",         to: "/admin",                  icon: LayoutDashboard, roles: ["admin"], group: "main" },
  { label: "Raporlar & Analitik", to: "/admin/reports",          icon: BarChart3,       roles: ["admin"], group: "main" },
];

export const ADMIN_BOTTOM_NAV_ITEMS = [];

/* ─── Yardımcılar ─── */
function normalizeRole(role) {
  const clean = String(role || "").trim().toLowerCase();
  const aliasMap = {
    staff:     "personel",
    agent:     "personel",
    personnel: "personel",
  };
  return aliasMap[clean] || clean;
}

export function filterNavForRole(items, role) {
  const normalizedRole = normalizeRole(role);

  const filtered = items.filter((item) =>
    item.roles.some((itemRole) => normalizeRole(itemRole) === normalizedRole)
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return items.filter((item) =>
    item.roles.some((itemRole) => normalizeRole(itemRole) === "personel")
  );
}

export function groupNav(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }
  return groups;
}

/**
 * URL path'ine göre uygun nav array'ini döner.
 * Sidebar tek bileşen olarak hem personel hem supervisor hem admin için çalışır,
 * aktif sayfa göstergesi (yeşil pill) tüm rollerde aynı kalır.
 */
export function getNavConfigForPath(pathname) {
  if (pathname.startsWith("/admin")) {
    return { main: ADMIN_NAV_ITEMS, bottom: ADMIN_BOTTOM_NAV_ITEMS };
  }
  if (pathname.startsWith("/supervisor")) {
    return { main: SUPERVISOR_NAV_ITEMS, bottom: SUPERVISOR_BOTTOM_NAV_ITEMS };
  }
  return { main: NAV_ITEMS, bottom: BOTTOM_NAV_ITEMS };
}
