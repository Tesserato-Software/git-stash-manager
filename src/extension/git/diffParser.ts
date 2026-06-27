import type { DiffFile, DiffHunk, ParsedDiff } from "../types/stash";

// Parse a unified diff (as produced by `git stash show <ref> --patch`) into a
// structured shape. Lines are kept in their original order, each tagged with
// its old/new line numbers, so the webview can render either a unified or a
// side-by-side view from the same data.

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

  for (const line of patch.split(/\r?\n/)) {
    // Genuine blank context lines are encoded as a single space; a zero-length
    // line is only the trailing element after the final newline.
    if (line === "") {
      continue;
    }

    if (line.startsWith("diff --git")) {
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
      const match = line.match(HUNK_HEADER);
      oldLine = match ? Number.parseInt(match[1], 10) : 0;
      newLine = match ? Number.parseInt(match[2], 10) : 0;
      hunk = { header: line, heading: match ? match[3].trim() : "", lines: [] };
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
      hunk.lines.push({ type: "addition", content, newLine: newLine++ });
    } else if (marker === "-") {
      hunk.lines.push({ type: "deletion", content, oldLine: oldLine++ });
    } else {
      hunk.lines.push({
        type: "context",
        content,
        oldLine: oldLine++,
        newLine: newLine++
      });
    }
  }

  return { files };
}
