import { describe, expect, test } from "bun:test";
import {
  composeTerminalFontFamily,
  DEFAULT_TERMINAL_FONT_FAMILY,
  pickInstalledTerminalFontFamily,
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

  test("returns the first installed mono-friendly nerd font when available", () => {
    expect(
      resolveTerminalFontFamily(
        undefined,
        (fontFamily) => fontFamily === '"FiraCode Nerd Font Mono"',
      ),
    ).toBe(composeTerminalFontFamily('"FiraCode Nerd Font Mono"'));
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

  test("appends emoji and symbol fallbacks for a single face", () => {
    const resolved = resolveTerminalFontFamily("FiraCode Nerd Font");
    expect(resolved.startsWith("FiraCode Nerd Font,")).toBe(true);
    expect(resolved).toContain('"Segoe UI Emoji"');
    expect(resolved).toContain('"Symbols Nerd Font Mono"');
  });
});

describe("pickInstalledTerminalFontFamily", () => {
  test("returns the first available candidate", () => {
    expect(
      pickInstalledTerminalFontFamily(
        (fontFamily) =>
          fontFamily === '"JetBrainsMono Nerd Font Mono"'
          || fontFamily === '"FiraCode Nerd Font Mono"',
      ),
    ).toBe('"JetBrainsMono Nerd Font Mono"');
  });

  test("returns null when none of the candidates are installed", () => {
    expect(pickInstalledTerminalFontFamily(() => false)).toBeNull();
  });
});

describe("composeTerminalFontFamily", () => {
  test("avoids duplicating the primary family when it is already in the fallback stack", () => {
    const resolved = composeTerminalFontFamily('"Symbols Nerd Font Mono"');
    const parts = resolved.split(",").map((part) => part.trim());
    expect(
      parts.filter((part) => part === '"Symbols Nerd Font Mono"').length,
    ).toBe(1);
  });
});
