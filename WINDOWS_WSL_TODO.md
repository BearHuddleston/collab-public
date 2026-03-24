# Windows + WSL MVP TODO

Target: personal-use Windows host app with WSL-backed terminals.

## Scope

- [x] Define the target as a Windows Electron app with WSL 2 terminals
- [x] Limit the first pass to Windows-hosted workspaces
- [x] Defer native Windows shell support (`cmd.exe`, PowerShell) to a later phase
- [x] Defer polished installer/updater work until after dev-mode stability

## Core App

- [x] Make dev startup scripts work on Windows
- [x] Add a terminal backend abstraction
- [x] Preserve the current tmux-backed macOS flow behind that abstraction
- [x] Add a WSL tmux backend for Windows
- [x] Add terminal foreground-process lookup for shell-idle checks
- [x] Route PTY IPC through the backend abstraction

## WSL Integration

- [x] Detect or configure a WSL distro
- [x] Verify that `tmux` exists inside WSL
- [x] Translate Windows workspace paths to WSL paths
- [x] Create and reattach tmux sessions through `wsl.exe`
- [x] Keep terminal session metadata on the Windows side

## Path Safety

- [x] Replace POSIX-only path comparisons in main-process workspace guards
- [x] Replace renderer-side `/` string slicing for basename/dirname behavior
- [x] Normalize path comparison logic for graph scoping and rename updates
- [x] Keep app state and filesystem calls on native host paths

## Platform Behavior

- [x] Gate macOS-only PATH bootstrap logic
- [x] Gate macOS-only window chrome options
- [x] Disable or no-op the Unix CLI installer on Windows
- [x] Make terminal key handling use Ctrl on Windows where needed

## Validation

- [x] Verify the app starts in dev mode in the local WSLg environment
- [ ] Verify the app starts in dev mode on Windows
- [ ] Verify a Windows workspace loads correctly
- [ ] Verify opening a terminal enters the matching WSL path
- [ ] Verify terminal sessions can be rediscovered and reattached
- [x] Run tests/build checks and note remaining gaps

## Later

- [ ] Add Windows packaging targets
- [ ] Add installer and updater support on Windows
- [ ] Support workspaces inside the WSL filesystem
- [ ] Add an optional native Windows terminal backend
