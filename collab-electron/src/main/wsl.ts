import { execFileSync } from "node:child_process";
import { isWindowsPath } from "@collab/shared/path-utils";

const DEFAULT_DISTRO = "Ubuntu";
let cachedWslShell: string | null = null;
const translatedPathCache = new Map<string, string>();

export function getWslDistro(): string {
  const configured = process.env["COLLAB_WSL_DISTRO"]?.trim();
  return configured || DEFAULT_DISTRO;
}

export function wslExec(...args: string[]): string {
  return execFileSync(
    "wsl.exe",
    ["-d", getWslDistro(), "--", ...args],
    { encoding: "utf8", timeout: 5000 },
  )
    .replace(/\r\n/g, "\n")
    .trim();
}

export function windowsPathToWslPath(path: string): string {
  if (!path || !isWindowsPath(path)) {
    return path;
  }
  const cached = translatedPathCache.get(path);
  if (cached) {
    return cached;
  }
  const normalized = path.replace(/\\/g, "/");
  const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (driveMatch) {
    const translated =
      `/mnt/${driveMatch[1]!.toLowerCase()}/${driveMatch[2]!}`;
    translatedPathCache.set(path, translated);
    return translated;
  }
  const translated = wslExec("wslpath", "-a", "-u", normalized);
  translatedPathCache.set(path, translated);
  return translated;
}

export function getWslShell(): string {
  if (cachedWslShell) {
    return cachedWslShell;
  }
  try {
    const shell = wslExec("sh", "-lc", 'printf "%s" "${SHELL:-/bin/bash}"');
    cachedWslShell = shell || "/bin/bash";
    return cachedWslShell;
  } catch {
    cachedWslShell = "/bin/bash";
    return cachedWslShell;
  }
}
