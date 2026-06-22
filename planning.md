# Git Stash Manager for VS Code — Planning Spec

## 1. Project Overview

**Project name:** Git Stash Manager for VS Code  
**Type:** Visual Studio Code extension  
**Primary language:** TypeScript  
**UI approach:** React rendered inside a VS Code Webview  
**Initial scope:** Manage and inspect Git stashes visually inside VS Code.

This extension is intended to make `git stash` easier to understand and safer to use. The first version should focus on discovering stashes, showing what each stash contains, and allowing the developer to inspect the affected files and changes without needing to memorize Git commands.

The project must remain a VS Code extension for now. No standalone desktop app, web app, or mobile app should be planned for the initial version.

---

## 2. Problem Statement

Developers often create Git stashes manually, but VS Code or Git workflows may also create stashes indirectly during commit, merge, pull, rebase, or conflict-resolution flows.

A common diagnostic flow is:

```bash
git stash list
```

This reveals available stash entries, for example:

```bash
stash@{0}: WIP on main: abc123 message
stash@{1}: On feature/foo: temporary changes
stash@{2}: WIP on develop: another message
```

Then each stash can be inspected with:

```bash
git stash show stash@{N} --stat
```

This shows the changed files and summary statistics for a specific stash.

The extension should turn this command-line workflow into a clear graphical interface inside VS Code.

---

## 3. Primary Goals

The extension should initially provide:

1. **List all Git stashes** in the current workspace.
2. **Show stash metadata**, including index, branch, message, and raw stash reference.
3. **Inspect a selected stash** using Git commands.
4. **Show files changed inside each stash**.
5. **Show diff-level details** for changed files.
6. **Use a React-based UI** inside a VS Code Webview.
7. **Keep the project strictly as a VS Code extension** in the first version.

---

## 4. Non-Goals for the Initial Version

The first version should not focus on advanced stash manipulation. These features can be considered later, but should not be part of the first implementation unless explicitly approved:

- Renaming stashes.
- Tagging or categorizing stashes.
- Syncing stashes externally.
- Cloud backup.
- Standalone web app.
- Standalone desktop app.
- AI-generated summaries of stashes.
- Automatic stash cleanup.
- Applying, popping, dropping, or branching from stash without confirmation.

The initial project should prioritize visibility, inspection, and safety.

---

## 5. Core Git Commands

The extension should be based on these commands initially:

### 5.1 List Stashes

```bash
git stash list
```

Purpose:

- Detect all available stashes.
- Parse each stash entry.
- Display them in the extension UI.

Expected raw format example:

```bash
stash@{0}: WIP on main: 123abc Initial commit message
stash@{1}: On feature/login: temporary auth work
```

Suggested parsed shape:

```ts
type GitStashEntry = {
  ref: string;        // "stash@{0}"
  index: number;      // 0
  branch?: string;    // "main" or "feature/login"
  message: string;    // Remaining stash description
  raw: string;        // Full original line
};
```

---

### 5.2 Show Stash File Summary

```bash
git stash show stash@{N} --stat
```

Purpose:

- Show which files were changed.
- Show line additions/deletions summary.
- Help the user identify which stash contains the work they are looking for.

Example output:

```bash
src/App.tsx       | 12 ++++++++----
src/utils/git.ts  | 30 ++++++++++++++++++++++++++++++
2 files changed, 38 insertions(+), 4 deletions(-)
```

Suggested parsed shape:

```ts
type GitStashStat = {
  files: GitStashChangedFile[];
  summary?: string;
};

type GitStashChangedFile = {
  path: string;
  insertions?: number;
  deletions?: number;
  raw: string;
};
```

---

### 5.3 Show Full Stash Diff

```bash
git stash show stash@{N} --patch
```

Purpose:

- Display line-level changes.
- Feed a visual diff viewer.
- Allow the user to understand what changed before applying or restoring anything.

Suggested parsed shape:

```ts
type GitStashDiff = {
  ref: string;
  rawPatch: string;
  files: GitStashDiffFile[];
};

type GitStashDiffFile = {
  oldPath?: string;
  newPath?: string;
  hunks: GitDiffHunk[];
};

type GitDiffHunk = {
  header: string;
  lines: GitDiffLine[];
};

type GitDiffLine = {
  type: "context" | "addition" | "deletion" | "meta";
  content: string;
};
```

---

## 6. Suggested Extension Features

### 6.1 MVP Features

The first version should include:

- Command Palette command: `Git Stash Manager: Open`.
- Sidebar or panel Webview showing all detected stashes.
- Refresh button to re-run `git stash list`.
- Stash detail view.
- Changed files list for selected stash.
- Basic diff preview using `git stash show stash@{N} --patch`.
- Empty state when no stashes exist.
- Error state when workspace is not a Git repository.
- Error state when Git is not installed or unavailable.

---

### 6.2 Recommended V1 Features After MVP

These can come after the read-only inspection flow is stable:

- Apply stash with confirmation.
- Pop stash with confirmation.
- Drop stash with confirmation.
- Create branch from stash.
- Compare stash file against current working tree.
- Search/filter stashes by branch, file path, or message.
- Detect stashes created by VS Code or automated Git flows when possible.
- Show safer warnings before destructive actions.

---

## 7. UX and Interface Plan

### 7.1 Main Layout

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│ Git Stash Manager                           │
│ [Refresh] [Search...]                       │
├───────────────────────┬─────────────────────┤
│ Stash List            │ Stash Details        │
│                       │                     │
│ stash@{0}             │ Message              │
│ branch: main          │ Branch               │
│ files: 4              │ Changed Files        │
│                       │                     │
│ stash@{1}             │ src/App.tsx          │
│ branch: feature/auth  │ src/utils/git.ts     │
│                       │                     │
│ stash@{2}             │ Diff Preview         │
└───────────────────────┴─────────────────────┘
```

---

### 7.2 Stash List Item

Each stash item should show:

- Stash reference: `stash@{0}`
- Branch name if parsed.
- Short message.
- Number of changed files if already loaded.
- Optional warning if the stash cannot be inspected.

---

### 7.3 Stash Detail View

When the user selects a stash, show:

- Full stash reference.
- Raw stash message.
- Branch if available.
- Changed files from `--stat`.
- Diff preview from `--patch`.

The UI should avoid destructive actions in the MVP.

---

### 7.4 Diff Viewer

The initial diff viewer can be simple:

- Render raw patch with syntax-like formatting.
- Group by file.
- Highlight additions and deletions visually.
- Keep line-level clarity more important than visual polish.

A later version can use Monaco Editor or VS Code's built-in diff capabilities where applicable.

---

## 8. Technical Architecture

### 8.1 Extension Host

The VS Code extension host should handle:

- Running Git commands.
- Reading workspace folders.
- Validating whether the current workspace is a Git repository.
- Sending stash data to the Webview.
- Receiving UI events from the Webview.

Recommended language: **TypeScript**.

---

### 8.2 Webview UI

The Webview should handle:

- Rendering the React interface.
- Displaying stash list and selected stash details.
- Sending user actions to the extension host.
- Showing loading, empty, and error states.

Recommended stack:

- React.
- TypeScript.
- Vite for Webview bundling.
- CSS modules, plain CSS, Tailwind, or lightweight component styling.

Avoid overengineering UI state management at the beginning. React state or a small reducer should be enough for MVP.

---

### 8.3 Communication Between Webview and Extension Host

The Webview should use VS Code's messaging bridge:

```ts
const vscode = acquireVsCodeApi();

vscode.postMessage({
  type: "refreshStashes"
});
```

The extension host listens for messages:

```ts
panel.webview.onDidReceiveMessage(async (message) => {
  switch (message.type) {
    case "refreshStashes":
      // Run git stash list
      break;
  }
});
```

The extension host sends messages back:

```ts
panel.webview.postMessage({
  type: "stashesLoaded",
  payload: stashes
});
```

---

## 9. Suggested Folder Structure

```text
git-stash-manager/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ extension/
│  │  ├─ extension.ts
│  │  ├─ git/
│  │  │  ├─ gitService.ts
│  │  │  ├─ stashParser.ts
│  │  │  └─ diffParser.ts
│  │  ├─ webview/
│  │  │  ├─ StashManagerPanel.ts
│  │  │  └─ getWebviewHtml.ts
│  │  └─ types/
│  │     └─ stash.ts
│  └─ webview/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ components/
│     │  ├─ StashList.tsx
│     │  ├─ StashDetails.tsx
│     │  ├─ ChangedFilesList.tsx
│     │  └─ DiffViewer.tsx
│     └─ styles/
│        └─ app.css
├─ docs/
│  ├─ planning.md
│  └─ ai-spec-kit.md
└─ README.md
```

---

## 10. VS Code Integration Points

### 10.1 Command Palette

Add a command:

```json
{
  "command": "gitStashManager.open",
  "title": "Git Stash Manager: Open"
}
```

---

### 10.2 Activity Bar or Sidebar

For MVP, a command that opens a Webview panel is enough.

Later, the extension can add:

- A dedicated Activity Bar icon.
- A tree view for stashes.
- Context menu entries in Source Control.

---

### 10.3 Workspace Awareness

The extension should support:

- Single-folder workspaces.
- Multi-root workspaces later.

For MVP, it is acceptable to support the first workspace folder and show a clear message if there are multiple folders.

---

## 11. Git Execution Strategy

Recommended initial strategy: run Git through Node.js child processes.

Example:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runGit(args: string[], cwd: string) {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd });

  if (stderr) {
    // Some Git commands write non-fatal messages to stderr.
    // Handle carefully instead of failing blindly.
  }

  return stdout;
}
```

Reasons to use Git CLI initially:

- Git stash behavior is already native to Git.
- Avoids introducing heavy dependencies early.
- Easier to debug.
- Mirrors the exact commands developers already use.

---

## 12. Parsing Strategy

### 12.1 Parse `git stash list`

Input:

```text
stash@{0}: WIP on main: 123abc Example message
```

Suggested parsing:

```ts
const match = line.match(/^(stash@\{(\d+)\}):\s(.+)$/);
```

Then parse branch/message heuristically from the remaining text.

Do not assume every stash follows the same message format. Git stash messages can vary.

---

### 12.2 Parse `git stash show --stat`

Start with lightweight parsing. Preserve raw lines if parsing fails.

Important principle:

> Prefer partial structured data plus raw output over throwing away useful information.

---

### 12.3 Parse `git stash show --patch`

For MVP, rendering raw patch is acceptable.

Later, implement structured hunk parsing.

---

## 13. Safety Rules

The extension must treat stash operations carefully.

For the MVP:

- No destructive actions.
- No automatic apply/pop/drop.
- No file writing.
- No stash deletion.
- No background cleanup.

For future versions:

- `apply`, `pop`, and `drop` must require confirmation.
- `pop` and `drop` should be visually marked as risky.
- The UI must clearly explain what each action does.
- The extension should refresh the stash list after any mutation.
- The extension should handle Git errors visibly.

---

## 14. Error Handling

The extension should handle:

- No workspace open.
- Workspace is not a Git repository.
- Git executable not found.
- `git stash list` fails.
- `git stash show` fails for a selected stash.
- Empty stash list.
- Multi-root workspace ambiguity.
- Stash reference no longer exists after refresh.

Every error should be user-readable and actionable.

---

## 15. Testing Plan

### 15.1 Unit Tests

Test:

- `git stash list` parser.
- `git stash show --stat` parser.
- Diff parser if implemented.
- Git service error normalization.

### 15.2 Manual Tests

Test these scenarios:

- Repository with no stashes.
- Repository with one stash.
- Repository with multiple stashes.
- Stash containing one changed file.
- Stash containing multiple changed files.
- Stash with custom message.
- Workspace not using Git.
- No workspace open.
- Git unavailable or misconfigured.

---

## 16. Initial Development Milestones

### Milestone 1 — Extension Bootstrap

- Create VS Code extension project.
- Use TypeScript.
- Add command: `Git Stash Manager: Open`.
- Open a basic Webview panel.

### Milestone 2 — Git Service

- Implement Git command runner.
- Implement `listStashes()`.
- Implement parser for `git stash list`.

### Milestone 3 — React Webview

- Add React build pipeline.
- Render stash list.
- Add refresh button.
- Display loading and empty states.

### Milestone 4 — Stash Inspection

- Implement `getStashStat(ref)`.
- Implement `getStashPatch(ref)`.
- Display changed files and raw diff.

### Milestone 5 — UX Hardening

- Improve errors.
- Add search/filter.
- Add basic styling.
- Add README usage instructions.

---

## 17. Open Questions for Future Decisions

These questions do not block the MVP, but should be answered before expanding the extension:

1. Should the extension support applying stashes in V1?
2. Should `pop` and `drop` be included, or should the extension remain inspection-first?
3. Should the extension use VS Code's native Git extension API if available, or stay with CLI commands?
4. Should the Webview use Tailwind, plain CSS, or VS Code theme variables only?
5. Should the extension support multi-root workspaces in the first public release?
6. Should the diff viewer be custom, Monaco-based, or delegated to VS Code diff editors?
7. Should stash entries be cached, or always loaded fresh from Git?
8. Should the extension detect and label likely auto-created VS Code stashes?

---

## 18. Recommended Initial Product Positioning

Possible marketplace positioning:

> A visual Git stash inspector for VS Code that helps developers find, inspect, and understand hidden or forgotten stashes without leaving the editor.

Core value:

- Makes `git stash list` discoverable.
- Makes stash contents easier to inspect.
- Helps recover work that may have been automatically stashed during Git or VS Code workflows.
- Avoids destructive stash actions in the first version.
