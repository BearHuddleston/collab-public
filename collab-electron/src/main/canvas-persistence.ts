import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as crypto from "node:crypto";
import { COLLAB_DIR } from "./paths";

const STATE_DIR = COLLAB_DIR;
const STATE_FILE = join(STATE_DIR, "canvas-state.json");

interface TileState {
  id: string;
  type: "term" | "note" | "code" | "image" | "graph" | "browser";
  x: number;
  y: number;
  width: number;
  height: number;
  filePath?: string;
  folderPath?: string;
  url?: string | null;
  workspacePath?: string;
  ptySessionId?: string;
  zIndex: number;
}

interface CanvasState {
  version: 1;
  tiles: TileState[];
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
}

const RENAME_RETRY_DELAYS_MS = [10, 30, 75];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWindowsRenamePermissionError(error: unknown): boolean {
  return (
    process.platform === "win32" &&
    error instanceof Error &&
    "code" in error &&
    error.code === "EPERM"
  );
}

export async function loadState(): Promise<CanvasState | null> {
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    const state = JSON.parse(raw) as CanvasState;
    if (state.version !== 1) return null;
    return state;
  } catch {
    return null;
  }
}

export async function saveState(state: CanvasState): Promise<void> {
  if (!existsSync(STATE_DIR)) {
    await mkdir(STATE_DIR, { recursive: true });
  }
  const tmp = join(
    STATE_DIR,
    `canvas-state-${crypto.randomUUID()}.json`,
  );
  const json = JSON.stringify(state, null, 2);
  await writeFile(tmp, json, "utf-8");
  try {
    await rename(tmp, STATE_FILE);
    return;
  } catch (error) {
    if (!isWindowsRenamePermissionError(error)) {
      throw error;
    }
  }

  for (const delayMs of RENAME_RETRY_DELAYS_MS) {
    await sleep(delayMs);
    try {
      await rm(STATE_FILE, { force: true });
      await rename(tmp, STATE_FILE);
      return;
    } catch (error) {
      if (!isWindowsRenamePermissionError(error)) {
        throw error;
      }
    }
  }

  // Last-resort fallback for Windows lock contention: write directly
  // to the target file instead of failing the UI action.
  await writeFile(STATE_FILE, json, "utf-8");
  await rm(tmp, { force: true });
}
