import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMergeConflictOutput,
  isValidStashRef,
  parseStashList,
  parseStashStat
} from "../src/extension/git/stashParser";

test("parses standard stash list output", () => {
  const output = [
    "stash@{0}: WIP on main: 123abc Initial commit message",
    "stash@{1}: On feature/login: temporary auth work"
  ].join("\n");

  const entries = parseStashList(output);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], {
    ref: "stash@{0}",
    index: 0,
    branch: "main",
    message: "123abc Initial commit message",
    raw: "stash@{0}: WIP on main: 123abc Initial commit message"
  });
  assert.equal(entries[1].branch, "feature/login");
  assert.equal(entries[1].message, "temporary auth work");
});

test("handles a custom stash message without a branch prefix", () => {
  const entries = parseStashList("stash@{0}: my custom snapshot");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].branch, undefined);
  assert.equal(entries[0].message, "my custom snapshot");
});

test("returns an empty array for empty output", () => {
  assert.deepEqual(parseStashList(""), []);
  assert.deepEqual(parseStashList("\n\n"), []);
});

test("preserves unexpected lines instead of discarding them", () => {
  const entries = parseStashList("something unexpected");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].raw, "something unexpected");
  assert.equal(entries[0].message, "something unexpected");
});

test("parses --stat file lines with insertion/deletion counts", () => {
  const output = [
    " src/App.tsx       | 12 ++++++++----",
    " src/utils/git.ts  | 30 ++++++++++++++++++++++++++++++",
    " 2 files changed, 38 insertions(+), 4 deletions(-)"
  ].join("\n");

  const files = parseStashStat(output);

  assert.equal(files.length, 2);
  assert.equal(files[0].path, "src/App.tsx");
  assert.equal(files[0].insertions, 8);
  assert.equal(files[0].deletions, 4);
  assert.equal(files[1].path, "src/utils/git.ts");
  assert.equal(files[1].deletions, undefined);
});

test("ignores the summary line in --stat output", () => {
  const files = parseStashStat("1 file changed, 2 insertions(+)");
  assert.deepEqual(files, []);
});

test("validates stash references", () => {
  assert.ok(isValidStashRef("stash@{0}"));
  assert.ok(isValidStashRef("stash@{12}"));
  assert.ok(!isValidStashRef("stash@{0}; rm -rf /"));
  assert.ok(!isValidStashRef("HEAD"));
});

test("detects merge-conflict output from apply/pop", () => {
  const conflict = [
    "Auto-merging src/App.tsx",
    "CONFLICT (content): Merge conflict in src/App.tsx"
  ].join("\n");
  assert.ok(isMergeConflictOutput(conflict));
  assert.ok(isMergeConflictOutput("Merge conflict in file.txt"));
});

test("does not treat a clean or blocked apply as a conflict", () => {
  assert.ok(!isMergeConflictOutput("Changes were applied to the working tree."));
  // A genuine blocker: nothing was applied, so it must not read as a conflict.
  const blocked =
    "error: Your local changes to the following files would be overwritten by merge:\n\tsrc/App.tsx\nAborting";
  assert.ok(!isMergeConflictOutput(blocked));
});
