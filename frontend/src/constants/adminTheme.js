/**
 * Admin panel shared colour palette.
 * Import this wherever a local `const C = {}` block was used.
 *
 * Usage:
 *   import { ADMIN_THEME } from "@/constants/adminTheme";
 *   const C = { ...ADMIN_THEME, ...pageExtras };
 */
export const ADMIN_THEME = {
  /** Base text */
  text:    "#0f172a",
  muted:   "#94a3b8",
  faint:   "#cbd5e1",

  /** Borders */
  border:  "rgba(0,0,0,0.07)",
  borderL: "rgba(0,0,0,0.05)",

  /** Agent status / accent colours */
  active:  "#10b981",   // green  – aktif
  busy:    "#3b82f6",   // blue   – meşgul
  break:   "#f59e0b",   // amber  – mola
  alarm:   "#ef4444",   // red    – kritik / alarm
  offline: "#94a3b8",   // slate  – offline / çıkış

  /** Extra accent */
  purple:  "#8b5cf6",
  teal:    "#14b8a6",

  /** Convenience aliases (match old C.green / C.red / C.blue / C.yellow) */
  green:   "#10b981",
  red:     "#ef4444",
  blue:    "#3b82f6",
  yellow:  "#f59e0b",

  /** Misc */
  hover:   "rgba(0,0,0,0.02)",
};
