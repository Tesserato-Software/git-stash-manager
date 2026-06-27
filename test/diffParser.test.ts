import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUnifiedDiff } from "../src/extension/git/diffParser";

const SAMPLE = `diff --git a/src/App.tsx b/src/App.tsx
index 1111111..2222222 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,4 +1,4 @@ export function App() {
 const a = 1;
-const b = 2;
+const b = 3;
 const c = 4;
`;

test("parses a file path and a single hunk", () => {
  const diff = parseUnifiedDiff(SAMPLE);
  assert.equal(diff.files.length, 1);
  const file = diff.files[0];
  assert.equal(file.oldPath, "src/App.tsx");
  assert.equal(file.newPath, "src/App.tsx");
  assert.equal(file.hunks.length, 1);
  assert.equal(file.hunks[0].heading, "export function App() {");
});

test("pairs a deletion with an addition on the same row", () => {
  const diff = parseUnifiedDiff(SAMPLE);
  const rows = diff.files[0].hunks[0].rows;

  // context, paired change, context
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].left, { lineNumber: 1, type: "context", content: "const a = 1;" });
  assert.equal(rows[1].left?.type, "deletion");
  assert.equal(rows[1].left?.content, "const b = 2;");
  assert.equal(rows[1].right?.type, "addition");
  assert.equal(rows[1].right?.content, "const b = 3;");
  assert.equal(rows[2].right?.lineNumber, 3);
});

test("pads the shorter side when additions and deletions differ in count", () => {
  const patch = `diff --git a/f.txt b/f.txt
--- a/f.txt
+++ b/f.txt
@@ -1,1 +1,3 @@
-old
+new one
+new two
+new three
`;
  const rows = parseUnifiedDiff(patch).files[0].hunks[0].rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[0].left?.content, "old");
  assert.equal(rows[0].right?.content, "new one");
  assert.equal(rows[1].left, undefined);
  assert.equal(rows[1].right?.content, "new two");
  assert.equal(rows[2].left, undefined);
  assert.equal(rows[2].right?.content, "new three");
});

test("tracks old and new line numbers independently", () => {
  const rows = parseUnifiedDiff(SAMPLE).files[0].hunks[0].rows;
  assert.equal(rows[1].left?.lineNumber, 2);
  assert.equal(rows[1].right?.lineNumber, 2);
});

test("marks added and removed files via /dev/null", () => {
  const patch = `diff --git a/new.txt b/new.txt
new file mode 100644
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,1 @@
+hello
`;
  const file = parseUnifiedDiff(patch).files[0];
  assert.equal(file.oldPath, undefined);
  assert.equal(file.newPath, "new.txt");
  assert.equal(file.hunks[0].rows[0].right?.content, "hello");
});

test("flags binary files", () => {
  const patch = `diff --git a/img.png b/img.png
index 1111111..2222222 100644
Binary files a/img.png and b/img.png differ
`;
  const file = parseUnifiedDiff(patch).files[0];
  assert.equal(file.isBinary, true);
  assert.equal(file.hunks.length, 0);
});

test("returns no files for an empty patch", () => {
  assert.deepEqual(parseUnifiedDiff(""), { files: [] });
});
