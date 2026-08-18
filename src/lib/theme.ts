/** Brand palette — single source of truth for JS/TS consumers (charts, etc.) */
export const colors = {
  brand: "#04267C",
  brandDark: "#02143d",
  accent: "#1498c4",
  success: "#228212",
  successLight: "#248112",
  danger: "#C70104",
  dangerDark: "#9e0103",
  surface: "#ffffff",
  surfaceMuted: "#f4f4f5",
} as const;

export const chartColors = {
  brand: colors.brand,
  accent: colors.accent,
  success: colors.success,
  successLight: colors.successLight,
  danger: colors.danger,
  pending: colors.accent,
  approved: colors.success,
  rejected: colors.danger,
  active: colors.brand,
  completed: colors.successLight,
  blocked: colors.danger,
} as const;

/** Brighter bars/slices that stay readable on the dark canvas */
export const chartColorsDark = {
  brand: "#6b9aff",
  accent: "#3ec8ea",
  success: "#4ade80",
  successLight: "#86efac",
  danger: "#f07171",
  pending: "#3ec8ea",
  approved: "#4ade80",
  rejected: "#f07171",
  active: "#6b9aff",
  completed: "#86efac",
  blocked: "#f07171",
} as const;

export function getChartColors(theme: "light" | "dark") {
  return theme === "dark" ? chartColorsDark : chartColors;
}
