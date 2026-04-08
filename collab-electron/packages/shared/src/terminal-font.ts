const TERMINAL_FALLBACK_FONT_FAMILIES = [
  "Menlo",
  "Monaco",
  '"Courier New"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
  '"Apple Color Emoji"',
  '"Noto Color Emoji"',
  "monospace",
];

export const TERMINAL_FONT_SUGGESTIONS = [
  "FiraCode Nerd Font Mono",
  "FiraCode Nerd Font",
  "JetBrainsMono Nerd Font Mono",
  "CaskaydiaMono Nerd Font Mono",
  "MesloLGS NF",
  "Hack Nerd Font Mono",
  "SF Mono",
  "Consolas",
];

export const DEFAULT_TERMINAL_FONT_FAMILY = TERMINAL_FALLBACK_FONT_FAMILIES.join(
  ", ",
);

function normalizeFontFamilyToken(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

function quoteFontFamily(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^['"].*['"]$/.test(trimmed)) return trimmed;
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/"/g, '\\"')}"`;
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

  const primary = quoteFontFamily(requested);
  const seen = new Set<string>([normalizeFontFamilyToken(primary)]);
  const families = [primary];

  for (const fallback of TERMINAL_FALLBACK_FONT_FAMILIES) {
    const normalized = normalizeFontFamilyToken(fallback);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    families.push(fallback);
  }

  return families.join(", ");
}

export function resolveTerminalFontFamily(value: unknown): string {
  return composeTerminalFontFamily(
    typeof value === "string" ? value : null,
  );
}
