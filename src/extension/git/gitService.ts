import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitStashDetails, GitStashEntry } from "../types/stash";
import { parseUnifiedDiff } from "./diffParser";
import { isValidStashRef, parseStashList, parseStashStat } from "./stashParser";

const execFileAsync = promisify(execFile);

/** Raised for Git failures so the host can surface a clean, user-facing message. */
export class GitError extends Error {
  constructor(
    message: string,
    readonly details?: string
  ) {
    super(message);
    this.name = "GitError";
  }
}

/**
 * Run a Git command via execFile (no shell), with arguments passed as an array.
 * Never interpolate user input into a shell string.
 */
async function runGit(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === "ENOENT") {
      throw new GitError(
        "Git executable not found. Make sure Git is installed and available on your PATH."
      );
    }
    const stderr = typeof err.stderr === "string" ? err.stderr.trim() : "";
    throw new GitError(
      `Git command failed: git ${args.join(" ")}`,
      stderr || err.message
    );
  }
}

/** Check whether `cwd` is inside a Git working tree. */
export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    const out = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    return out.trim() === "true";
  } catch {
    return false;
  }
}

/** List all stashes in the repository at `cwd`. */
export async function listStashes(cwd: string): Promise<GitStashEntry[]> {
  const output = await runGit(["stash", "list"], cwd);
  return parseStashList(output);
}

/** Load the stat summary and full patch for a single stash. */
export async function getStashDetails(ref: string, cwd: string): Promise<GitStashDetails> {
  if (!isValidStashRef(ref)) {
    throw new GitError(`Invalid stash reference: ${ref}`);
  }

  const statRaw = await runGit(["stash", "show", ref, "--stat"], cwd);
  const patchRaw = await runGit(["stash", "show", ref, "--patch"], cwd);

  return {
    ref,
    statRaw,
    patchRaw,
    files: parseStashStat(statRaw),
    diff: parseUnifiedDiff(patchRaw)
  };
}
