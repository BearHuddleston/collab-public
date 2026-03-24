import * as pty from "node-pty";
import * as os from "node:os";
import {
  getTerminfoDir,
  getTmuxBin,
  tmuxExec,
} from "./tmux";
import {
  getWslDistro,
  getWslShell,
  windowsPathToWslPath,
  wslExec,
} from "./wsl";

const SOCKET_NAME = "collab";

export interface TerminalBackend {
  kind: "local-tmux" | "wsl-tmux";
  getDefaultShell(): string;
  resolveSessionCwd(cwd: string): string;
  attachClient(
    sessionName: string,
    cols: number,
    rows: number,
  ): pty.IPty;
  createSession(
    sessionName: string,
    cwd: string,
    shell: string,
    cols: number,
    rows: number,
  ): void;
  hasSession(sessionName: string): boolean;
  captureScrollback(sessionName: string): string;
  resizeSession(
    sessionName: string,
    cols: number,
    rows: number,
  ): void;
  sendRawKeys(sessionName: string, data: string): void;
  killSession(sessionName: string): void;
  killServer(): void;
  listSessionNames(): string[];
  verifyAvailable(): void;
  getForegroundProcess(sessionName: string): string | null;
  translatePath(path: string): string;
}

function localUtf8Env(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  if (!env.LANG || !env.LANG.includes("UTF-8")) {
    env.LANG = "en_US.UTF-8";
  }
  const terminfoDir = getTerminfoDir();
  if (terminfoDir) {
    env.TERMINFO = terminfoDir;
  }
  return env;
}

function localHasSession(sessionName: string): boolean {
  try {
    tmuxExec("has-session", "-t", sessionName);
    return true;
  } catch {
    return false;
  }
}

const localBackend: TerminalBackend = {
  kind: "local-tmux",
  getDefaultShell() {
    return process.env.SHELL || "/bin/zsh";
  },
  resolveSessionCwd(cwd) {
    return cwd || os.homedir();
  },
  attachClient(sessionName, cols, rows) {
    return pty.spawn(
      getTmuxBin(),
      ["-L", SOCKET_NAME, "-u", "attach-session", "-t", sessionName],
      {
        name: "xterm-256color",
        cols,
        rows,
        env: localUtf8Env(),
      },
    );
  },
  createSession(sessionName, cwd, shell, cols, rows) {
    tmuxExec(
      "new-session",
      "-d",
      "-s",
      sessionName,
      "-c",
      cwd,
      "-x",
      String(cols),
      "-y",
      String(rows),
    );
    tmuxExec(
      "set-environment",
      "-t",
      sessionName,
      "COLLAB_PTY_SESSION_ID",
      sessionName.replace(/^collab-/, ""),
    );
    tmuxExec(
      "set-environment",
      "-t",
      sessionName,
      "SHELL",
      shell,
    );
  },
  hasSession(sessionName) {
    return localHasSession(sessionName);
  },
  captureScrollback(sessionName) {
    return tmuxExec(
      "capture-pane",
      "-t",
      sessionName,
      "-p",
      "-e",
      "-S",
      "-200000",
    );
  },
  resizeSession(sessionName, cols, rows) {
    tmuxExec(
      "resize-window",
      "-t",
      sessionName,
      "-x",
      String(cols),
      "-y",
      String(rows),
    );
  },
  sendRawKeys(sessionName, data) {
    tmuxExec("send-keys", "-l", "-t", sessionName, data);
  },
  killSession(sessionName) {
    tmuxExec("kill-session", "-t", sessionName);
  },
  killServer() {
    tmuxExec("kill-server");
  },
  listSessionNames() {
    try {
      const raw = tmuxExec("list-sessions", "-F", "#{session_name}");
      return raw.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  },
  verifyAvailable() {
    tmuxExec("-V");
  },
  getForegroundProcess(sessionName) {
    try {
      return tmuxExec(
        "display-message",
        "-p",
        "-t",
        sessionName,
        "#{pane_current_command}",
      );
    } catch {
      return null;
    }
  },
  translatePath(path) {
    return path;
  },
};

function wslTmuxExec(...args: string[]): string {
  return wslExec("tmux", "-L", SOCKET_NAME, "-u", ...args);
}

function wslHasSession(sessionName: string): boolean {
  try {
    wslTmuxExec("has-session", "-t", sessionName);
    return true;
  } catch {
    return false;
  }
}

function wslAttachArgs(sessionName: string): string[] {
  return [
    "-d",
    getWslDistro(),
    "--",
    "env",
    "LANG=en_US.UTF-8",
    "TERM=xterm-256color",
    "tmux",
    "-L",
    SOCKET_NAME,
    "-u",
    "attach-session",
    "-t",
    sessionName,
  ];
}

const wslBackend: TerminalBackend = {
  kind: "wsl-tmux",
  getDefaultShell() {
    return getWslShell();
  },
  resolveSessionCwd(cwd) {
    return windowsPathToWslPath(cwd || os.homedir());
  },
  attachClient(sessionName, cols, rows) {
    return pty.spawn("wsl.exe", wslAttachArgs(sessionName), {
      name: "xterm-256color",
      cols,
      rows,
      env: { ...process.env } as Record<string, string>,
    });
  },
  createSession(sessionName, cwd, shell, cols, rows) {
    wslTmuxExec(
      "new-session",
      "-d",
      "-s",
      sessionName,
      "-c",
      cwd,
      "-x",
      String(cols),
      "-y",
      String(rows),
    );
    wslTmuxExec(
      "set-environment",
      "-t",
      sessionName,
      "COLLAB_PTY_SESSION_ID",
      sessionName.replace(/^collab-/, ""),
    );
    wslTmuxExec(
      "set-environment",
      "-t",
      sessionName,
      "SHELL",
      shell,
    );
  },
  hasSession(sessionName) {
    return wslHasSession(sessionName);
  },
  captureScrollback(sessionName) {
    return wslTmuxExec(
      "capture-pane",
      "-t",
      sessionName,
      "-p",
      "-e",
      "-S",
      "-200000",
    );
  },
  resizeSession(sessionName, cols, rows) {
    wslTmuxExec(
      "resize-window",
      "-t",
      sessionName,
      "-x",
      String(cols),
      "-y",
      String(rows),
    );
  },
  sendRawKeys(sessionName, data) {
    wslTmuxExec("send-keys", "-l", "-t", sessionName, data);
  },
  killSession(sessionName) {
    wslTmuxExec("kill-session", "-t", sessionName);
  },
  killServer() {
    wslTmuxExec("kill-server");
  },
  listSessionNames() {
    try {
      const raw = wslTmuxExec("list-sessions", "-F", "#{session_name}");
      return raw.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  },
  verifyAvailable() {
    wslTmuxExec("-V");
  },
  getForegroundProcess(sessionName) {
    try {
      return wslTmuxExec(
        "display-message",
        "-p",
        "-t",
        sessionName,
        "#{pane_current_command}",
      );
    } catch {
      return null;
    }
  },
  translatePath(path) {
    return windowsPathToWslPath(path);
  },
};

export function getTerminalBackend(): TerminalBackend {
  return process.platform === "win32" ? wslBackend : localBackend;
}
