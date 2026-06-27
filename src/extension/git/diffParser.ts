import type { DiffCell, DiffFile, DiffHunk, ParsedDiff, SplitDiffRow } from "../types/stash";

// Parse a unified diff (as produced by `git stash show <ref> --patch`) into a
// structured, side-by-side friendly shape. Deletions are paired with additions
// row by row so the webview can render old and new versions aligned.

const DIFF_GIT = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;

function stripPathPrefix(path: string): string {
  return path.replace(/^[ab]\//, "").replace(/\t.*$/, "");
}

export function parseUnifiedDiff(patch: string): ParsedDiff {
  const files: DiffFile[] = [];
  let file: DiffFile | undefined;
  let hunk: DiffHunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  let pendingDeletions: DiffCell[] = [];
  let pendingAdditions: DiffCell[] = [];

  /** Emit buffered deletions/additions as aligned rows, padding the shorter side. */
  const flushPending = () => {
    if (!hunk) {
      return;
    }
    const count = Math.max(pendingDeletions.length, pendingAdditions.length);
    for (let i = 0; i < count; i++) {
      const row: SplitDiffRow = {};
      if (pendingDeletions[i]) {
        row.left = pendingDeletions[i];
      }
      if (pendingAdditions[i]) {
        row.right = pendingAdditions[i];
      }
      hunk.rows.push(row);
    }
    pendingDeletions = [];
    pendingAdditions = [];
  };

  for (const line of patch.split(/\r?\n/)) {
    // Genuine blank context lines are encoded as a single space; a zero-length
    // line is only the trailing element after the final newline (or padding in
    // an empty patch), so it carries no diff content.
    if (line === "") {
      continue;
    }

    if (line.startsWith("diff --git")) {
      flushPending();
      hunk = undefined;
      file = { hunks: [] };
      files.push(file);
      const match = line.match(DIFF_GIT);
      if (match) {
        file.oldPath = match[1];
        file.newPath = match[2];
      }
      continue;
    }

    // A patch may not start with "diff --git" (e.g. a single-file diff).
    if (!file) {
      file = { hunks: [] };
      files.push(file);
    }

    if (line.startsWith("--- ")) {
      const path = line.slice(4);
      file.oldPath = path === "/dev/null" ? undefined : stripPathPrefix(path);
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = line.slice(4);
      file.newPath = path === "/dev/null" ? undefined : stripPathPrefix(path);
      continue;
    }
    if (line.startsWith("Binary files")) {
      file.isBinary = true;
      continue;
    }

    if (line.startsWith("@@")) {
      flushPending();
      const match = line.match(HUNK_HEADER);
      oldLine = match ? Number.parseInt(match[1], 10) : 0;
      newLine = match ? Number.parseInt(match[2], 10) : 0;
      hunk = { header: line, heading: match ? match[3].trim() : "", rows: [] };
      file.hunks.push(hunk);
      continue;
    }

    // Outside a hunk these are metadata lines (index, file mode, etc.).
    if (!hunk) {
      continue;
    }

    // "\ No newline at end of file" carries no content to display.
    if (line.startsWith("\\")) {
      continue;
    }

    const marker = line[0];
    const content = line.slice(1);
    if (marker === "+") {
      pendingAdditions.push({ lineNumber: newLine++, type: "addition", content });
    } else if (marker === "-") {
      pendingDeletions.push({ lineNumber: oldLine++, type: "deletion", content });
    } else {
      // Context line (leading space) — flush pending changes first to keep order.
      flushPending();
      hunk.rows.push({
        left: { lineNumber: oldLine++, type: "context", content },
        right: { lineNumber: newLine++, type: "context", content }
      });
    }
  }

  flushPending();
  return { files };
}
