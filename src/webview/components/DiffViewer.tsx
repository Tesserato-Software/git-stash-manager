import { useState } from "react";
import type {
  DiffCell,
  DiffFile,
  ParsedDiff,
  SplitDiffRow
} from "../../extension/types/stash";

interface DiffViewerProps {
  diff: ParsedDiff;
  /** Raw patch, used for the fallback "Raw" view. */
  patch: string;
}

type ViewMode = "split" | "raw";

function fileLabel(file: DiffFile): string {
  const { oldPath, newPath } = file;
  if (oldPath && newPath && oldPath !== newPath) {
    return `${oldPath} → ${newPath}`;
  }
  return newPath ?? oldPath ?? "(unknown file)";
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

function SplitDiff({ diff }: { diff: ParsedDiff }) {
  return (
    <div className="diff__files">
      {diff.files.map((file, fileIndex) => (
        <div key={fileIndex} className="diff__file">
          <div className="diff__file-header">
            <span className="diff__file-path">{fileLabel(file)}</span>
            {file.isBinary && <span className="diff__badge">binary</span>}
          </div>
          {file.isBinary ? (
            <p className="muted diff__binary">Binary file — no text diff to show.</p>
          ) : (
            <div className="diff__scroll">
              <table className="diff__table">
                <tbody>
                  {file.hunks.map((hunk, hunkIndex) => (
                    <Hunk key={hunkIndex} heading={hunk.heading} rows={hunk.rows} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
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

  if (diff.files.length === 0 && patch.trim() === "") {
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
      {mode === "split" ? <SplitDiff diff={diff} /> : <RawDiff patch={patch} />}
    </div>
  );
}
