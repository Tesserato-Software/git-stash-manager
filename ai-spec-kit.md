# AI Spec Kit — Git Stash Manager for VS Code

## 1. Purpose of This Spec Kit

This document gives instructions and constraints for any AI agent, coding assistant, or automated tool that works on the Git Stash Manager VS Code extension.

The project is currently in early planning. The first implementation should stay focused, small, and safe.

---

## 2. Project Summary

Build a **VS Code extension** that acts as a visual manager and inspector for Git stashes.

The extension should help users discover and inspect stashes created manually or indirectly by Git/VS Code workflows.

The core command-line workflow being converted into UI is:

```bash
git stash list
git stash show stash@{N} --stat
git stash show stash@{N} --patch
```

---

## 3. Current Scope

The initial version should be read-only.

Allowed MVP features:

- List Git stashes.
- Inspect stash metadata.
- Show changed files.
- Show stash diff.
- Refresh stash list.
- Display clear empty/error states.
- Use React inside a VS Code Webview.

Do not add stash mutation features unless explicitly requested.

---

## 4. Hard Constraints

AI agents must follow these constraints:

1. The project must remain a **VS Code extension**.
2. The main implementation language should be **TypeScript**.
3. React may be used only inside the VS Code Webview.
4. Git integration should initially use Git CLI commands through Node.js child processes.
5. The MVP must not perform destructive Git actions.
6. The MVP must not call `git stash pop`, `git stash drop`, or similar mutation commands.
7. The extension must not modify user files during stash inspection.
8. The UI should prioritize clarity and safety over visual complexity.
9. Parsing should preserve raw Git output when structured parsing is incomplete.
10. Any risky feature must require explicit confirmation before implementation.

---

## 5. Preferred Architecture

Use this conceptual split:

```text
VS Code Extension Host
  - Owns VS Code APIs
  - Runs Git commands
  - Parses Git output
  - Sends structured data to Webview

React Webview
  - Renders UI
  - Displays stash list
  - Displays changed files
  - Displays diff output
  - Sends user actions back to extension host
```

Do not run Git commands from the Webview.

---

## 6. Recommended Folder Boundaries

Suggested structure:

```text
src/
├─ extension/
│  ├─ extension.ts
│  ├─ git/
│  │  ├─ gitService.ts
│  │  ├─ stashParser.ts
│  │  └─ diffParser.ts
│  ├─ webview/
│  │  ├─ StashManagerPanel.ts
│  │  └─ getWebviewHtml.ts
│  └─ types/
│     └─ stash.ts
└─ webview/
   ├─ main.tsx
   ├─ App.tsx
   ├─ components/
   └─ styles/
```

Keep extension-host logic and Webview UI logic separate.

---

## 7. Git Command Rules

Use these commands first:

```bash
git stash list
git stash show stash@{N} --stat
git stash show stash@{N} --patch
```

When implementing command execution:

- Use `execFile`, not shell string interpolation.
- Pass Git arguments as an array.
- Set `cwd` to the workspace folder.
- Never execute user-provided raw shell commands.
- Validate stash references before passing them to Git.
- Treat `stderr` carefully because Git can write non-fatal messages there.

Example direction:

```ts
execFile("git", ["stash", "list"], { cwd });
execFile("git", ["stash", "show", "stash@{0}", "--stat"], { cwd });
execFile("git", ["stash", "show", "stash@{0}", "--patch"], { cwd });
```

---

## 8. Data Types to Prefer

Use explicit shared types between the extension host and Webview.

Suggested types:

```ts
export type GitStashEntry = {
  ref: string;
  index: number;
  branch?: string;
  message: string;
  raw: string;
};

export type GitStashChangedFile = {
  path: string;
  insertions?: number;
  deletions?: number;
  raw: string;
};

export type GitStashDetails = {
  ref: string;
  statRaw: string;
  patchRaw: string;
  files: GitStashChangedFile[];
};
```

Prefer simple types first. Add complexity only when needed.

---

## 9. UI Principles

The UI should:

- Make stashes easy to scan.
- Show `stash@{N}` clearly.
- Show the branch and message when available.
- Let the user select a stash and inspect its contents.
- Show changed files before showing full diff.
- Use clear loading, empty, and error states.
- Avoid presenting dangerous actions in the MVP.

Recommended UI sections:

```text
Header
  - Title
  - Refresh action
  - Search/filter later

Stash List
  - stash@{N}
  - branch
  - message

Details Panel
  - selected stash metadata
  - changed files
  - diff preview
```

---

## 10. Safety and Destructive Actions

For now, do not implement:

```bash
git stash apply
git stash pop
git stash drop
git stash clear
```

These may be added later only with:

- Explicit user request.
- Confirmation modal.
- Clear explanation of consequences.
- Error handling.
- Automatic refresh after completion.

`pop`, `drop`, and `clear` should be treated as high-risk actions.

---

## 11. Error Handling Requirements

Agents should implement clear handling for:

- No workspace open.
- Workspace is not a Git repository.
- Git not installed.
- Git command failure.
- Empty stash list.
- Selected stash no longer exists.
- Unexpected Git output format.
- Multi-root workspace ambiguity.

Do not expose raw stack traces directly to the user. Provide concise messages and optionally include technical details in logs.

---

## 12. Testing Guidance

Prioritize tests for parser logic.

Required test areas:

- Parse standard `git stash list` output.
- Parse custom stash messages.
- Parse empty stash list.
- Parse `git stash show --stat` output.
- Preserve raw lines when parsing fails.
- Normalize Git command errors.

Manual test repositories should include:

- No stashes.
- One stash.
- Three or more stashes.
- Stash with multiple files.
- Stash with custom message.
- Non-Git folder.

---

## 13. AI Agent Workflow

When an AI agent works on this repository, it should:

1. Read this spec kit first.
2. Read the planning document.
3. Identify whether the requested change affects:
   - Extension host
   - Git service
   - Parser
   - Webview UI
   - Shared types
4. Keep the change small and scoped.
5. Avoid introducing advanced stash actions unless requested.
6. Preserve existing safety behavior.
7. Add or update tests when parser or Git behavior changes.
8. Update Markdown docs when product behavior changes.

---

## 14. Implementation Style

Prefer:

- TypeScript.
- Small modules.
- Explicit types.
- Pure parser functions.
- Clear message names for Webview communication.
- Minimal dependencies.
- VS Code theme variables for styling where possible.

Avoid:

- Large global state.
- Shell command string concatenation.
- Unvalidated command arguments.
- Destructive Git commands.
- Overly complex UI frameworks.
- Unnecessary backend servers.
- Standalone app assumptions.

---

## 15. Message Contract Between Webview and Extension Host

Use typed message contracts.

Example:

```ts
type WebviewToExtensionMessage =
  | { type: "refreshStashes" }
  | { type: "selectStash"; ref: string };

type ExtensionToWebviewMessage =
  | { type: "stashesLoading" }
  | { type: "stashesLoaded"; payload: GitStashEntry[] }
  | { type: "stashDetailsLoaded"; payload: GitStashDetails }
  | { type: "error"; message: string };
```

Keep message names stable and descriptive.

---

## 16. Documentation Rules

When changing behavior, update at least one of:

- `README.md`
- `docs/planning.md`
- `docs/ai-spec-kit.md`

Documentation should explain behavior in practical terms, not just implementation terms.

---

## 17. Initial Definition of Done

The MVP can be considered complete when:

- The extension opens from the Command Palette.
- It detects the current workspace.
- It runs `git stash list`.
- It displays available stashes.
- It shows a useful empty state when there are no stashes.
- It allows selecting a stash.
- It displays changed files from `git stash show --stat`.
- It displays diff text from `git stash show --patch`.
- It handles common Git errors gracefully.
- It does not mutate Git state.
