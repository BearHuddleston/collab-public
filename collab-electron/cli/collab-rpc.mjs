import { createConnection } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const COLLAB_DIR = join(homedir(), ".collaborator");
const SOCKET_FILE = join(COLLAB_DIR, "socket-path");

export function readSocketPath() {
  try {
    return readFileSync(SOCKET_FILE, "utf-8").trim();
  } catch {
    const err = new Error(
      "collaborator is not running (no socket-path file)",
    );
    err.exitCode = 2;
    throw err;
  }
}

export function rpcCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function fail(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }

    function succeed(result) {
      if (settled) return;
      settled = true;
      resolve(result);
    }

    let socketPath;
    try {
      socketPath = readSocketPath();
    } catch (error) {
      fail(error);
      return;
    }

    const payload =
      JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) + "\n";

    const sock = createConnection(socketPath);
    let buf = "";

    const timer = setTimeout(() => {
      sock.destroy();
      fail(new Error("timeout"));
    }, 10_000);

    sock.on("connect", () => sock.write(payload));

    sock.on("data", (chunk) => {
      buf += chunk.toString();
      const nl = buf.indexOf("\n");
      if (nl === -1) return;

      clearTimeout(timer);
      sock.destroy();

      let resp;
      try {
        resp = JSON.parse(buf.slice(0, nl));
      } catch {
        fail(new Error("invalid response from collaborator"));
        return;
      }

      if (resp.error) {
        fail(new Error(resp.error.message ?? "unknown error"));
      } else {
        succeed(resp.result);
      }
    });

    sock.on("error", (err) => {
      clearTimeout(timer);
      fail(err);
    });
  });
}
