import type { GitStashChangedFile, GitStashEntry } from "../types/stash";

// Parsers are intentionally forgiving: Git stash messages vary, so we prefer
// returning partial structured data (plus the raw line) over throwing away
// information or failing the whole parse.

const STASH_LINE = /^(stash@\{(\d+)\}):\s?(.*)$/;

/**
 * Parse the output of `git stash list`.
 *
 * Example line:
 *   stash@{0}: WIP on main: 123abc Example message
 *   stash@{1}: On feature/login: temporary auth work
 */
export function parseStashList(output: string): GitStashEntry[] {
  const entries: GitStashEntry[] = [];

  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      continue;
    }

    const match = line.match(STASH_LINE);
    if (!match) {
      // Unexpected format: keep the line visible rather than discarding it.
      entries.push({
        ref: line,
        index: entries.length,
        message: line,
        raw: line
      });
      continue;
    }

    const ref = match[1];
    const index = Number.parseInt(match[2], 10);
    const description = match[3] ?? "";
    const { branch, message } = parseDescription(description);

    entries.push({ ref, index, branch, message, raw: line });
  }

  return entries;
}

/**
 * Split a stash description into an optional branch and a message.
 *
 * Common shapes produced by Git:
 *   "WIP on main: 123abc message"   -> branch "main"
 *   "On feature/login: message"     -> branch "feature/login"
 *   "custom message"                -> no branch
 */
function parseDescription(description: string): { branch?: string; message: string } {
  const branchMatch = description.match(/^(?:WIP on|On)\s+([^:]+):\s?(.*)$/);
  if (branchMatch) {
    return { branch: branchMatch[1].trim(), message: branchMatch[2].trim() };
  }
  return { message: description.trim() };
}

const STAT_FILE_LINE = /^(.+?)\s+\|\s+(\d+|Bin)\s*(.*)$/;

/**
 * Parse the file portion of `git stash show <ref> --stat`.
 *
 * Example lines:
 *   src/App.tsx       | 12 ++++++++----
 *   src/utils/git.ts  | 30 ++++++++++++++++++++++++++++++
 *   2 files changed, 38 insertions(+), 4 deletions(-)
 *
 * The trailing summary line is ignored here (it is preserved in `statRaw`).
 */
export function parseStashStat(output: string): GitStashChangedFile[] {
  const files: GitStashChangedFile[] = [];

  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      continue;
    }

    // Skip the summary line, e.g. "2 files changed, 38 insertions(+), ...".
    if (/^\s*\d+\s+files?\s+changed/.test(line)) {
      continue;
    }

    const match = line.match(STAT_FILE_LINE);
    if (!match) {
      continue;
    }

    const path = match[1].trim();
    const symbols = match[3] ?? "";
    const insertions = (symbols.match(/\+/g) ?? []).length;
    const deletions = (symbols.match(/-/g) ?? []).length;

    files.push({
      path,
      insertions: insertions || undefined,
      deletions: deletions || undefined,
      raw: line
    });
  }

  return files;
}

/** A stash reference must look exactly like `stash@{N}` before reaching Git. */
export function isValidStashRef(ref: string): boolean {
  return /^stash@\{\d+\}$/.test(ref);
}
