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

test("keeps lines in order with old/new line numbers", () => {
  const lines = parseUnifiedDiff(SAMPLE).files[0].hunks[0].lines;

  assert.deepEqual(
    lines.map((l) => l.type),
    ["context", "deletion", "addition", "context"]
  );
  assert.deepEqual(lines[0], {
    type: "context",
    content: "const a = 1;",
    oldLine: 1,
    newLine: 1
  });
  assert.equal(lines[1].type, "deletion");
  assert.equal(lines[1].oldLine, 2);
  assert.equal(lines[1].newLine, undefined);
  assert.equal(lines[2].type, "addition");
  assert.equal(lines[2].newLine, 2);
  assert.equal(lines[2].oldLine, undefined);
  assert.equal(lines[3].oldLine, 3);
  assert.equal(lines[3].newLine, 3);
});

test("handles additions and deletions of differing counts", () => {
  const patch = `diff --git a/f.txt b/f.txt
--- a/f.txt
+++ b/f.txt
@@ -1,1 +1,3 @@
-old
+new one
+new two
+new three
`;
  const lines = parseUnifiedDiff(patch).files[0].hunks[0].lines;
  assert.deepEqual(
    lines.map((l) => l.type),
    ["deletion", "addition", "addition", "addition"]
  );
  assert.equal(lines[3].content, "new three");
  assert.equal(lines[3].newLine, 3);
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
  assert.equal(file.hunks[0].lines[0].content, "hello");
  assert.equal(file.hunks[0].lines[0].newLine, 1);
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

test("parses multiple files in one patch", () => {
  const patch = `${SAMPLE}diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
-x
+y
`;
  const diff = parseUnifiedDiff(patch);
  assert.equal(diff.files.length, 2);
  assert.equal(diff.files[1].newPath, "b.ts");
});

test("returns no files for an empty patch", () => {
  assert.deepEqual(parseUnifiedDiff(""), { files: [] });
});
