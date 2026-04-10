import * as z from "zod/v4";

export const GRID = 20;

const TILE_TYPE_SCHEMA = z.enum([
  "term",
  "note",
  "code",
  "image",
  "graph",
]);

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function toGridPosition(position) {
  if (!position) return position;
  return {
    x: Math.floor(position.x / GRID),
    y: Math.floor(position.y / GRID),
  };
}

function toGridSize(size) {
  if (!size) return size;
  return {
    width: Math.floor(size.width / GRID),
    height: Math.floor(size.height / GRID),
  };
}

export function tilesToGrid(result) {
  return {
    ...result,
    tiles: (result.tiles ?? []).map((tile) => ({
      ...tile,
      position: toGridPosition(tile.position),
      size: toGridSize(tile.size),
    })),
  };
}

export function viewportToGrid(result) {
  if (!result) return result;
  return {
    ...result,
    pan: toGridPosition(result.pan),
  };
}

function toolResult(structuredContent) {
  return {
    content: [{ type: "text", text: pretty(structuredContent) }],
    structuredContent,
  };
}

export function createCanvasMcpToolHandlers(rpcCall) {
  return {
    async listTiles() {
      const result = await rpcCall("canvas.tileList");
      return toolResult(tilesToGrid(result));
    },

    async createTile({
      type,
      filePath,
      x,
      y,
      width,
      height,
    }) {
      const params = { tileType: type };
      if (filePath) params.filePath = filePath;
      if (x !== undefined || y !== undefined) {
        if (x === undefined || y === undefined) {
          throw new Error("x and y must be provided together");
        }
        params.position = { x: x * GRID, y: y * GRID };
      }
      if (width !== undefined || height !== undefined) {
        if (width === undefined || height === undefined) {
          throw new Error("width and height must be provided together");
        }
        params.size = { width: width * GRID, height: height * GRID };
      }

      const result = await rpcCall("canvas.tileCreate", params);
      return toolResult(result);
    },

    async removeTile({ tileId }) {
      await rpcCall("canvas.tileRemove", { tileId });
      return toolResult({ ok: true, tileId });
    },

    async moveTile({ tileId, x, y }) {
      await rpcCall("canvas.tileMove", {
        tileId,
        position: { x: x * GRID, y: y * GRID },
      });
      return toolResult({ ok: true, tileId, position: { x, y } });
    },

    async resizeTile({ tileId, width, height }) {
      await rpcCall("canvas.tileResize", {
        tileId,
        size: { width: width * GRID, height: height * GRID },
      });
      return toolResult({
        ok: true,
        tileId,
        size: { width, height },
      });
    },

    async focusTiles({ tileIds }) {
      await rpcCall("canvas.tileFocus", { tileIds });
      return toolResult({ ok: true, tileIds });
    },

    async getViewport() {
      const result = await rpcCall("canvas.viewportGet");
      return toolResult(viewportToGrid(result));
    },

    async setViewport({ x, y, zoom }) {
      const params = {};
      if (x !== undefined || y !== undefined) {
        if (x === undefined || y === undefined) {
          throw new Error("x and y must be provided together");
        }
        params.pan = { x: x * GRID, y: y * GRID };
      }
      if (zoom !== undefined) {
        params.zoom = zoom;
      }

      await rpcCall("canvas.viewportSet", params);
      return toolResult({
        ok: true,
        ...(params.pan ? { pan: { x, y } } : {}),
        ...(zoom !== undefined ? { zoom } : {}),
      });
    },

    async writeTerminal({ tileId, input }) {
      await rpcCall("canvas.terminalWrite", { tileId, input });
      return toolResult({ ok: true, tileId });
    },

    async readTerminal({ tileId, lines = 50 }) {
      const result = await rpcCall("canvas.terminalRead", {
        tileId,
        lines,
      });
      return toolResult(result);
    },
  };
}

export function registerCanvasMcpTools(server, rpcCall) {
  const handlers = createCanvasMcpToolHandlers(rpcCall);

  server.registerTool("canvas_list_tiles", {
    title: "List Canvas Tiles",
    description: "List all canvas tiles in grid units.",
    outputSchema: {
      tiles: z.array(z.object({
        id: z.string(),
        type: z.string(),
        filePath: z.string().optional(),
        folderPath: z.string().optional(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }).optional(),
        size: z.object({
          width: z.number(),
          height: z.number(),
        }).optional(),
      })),
    },
  }, handlers.listTiles);

  server.registerTool("canvas_create_tile", {
    title: "Create Canvas Tile",
    description:
      "Create a canvas tile. Coordinates and sizes are in grid units.",
    inputSchema: {
      type: TILE_TYPE_SCHEMA,
      filePath: z.string().optional(),
      x: z.number().int().min(0).optional(),
      y: z.number().int().min(0).optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    },
    outputSchema: {
      tileId: z.string(),
    },
  }, handlers.createTile);

  server.registerTool("canvas_remove_tile", {
    title: "Remove Canvas Tile",
    description: "Remove a tile from the canvas.",
    inputSchema: {
      tileId: z.string(),
    },
    outputSchema: {
      ok: z.boolean(),
      tileId: z.string(),
    },
  }, handlers.removeTile);

  server.registerTool("canvas_move_tile", {
    title: "Move Canvas Tile",
    description: "Move a tile to a new grid position.",
    inputSchema: {
      tileId: z.string(),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
    },
    outputSchema: {
      ok: z.boolean(),
      tileId: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
    },
  }, handlers.moveTile);

  server.registerTool("canvas_resize_tile", {
    title: "Resize Canvas Tile",
    description: "Resize a tile using grid units.",
    inputSchema: {
      tileId: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    },
    outputSchema: {
      ok: z.boolean(),
      tileId: z.string(),
      size: z.object({
        width: z.number(),
        height: z.number(),
      }),
    },
  }, handlers.resizeTile);

  server.registerTool("canvas_focus_tiles", {
    title: "Focus Canvas Tiles",
    description: "Pan and zoom the viewport to bring tiles into view.",
    inputSchema: {
      tileIds: z.array(z.string()).min(1),
    },
    outputSchema: {
      ok: z.boolean(),
      tileIds: z.array(z.string()),
    },
  }, handlers.focusTiles);

  server.registerTool("canvas_get_viewport", {
    title: "Get Canvas Viewport",
    description: "Get the current viewport pan and zoom in grid units.",
    outputSchema: {
      pan: z.object({
        x: z.number(),
        y: z.number(),
      }),
      zoom: z.number(),
    },
  }, handlers.getViewport);

  server.registerTool("canvas_set_viewport", {
    title: "Set Canvas Viewport",
    description: "Set viewport pan in grid units and/or zoom.",
    inputSchema: {
      x: z.number().int().min(0).optional(),
      y: z.number().int().min(0).optional(),
      zoom: z.number().positive().optional(),
    },
    outputSchema: {
      ok: z.boolean(),
      pan: z.object({
        x: z.number(),
        y: z.number(),
      }).optional(),
      zoom: z.number().optional(),
    },
  }, handlers.setViewport);

  server.registerTool("canvas_write_terminal", {
    title: "Write To Canvas Terminal",
    description: "Send input to a terminal tile.",
    inputSchema: {
      tileId: z.string(),
      input: z.string(),
    },
    outputSchema: {
      ok: z.boolean(),
      tileId: z.string(),
    },
  }, handlers.writeTerminal);

  server.registerTool("canvas_read_terminal", {
    title: "Read Canvas Terminal",
    description: "Read recent output from a terminal tile.",
    inputSchema: {
      tileId: z.string(),
      lines: z.number().int().positive().optional(),
    },
    outputSchema: {
      output: z.string(),
    },
  }, handlers.readTerminal);
}
