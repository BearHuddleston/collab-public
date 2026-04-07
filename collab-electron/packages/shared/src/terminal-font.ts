const TERMINAL_PRIMARY_FONT_CANDIDATES = [
  '"CaskaydiaMono Nerd Font Mono"',
  '"CaskaydiaMono Nerd Font"',
  '"CaskaydiaCove Nerd Font Mono"',
  '"CaskaydiaCove Nerd Font"',
  '"JetBrainsMono Nerd Font Mono"',
  '"JetBrainsMono Nerd Font"',
  '"MesloLGS NF"',
  '"MesloLGS Nerd Font"',
  '"SauceCodePro Nerd Font Mono"',
  '"SauceCodePro Nerd Font"',
  '"FiraCode Nerd Font Mono"',
  '"FiraCode Nerd Font"',
  '"Hack Nerd Font Mono"',
  '"Hack Nerd Font"',
  '"Symbols Nerd Font Mono"',
  '"Symbols Nerd Font"',
];

const TERMINAL_FALLBACK_FONT_FAMILIES = [
  ...TERMINAL_PRIMARY_FONT_CANDIDATES,
  '"SF Mono"',
  '"Cascadia Mono"',
  "Consolas",
  "Menlo",
  "Monaco",
  '"DejaVu Sans Mono"',
  '"Liberation Mono"',
  '"Noto Sans Mono"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
  '"Apple Color Emoji"',
  '"Noto Color Emoji"',
  '"Noto Emoji"',
  "monospace",
];

export type FontAvailabilityCheck = (fontFamily: string) => boolean;

export const DEFAULT_TERMINAL_FONT_FAMILY = TERMINAL_FALLBACK_FONT_FAMILIES.join(
  ", ",
);

function normalizeFontFamilyToken(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

export function composeTerminalFontFamily(
  primaryFontFamily?: string | null,
): string {
  const requested = typeof primaryFontFamily === "string"
    ? primaryFontFamily.trim()
    : "";

  if (!requested) {
    return DEFAULT_TERMINAL_FONT_FAMILY;
  }

  if (requested.includes(",")) {
    return requested;
  }

  const seen = new Set<string>([normalizeFontFamilyToken(requested)]);
  const families = [requested];

  for (const fallback of TERMINAL_FALLBACK_FONT_FAMILIES) {
    const normalized = normalizeFontFamilyToken(fallback);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    families.push(fallback);
  }

  return families.join(", ");
}

export function pickInstalledTerminalFontFamily(
  isFontAvailable?: FontAvailabilityCheck,
): string | null {
  if (!isFontAvailable) return null;

  for (const candidate of TERMINAL_PRIMARY_FONT_CANDIDATES) {
    if (isFontAvailable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveTerminalFontFamily(
  value: unknown,
  isFontAvailable?: FontAvailabilityCheck,
): string {
  if (typeof value !== "string" || !value.trim()) {
    return composeTerminalFontFamily(
      pickInstalledTerminalFontFamily(isFontAvailable),
    );
  }

  return composeTerminalFontFamily(value);
}
