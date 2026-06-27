# Git Stash Manager for VS Code

A visual Git stash inspector for VS Code that helps you find, inspect, and
understand stashes — including ones created indirectly during commit, merge,
pull, or rebase flows — without leaving the editor.

This first version is **read-only and safe**: it lists stashes and shows what
each one contains, but never applies, pops, drops, or otherwise mutates Git
state.

## Features (MVP)

- Open from the Command Palette: **Git Stash Manager: Open**.
- List all stashes in the current workspace (`git stash list`).
- Show stash metadata: reference, branch, and message.
- Inspect a stash's changed files (`git stash show <ref> --stat`).
- Preview the full diff (`git stash show <ref> --patch`) in an intuitive
  **side-by-side (split) view** — old version on the left, new on the right,
  with line numbers — or switch to a raw unified view.
- Refresh, filter, and clear loading/empty/error states.

## Architecture

The extension keeps Git logic and UI strictly separated:

- **Extension host** (`src/extension`) — owns the VS Code APIs, runs Git via
  `execFile` (no shell), parses the output, and exchanges typed messages with
  the webview. Git is never run from the webview.
- **React webview** (`src/webview`) — renders the stash list, details, and diff,
  and sends user actions back to the host.

Shared message and data types live in `src/extension/types/stash.ts`.

```
src/
├─ extension/
│  ├─ extension.ts            # activate / command registration
│  ├─ git/
│  │  ├─ gitService.ts        # execFile-based Git runner + commands
│  │  ├─ stashParser.ts       # pure parsers for list / --stat
│  │  └─ diffParser.ts        # unified patch -> structured split-diff rows
│  ├─ webview/
│  │  ├─ StashManagerPanel.ts # webview lifecycle + message handling
│  │  └─ getWebviewHtml.ts    # CSP-scoped HTML shell
│  └─ types/stash.ts          # shared types + message contract
└─ webview/
   ├─ main.tsx, App.tsx
   ├─ components/             # StashList, StashDetails, ChangedFilesList, DiffViewer
   └─ styles/app.css          # styled with VS Code theme variables
```

## Development

```bash
npm install        # install dependencies
npm run build      # build the extension host (tsc) and webview (Vite)
npm run typecheck  # type-check both projects without emitting
npm test           # run parser unit tests (node:test)
```

Then press <kbd>F5</kbd> in VS Code to launch an Extension Development Host and
run **Git Stash Manager: Open** from the Command Palette.

Watch mode during development:

```bash
npm run watch:extension   # in one terminal
npm run watch:webview     # in another
```

## Safety

The MVP performs no destructive Git actions. `apply`, `pop`, `drop`, and `clear`
are intentionally not implemented and will only be added later behind explicit
confirmation. See `planning.md` and `ai-spec-kit.md` for the full spec.
