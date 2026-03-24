import { execFileSync } from "node:child_process";
import { isWindowsPath } from "@collab/shared/path-utils";

const DEFAULT_DISTRO = "Ubuntu";

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
  return wslExec("wslpath", "-a", "-u", path);
}

export function getWslShell(): string {
  try {
    const shell = wslExec("sh", "-lc", 'printf "%s" "${SHELL:-/bin/bash}"');
    return shell || "/bin/bash";
  } catch {
    return "/bin/bash";
  }
}
