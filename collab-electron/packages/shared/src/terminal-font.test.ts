import { describe, expect, test } from "bun:test";
import {
  composeTerminalFontFamily,
  DEFAULT_TERMINAL_FONT_FAMILY,
  resolveTerminalFontFamily,
} from "./terminal-font";

describe("resolveTerminalFontFamily", () => {
  test("returns the default stack for missing values", () => {
    expect(resolveTerminalFontFamily(undefined)).toBe(
      DEFAULT_TERMINAL_FONT_FAMILY,
    );
    expect(resolveTerminalFontFamily(null)).toBe(
      DEFAULT_TERMINAL_FONT_FAMILY,
    );
  });

  test("returns the default stack for blank strings", () => {
    expect(resolveTerminalFontFamily("")).toBe(
      DEFAULT_TERMINAL_FONT_FAMILY,
    );
    expect(resolveTerminalFontFamily("   ")).toBe(
      DEFAULT_TERMINAL_FONT_FAMILY,
    );
  });

  test("preserves a user-provided font stack", () => {
    expect(resolveTerminalFontFamily('Monaspace Neon, monospace')).toBe(
      "Monaspace Neon, monospace",
    );
  });

  test("appends fallbacks for a single family", () => {
    const resolved = resolveTerminalFontFamily("FiraCode Nerd Font Mono");
    expect(resolved.startsWith('"FiraCode Nerd Font Mono",')).toBe(true);
    expect(resolved).toContain("Menlo");
    expect(resolved).toContain('"Segoe UI Emoji"');
  });
});

describe("composeTerminalFontFamily", () => {
  test("avoids duplicating the primary family when it is already in the fallback stack", () => {
    const resolved = composeTerminalFontFamily("Menlo");
    const parts = resolved.split(",").map((part) => part.trim());
    expect(parts.filter((part) => part === "Menlo").length).toBe(1);
  });
});
