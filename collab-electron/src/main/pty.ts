import * as pty from "node-pty";
import * as os from "os";
import * as fs from "node:fs";
import * as crypto from "crypto";
import { type IDisposable } from "node-pty";
import {
  tmuxSessionName,
  writeSessionMeta,
  readSessionMeta,
  deleteSessionMeta,
  SESSION_DIR,
  type SessionMeta,
} from "./tmux";
import { getTerminalBackend } from "./terminal-backend";

interface PtySession {
  pty: pty.IPty;
  shell: string;
  disposables: IDisposable[];
}

const sessions = new Map<string, PtySession>();
let shuttingDown = false;
const backend = getTerminalBackend();

export function setShuttingDown(value: boolean): void {
  shuttingDown = value;
}

function getWebContents(): typeof import("electron").webContents | null {
  try {
    return require("electron").webContents;
  } catch {
    return null;
  }
}

function sendToSender(
  senderWebContentsId: number | undefined,
  channel: string,
  payload: unknown,
): void {
  if (senderWebContentsId == null) return;
  const wc = getWebContents();
  if (!wc) return;
  const sender = wc.fromId(senderWebContentsId);
  if (sender && !sender.isDestroyed()) {
    sender.send(channel, payload);
  }
}

function attachClient(
  sessionId: string,
  cols: number,
  rows: number,
  senderWebContentsId?: number,
): pty.IPty {
  const name = tmuxSessionName(sessionId);
  const ptyProcess = backend.attachClient(name, cols, rows);

  const disposables: IDisposable[] = [];

  disposables.push(
    ptyProcess.onData((data: string) => {
      sendToSender(
        senderWebContentsId,
        "pty:data",
        { sessionId, data },
      );
    }),
  );

  disposables.push(
    ptyProcess.onExit(() => {
      if (shuttingDown) {
        sessions.delete(sessionId);
        return;
      }
      if (!backend.hasSession(name)) {
        deleteSessionMeta(sessionId);
        sendToSender(
          senderWebContentsId,
          "pty:exit",
          { sessionId, exitCode: 0 },
        );
      }
      sessions.delete(sessionId);
    }),
  );

  sessions.set(sessionId, {
    pty: ptyProcess,
    shell: "",
    disposables,
  });

  return ptyProcess;
}

export function createSession(
  cwd?: string,
  senderWebContentsId?: number,
  cols?: number,
  rows?: number,
): { sessionId: string; shell: string } {
  const sessionId = crypto.randomBytes(8).toString("hex");
  const shell = backend.getDefaultShell();
  const name = tmuxSessionName(sessionId);
  const hostCwd = cwd || os.homedir();
  const resolvedCwd = backend.resolveSessionCwd(hostCwd);
  const c = cols || 80;
  const r = rows || 24;

  backend.createSession(name, resolvedCwd, shell, c, r);

  writeSessionMeta(sessionId, {
    shell,
    cwd: hostCwd,
    createdAt: new Date().toISOString(),
  });

  attachClient(sessionId, c, r, senderWebContentsId);

  const session = sessions.get(sessionId)!;
  session.shell = shell;

  return { sessionId, shell };
}

function stripTrailingBlanks(text: string): string {
  const lines = text.split("\n");
  let end = lines.length;
  while (end > 0 && lines[end - 1]!.trim() === "") {
    end--;
  }
  return lines.slice(0, end).join("\n");
}

export function reconnectSession(
  sessionId: string,
  cols: number,
  rows: number,
  senderWebContentsId: number,
): {
  sessionId: string;
  shell: string;
  meta: SessionMeta | null;
  scrollback: string;
} {
  const name = tmuxSessionName(sessionId);

  if (!backend.hasSession(name)) {
    deleteSessionMeta(sessionId);
    throw new Error(`tmux session ${name} not found`);
  }

  let scrollback = "";
  try {
    const raw = backend.captureScrollback(name);
    scrollback = stripTrailingBlanks(raw);
  } catch {
    // Proceed without scrollback
  }

  attachClient(sessionId, cols, rows, senderWebContentsId);

  try {
    backend.resizeSession(name, cols, rows);
  } catch {
    // Non-fatal
  }

  const meta = readSessionMeta(sessionId);
  const session = sessions.get(sessionId)!;
  session.shell = meta?.shell || backend.getDefaultShell();

  return { sessionId, shell: session.shell, meta, scrollback };
}

export function writeToSession(
  sessionId: string,
  data: string,
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.pty.write(data);
}

export function sendRawKeys(
  sessionId: string,
  data: string,
): void {
  const name = tmuxSessionName(sessionId);
  backend.sendRawKeys(name, data);
}

export function resizeSession(
  sessionId: string,
  cols: number,
  rows: number,
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.pty.resize(cols, rows);

  const name = tmuxSessionName(sessionId);
  try {
    backend.resizeSession(name, cols, rows);
  } catch {
    // Non-fatal
  }
}

export function killSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    for (const d of session.disposables) d.dispose();
    session.pty.kill();
    sessions.delete(sessionId);
  }

  const name = tmuxSessionName(sessionId);
  try {
    backend.killSession(name);
  } catch {
    // Session may already be dead
  }

  deleteSessionMeta(sessionId);
}

export function listSessions(): string[] {
  return [...sessions.keys()];
}

export function killAll(): void {
  shuttingDown = true;
  for (const [id, session] of sessions) {
    for (const d of session.disposables) d.dispose();
    session.pty.kill();
    sessions.delete(id);
  }
}

const KILL_ALL_TIMEOUT_MS = 2000;

export function killAllAndWait(): Promise<void> {
  shuttingDown = true;
  if (sessions.size === 0) return Promise.resolve();

  const pending: Promise<void>[] = [];
  for (const [id, session] of sessions) {
    pending.push(
      new Promise<void>((resolve) => {
        session.pty.onExit(() => resolve());
      }),
    );
    for (const d of session.disposables) d.dispose();
    session.pty.kill();
    sessions.delete(id);
  }

  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, KILL_ALL_TIMEOUT_MS),
  );

  return Promise.race([
    Promise.all(pending).then(() => {}),
    timeout,
  ]);
}

export function destroyAll(): void {
  killAll();
  try {
    backend.killServer();
  } catch {
    // Server may not be running
  }
}

export interface DiscoveredSession {
  sessionId: string;
  meta: SessionMeta;
}

export function discoverSessions(): DiscoveredSession[] {
  const tmuxNames = backend.listSessionNames();
  const tmuxSet = new Set(tmuxNames);
  const result: DiscoveredSession[] = [];

  let metaFiles: string[];
  try {
    metaFiles = fs
      .readdirSync(SESSION_DIR)
      .filter((f) => f.endsWith(".json"));
  } catch {
    metaFiles = [];
  }

  for (const file of metaFiles) {
    const sessionId = file.replace(".json", "");
    const name = tmuxSessionName(sessionId);

    if (tmuxSet.has(name)) {
      const meta = readSessionMeta(sessionId);
      if (meta) {
        result.push({ sessionId, meta });
      }
      tmuxSet.delete(name);
    } else {
      deleteSessionMeta(sessionId);
    }
  }

  for (const orphan of tmuxSet) {
    if (orphan.startsWith("collab-")) {
      try {
        backend.killSession(orphan);
      } catch {
        // Already dead
      }
    }
  }

  return result;
}

export function verifyTmuxAvailable(): void {
  backend.verifyAvailable();
}

export function getForegroundProcess(
  sessionId: string,
): string | null {
  return backend.getForegroundProcess(tmuxSessionName(sessionId));
}

export function translatePathForTerminal(path: string): string {
  return backend.translatePath(path);
}
