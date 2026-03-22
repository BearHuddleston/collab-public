# Collaborator Canvas

Control Collaborator's spatial canvas from the terminal using the `collab` CLI.
The canvas is a pannable, zoomable surface where tiles display terminals, files, images, and graphs.

## Coordinate System

All positions and sizes use **grid units**. One grid unit = 20 pixels.
Origin (0,0) is the top-left corner. X increases rightward, Y increases downward.

## Tile Types

| Type    | Use for                          | Default size (w x h) |
|---------|----------------------------------|-----------------------|
| `term`  | Terminal / shell session         | 20 x 25              |
| `note`  | Markdown files (.md)             | 22 x 27              |
| `code`  | Source code files                | 22 x 27              |
| `image` | Images (.png, .jpg, .gif, .webp) | 14 x 14              |
| `graph` | .graph.json or folder graphs     | 30 x 25              |

Type is inferred from the file when `--file` is used:
- `.md`, `.txt` -> `note`
- `.graph.json` -> `graph`
- `.png`, `.jpg`, `.gif`, `.svg`, `.webp` -> `image`
- Directories -> `graph`
- Everything else -> `code`

## Commands

### collab tile list

List all tiles on the canvas. Returns JSON array with id, type, position, size, and file path for each tile.

```bash
collab tile list
```

### collab tile add

Create a new tile on the canvas.

```bash
collab tile add <type> [--file <path>] [--pos x,y] [--size w,h]
```

- `<type>`: term, note, code, image, or graph
- `--file <path>`: file to display (required for note, code, image, graph; omit for term)
- `--pos x,y`: position in grid units (default: viewport center)
- `--size w,h`: size in grid units (default: per-type default above)

Returns the new tile's ID on stdout.

**Examples:**
```bash
# Open a terminal at position (5, 5)
collab tile add term --pos 5,5

# Open a markdown file with default placement
collab tile add note --file ./README.md

# Open a graph file at a specific position and size
collab tile add graph --file ./entities.graph.json --pos 25,0 --size 35,30
```

### collab tile rm

Remove a tile from the canvas.

```bash
collab tile rm <id>
```

### collab tile move

Reposition a tile.

```bash
collab tile move <id> --pos x,y
```

### collab tile resize

Resize a tile.

```bash
collab tile resize <id> --size w,h
```

### collab viewport

Get the current viewport state: pan position (grid units) and zoom level.

```bash
collab viewport
```

### collab viewport set

Set the viewport pan and/or zoom.

```bash
collab viewport set [--pan x,y] [--zoom level]
```

- `--pan x,y`: viewport center in grid units
- `--zoom level`: zoom factor, 0.1 to 1.0

## Composition Patterns

### Side-by-side comparison

Two files next to each other for comparison.

```bash
collab tile add code --file ./old.ts --pos 0,0
collab tile add code --file ./new.ts --pos 23,0
```

### Research workspace

Knowledge graph on the left, notes on the right, terminal below.

```bash
collab tile add graph --file ./research.graph.json --pos 0,0 --size 30,25
collab tile add note --file ./notes.md --pos 31,0
collab tile add term --pos 0,26
```

### Dashboard layout

Multiple views arranged in a grid.

```bash
collab tile add graph --file ./entities.graph.json --pos 0,0 --size 30,25
collab tile add note --file ./log.md --pos 31,0
collab tile add note --file ./report.md --pos 31,14
collab tile add term --pos 0,26
```

### Focus view

Single tile centered with generous size.

```bash
collab tile add code --file ./main.ts --pos 5,2 --size 40,35
```

## Conventions

1. **Always `tile list` first** to see what's already on the canvas before adding tiles.
2. **Use viewport to frame** after arranging tiles: `collab viewport set --pan 0,0 --zoom 0.8`.
3. **Clean up when done**: remove tiles you created when they're no longer needed.
4. **Leave 1 grid unit gap** between adjacent tiles for visual clarity.
5. **File tiles auto-refresh**: when you write to a file that has a tile, the tile updates automatically. No need to close and reopen.
6. **Graph tiles support incremental updates**: append nodes to a `.graph.json` file and the graph tile smoothly incorporates them.

## Exit Codes

| Code | Meaning                                    |
|------|--------------------------------------------|
| 0    | Success                                    |
| 1    | RPC error (tile not found, invalid params) |
| 2    | Connection failure (Collaborator not running) |
