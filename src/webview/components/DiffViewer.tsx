import { useMemo, useState } from "react";
import type {
  DiffCell,
  DiffFile,
  ParsedDiff,
  SplitDiffRow
} from "../../extension/types/stash";

interface DiffViewerProps {
  diff?: ParsedDiff;
  /** Raw patch, used for the fallback "Raw" view. */
  patch: string;
}

type ViewMode = "split" | "raw";

// Rendering a split diff builds several DOM nodes per line, so large files are
// collapsed by default and very large ones require an explicit confirmation to
// avoid freezing the webview.
const COLLAPSE_ABOVE_ROWS = 400;
const REQUIRE_CONFIRM_ABOVE_ROWS = 4000;

function fileLabel(file: DiffFile): string {
  const { oldPath, newPath } = file;
  if (oldPath && newPath && oldPath !== newPath) {
    return `${oldPath} → ${newPath}`;
  }
  return newPath ?? oldPath ?? "(unknown file)";
}

function fileStats(file: DiffFile): { added: number; removed: number; rows: number } {
  let added = 0;
  let removed = 0;
  let rows = 0;
  for (const hunk of file.hunks) {
    rows += hunk.rows.length;
    for (const row of hunk.rows) {
      if (row.left?.type === "deletion") {
        removed++;
      }
      if (row.right?.type === "addition") {
        added++;
      }
    }
  }
  return { added, removed, rows };
}

function cellClass(cell?: DiffCell): string {
  if (!cell) {
    return "diff__cell diff__cell--empty";
  }
  return `diff__cell diff__cell--${cell.type}`;
}

function SplitRow({ row }: { row: SplitDiffRow }) {
  return (
    <tr className="diff__row">
      <td className="diff__gutter">{row.left?.lineNumber ?? ""}</td>
      <td className={cellClass(row.left)}>
        <span className="diff__sign">{row.left?.type === "deletion" ? "-" : " "}</span>
        {row.left?.content ?? ""}
      </td>
      <td className="diff__gutter">{row.right?.lineNumber ?? ""}</td>
      <td className={cellClass(row.right)}>
        <span className="diff__sign">{row.right?.type === "addition" ? "+" : " "}</span>
        {row.right?.content ?? ""}
      </td>
    </tr>
  );
}

function Hunk({ heading, rows }: { heading: string; rows: SplitDiffRow[] }) {
  return (
    <>
      <tr className="diff__hunk-heading">
        <td colSpan={4}>{heading || "…"}</td>
      </tr>
      {rows.map((row, index) => (
        <SplitRow key={index} row={row} />
      ))}
    </>
  );
}

function FileBlock({ file }: { file: DiffFile }) {
  const stats = useMemo(() => fileStats(file), [file]);
  const [expanded, setExpanded] = useState(stats.rows <= COLLAPSE_ABOVE_ROWS);
  const [confirmed, setConfirmed] = useState(false);

  const needsConfirm = stats.rows > REQUIRE_CONFIRM_ABOVE_ROWS;

  return (
    <div className="diff__file">
      <button
        className="diff__file-header"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="diff__chevron">{expanded ? "▾" : "▸"}</span>
        <span className="diff__file-path">{fileLabel(file)}</span>
        {file.isBinary && <span className="diff__badge">binary</span>}
        <span className="diff__file-stats">
          {stats.added > 0 && <span className="files__add">+{stats.added}</span>}
          {stats.removed > 0 && <span className="files__del">-{stats.removed}</span>}
        </span>
      </button>

      {expanded &&
        (file.isBinary ? (
          <p className="muted diff__binary">Binary file — no text diff to show.</p>
        ) : needsConfirm && !confirmed ? (
          <div className="diff__large">
            <p className="muted">
              This file is large ({stats.rows.toLocaleString()} lines). Rendering it
              side by side may be slow.
            </p>
            <button className="button" onClick={() => setConfirmed(true)}>
              Render anyway
            </button>
          </div>
        ) : (
          <div className="diff__scroll">
            <table className="diff__table">
              <tbody>
                {file.hunks.map((hunk, index) => (
                  <Hunk key={index} heading={hunk.heading} rows={hunk.rows} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

function SplitDiff({ files }: { files: DiffFile[] }) {
  if (files.length === 0) {
    return <p className="muted">No textual changes to display.</p>;
  }
  return (
    <div className="diff__files">
      {files.map((file, index) => (
        <FileBlock key={index} file={file} />
      ))}
    </div>
  );
}

function RawDiff({ patch }: { patch: string }) {
  const lines = patch.replace(/\n+$/, "").split("\n");
  const classify = (line: string): string => {
    if (line.startsWith("@@")) return "hunk";
    if (/^(diff |index |--- |\+\+\+ )/.test(line)) return "meta";
    if (line.startsWith("+")) return "addition";
    if (line.startsWith("-")) return "deletion";
    return "context";
  };
  return (
    <pre className="diff__raw">
      {lines.map((line, index) => (
        <div key={index} className={`diff__line diff__line--${classify(line)}`}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

export function DiffViewer({ diff, patch }: DiffViewerProps) {
  const [mode, setMode] = useState<ViewMode>("split");
  const files = diff?.files ?? [];

  if (files.length === 0 && patch.trim() === "") {
    return null;
  }

  return (
    <div className="diff">
      <div className="diff__toolbar">
        <h3 className="details__heading">Diff preview</h3>
        <div className="toggle" role="group" aria-label="Diff view mode">
          <button
            className={`toggle__btn${mode === "split" ? " toggle__btn--active" : ""}`}
            onClick={() => setMode("split")}
          >
            Split
          </button>
          <button
            className={`toggle__btn${mode === "raw" ? " toggle__btn--active" : ""}`}
            onClick={() => setMode("raw")}
          >
            Raw
          </button>
        </div>
      </div>
      {mode === "split" ? <SplitDiff files={files} /> : <RawDiff patch={patch} />}
    </div>
  );
}
