/** Brand palette — single source of truth for JS/TS consumers (charts, etc.) */
export const colors = {
  brand: "#04267C",
  brandDark: "#031952",
  accent: "#30BFDC",
  success: "#228212",
  successLight: "#248112",
  danger: "#C70104",
  dangerDark: "#9e0103",
  surface: "#f4f8fc",
  surfaceMuted: "#eef4fb",
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
