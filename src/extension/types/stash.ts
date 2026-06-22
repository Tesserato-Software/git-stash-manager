// Shared data types used by both the extension host and the React webview.
// Keep these simple; add complexity only when a feature requires it.

export type GitStashEntry = {
  /** Full stash reference, e.g. "stash@{0}". */
  ref: string;
  /** Numeric index parsed from the reference, e.g. 0. */
  index: number;
  /** Branch the stash was created on, when it can be parsed. */
  branch?: string;
  /** Remaining human-readable stash description. */
  message: string;
  /** Full original line from `git stash list`. */
  raw: string;
};

export type GitStashChangedFile = {
  path: string;
  insertions?: number;
  deletions?: number;
  /** Original line from `git stash show --stat`. */
  raw: string;
};

export type GitStashDetails = {
  ref: string;
  /** Raw output of `git stash show <ref> --stat`. */
  statRaw: string;
  /** Raw output of `git stash show <ref> --patch`. */
  patchRaw: string;
  /** Parsed changed files; falls back to raw lines when parsing is incomplete. */
  files: GitStashChangedFile[];
};

// Typed message contract between the webview and the extension host.

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "refreshStashes" }
  | { type: "selectStash"; ref: string };

export type ExtensionToWebviewMessage =
  | { type: "stashesLoading" }
  | { type: "stashesLoaded"; payload: GitStashEntry[] }
  | { type: "stashDetailsLoading"; ref: string }
  | { type: "stashDetailsLoaded"; payload: GitStashDetails }
  | { type: "error"; message: string };
