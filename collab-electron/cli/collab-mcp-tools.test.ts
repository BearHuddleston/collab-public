import { describe, expect, test } from "bun:test";
import {
  createCanvasMcpToolHandlers,
  tilesToGrid,
  viewportToGrid,
} from "./collab-mcp-tools.mjs";

describe("collab-mcp-tools", () => {
  test("tilesToGrid converts pixel coordinates to grid units", () => {
    expect(tilesToGrid({
      tiles: [{
        id: "tile-1",
        type: "note",
        position: { x: 40, y: 60 },
        size: { width: 220, height: 540 },
      }],
    })).toEqual({
      tiles: [{
        id: "tile-1",
        type: "note",
        position: { x: 2, y: 3 },
        size: { width: 11, height: 27 },
      }],
    });
  });

  test("viewportToGrid converts pan to grid units", () => {
    expect(viewportToGrid({
      pan: { x: 100, y: 220 },
      zoom: 0.8,
    })).toEqual({
      pan: { x: 5, y: 11 },
      zoom: 0.8,
    });
  });

  test("createTile maps grid input to canvas.tileCreate params", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const handlers = createCanvasMcpToolHandlers(async (method, params) => {
      calls.push({ method, params });
      return { tileId: "tile-123" };
    });

    const result = await handlers.createTile({
      type: "code",
      filePath: "/tmp/file.ts",
      x: 5,
      y: 6,
      width: 22,
      height: 27,
    });

    expect(calls).toEqual([{
      method: "canvas.tileCreate",
      params: {
        tileType: "code",
        filePath: "/tmp/file.ts",
        position: { x: 100, y: 120 },
        size: { width: 440, height: 540 },
      },
    }]);
    expect(result.structuredContent).toEqual({ tileId: "tile-123" });
  });

  test("setViewport maps grid pan to pixel pan", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const handlers = createCanvasMcpToolHandlers(async (method, params) => {
      calls.push({ method, params });
      return {};
    });

    const result = await handlers.setViewport({ x: 3, y: 4, zoom: 0.75 });

    expect(calls).toEqual([{
      method: "canvas.viewportSet",
      params: {
        pan: { x: 60, y: 80 },
        zoom: 0.75,
      },
    }]);
    expect(result.structuredContent).toEqual({
      ok: true,
      pan: { x: 3, y: 4 },
      zoom: 0.75,
    });
  });

  test("readTerminal defaults lines to 50", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const handlers = createCanvasMcpToolHandlers(async (method, params) => {
      calls.push({ method, params });
      return { output: "ok" };
    });

    const result = await handlers.readTerminal({ tileId: "tile-1" });

    expect(calls).toEqual([{
      method: "canvas.terminalRead",
      params: { tileId: "tile-1", lines: 50 },
    }]);
    expect(result.structuredContent).toEqual({ output: "ok" });
  });
});
