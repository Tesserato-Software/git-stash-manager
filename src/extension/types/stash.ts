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
  /** Structured diff parsed from `patchRaw`, ready for side-by-side rendering. */
  diff: ParsedDiff;
};

// Structured diff types used to render a side-by-side (split) view.

export type DiffCellType = "context" | "addition" | "deletion";

export type DiffCell = {
  /** 1-based line number within the old (left) or new (right) file. */
  lineNumber: number;
  type: DiffCellType;
  content: string;
};

/**
 * One aligned row of a split diff. A deletion sits on the left, an addition on
 * the right; context lines fill both sides. Either side may be absent when the
 * change adds or removes more lines than the other side has.
 */
export type SplitDiffRow = {
  left?: DiffCell;
  right?: DiffCell;
};

export type DiffHunk = {
  /** Full `@@ ... @@` header line. */
  header: string;
  /** Optional section heading Git appends after the `@@` markers. */
  heading: string;
  rows: SplitDiffRow[];
};

export type DiffFile = {
  oldPath?: string;
  newPath?: string;
  isBinary?: boolean;
  hunks: DiffHunk[];
};

export type ParsedDiff = {
  files: DiffFile[];
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
