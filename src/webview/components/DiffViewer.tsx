import { Fragment, useMemo, useState } from "react";
import { parseUnifiedDiff } from "../../extension/git/diffParser";
import type { DiffFile, DiffLine } from "../../extension/types/stash";

interface DiffViewerProps {
  /** Raw patch from `git stash show <ref> --patch`. Parsed here for rendering. */
  patch: string;
}

type ViewMode = "split" | "unified";

// Rendering a diff builds several DOM nodes per line, so large files are
// collapsed by default and very large ones require an explicit confirmation to
// avoid freezing the webview.
const COLLAPSE_ABOVE_LINES = 400;
const REQUIRE_CONFIRM_ABOVE_LINES = 4000;

interface PairedRow {
  left?: DiffLine;
  right?: DiffLine;
}

/** Pair deletions with additions row by row for the side-by-side view. */
function toPairedRows(lines: DiffLine[]): PairedRow[] {
  const rows: PairedRow[] = [];
  let deletions: DiffLine[] = [];
  let additions: DiffLine[] = [];

  const flush = () => {
    const count = Math.max(deletions.length, additions.length);
    for (let i = 0; i < count; i++) {
      rows.push({ left: deletions[i], right: additions[i] });
    }
    deletions = [];
    additions = [];
  };

  for (const line of lines) {
    if (line.type === "deletion") {
      deletions.push(line);
    } else if (line.type === "addition") {
      additions.push(line);
    } else {
      flush();
      rows.push({ left: line, right: line });
    }
  }
  flush();
  return rows;
}

function fileLabel(file: DiffFile): string {
  const { oldPath, newPath } = file;
  if (oldPath && newPath && oldPath !== newPath) {
    return `${oldPath} → ${newPath}`;
  }
  return newPath ?? oldPath ?? "(unknown file)";
}

function fileStats(file: DiffFile): { added: number; removed: number; lines: number } {
  let added = 0;
  let removed = 0;
  let lines = 0;
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      lines++;
      if (line.type === "addition") {
        added++;
      } else if (line.type === "deletion") {
        removed++;
      }
    }
  }
  return { added, removed, lines };
}

function cellClass(line?: DiffLine): string {
  if (!line) {
    return "diff__cell diff__cell--empty";
  }
  return `diff__cell diff__cell--${line.type}`;
}

function sign(type: DiffLine["type"]): string {
  if (type === "addition") return "+";
  if (type === "deletion") return "-";
  return " ";
}

function UnifiedBody({ file }: { file: DiffFile }) {
  return (
    <div className="diff__scroll">
      <table className="diff__table">
        <tbody>
          {file.hunks.map((hunk, hunkIndex) => (
            <Fragment key={hunkIndex}>
              <tr className="diff__hunk-heading">
                <td colSpan={3}>{hunk.header}</td>
              </tr>
              {hunk.lines.map((line, lineIndex) => (
                <tr key={lineIndex} className={`diff__line-row diff__line-row--${line.type}`}>
                  <td className="diff__gutter">{line.oldLine ?? ""}</td>
                  <td className="diff__gutter">{line.newLine ?? ""}</td>
                  <td className="diff__code">
                    <span className="diff__sign">{sign(line.type)}</span>
                    {line.content}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SplitBody({ file }: { file: DiffFile }) {
  return (
    <div className="diff__scroll">
      <table className="diff__table">
        <tbody>
          {file.hunks.map((hunk, hunkIndex) => (
            <Fragment key={hunkIndex}>
              <tr className="diff__hunk-heading">
                <td colSpan={4}>{hunk.header}</td>
              </tr>
              {toPairedRows(hunk.lines).map((row, rowIndex) => (
                <tr key={rowIndex} className="diff__row">
                  <td className="diff__gutter">{row.left?.oldLine ?? ""}</td>
                  <td className={cellClass(row.left)}>
                    <span className="diff__sign">
                      {row.left?.type === "deletion" ? "-" : " "}
                    </span>
                    {row.left?.content ?? ""}
                  </td>
                  <td className="diff__gutter">{row.right?.newLine ?? ""}</td>
                  <td className={cellClass(row.right)}>
                    <span className="diff__sign">
                      {row.right?.type === "addition" ? "+" : " "}
                    </span>
                    {row.right?.content ?? ""}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileBlock({ file, mode }: { file: DiffFile; mode: ViewMode }) {
  const stats = useMemo(() => fileStats(file), [file]);
  const [expanded, setExpanded] = useState(stats.lines <= COLLAPSE_ABOVE_LINES);
  const [confirmed, setConfirmed] = useState(false);

  const needsConfirm = stats.lines > REQUIRE_CONFIRM_ABOVE_LINES;

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
              This file is large ({stats.lines.toLocaleString()} lines). Rendering it
              may be slow.
            </p>
            <button className="button" onClick={() => setConfirmed(true)}>
              Render anyway
            </button>
          </div>
        ) : mode === "split" ? (
          <SplitBody file={file} />
        ) : (
          <UnifiedBody file={file} />
        ))}
    </div>
  );
}

export function DiffViewer({ patch }: DiffViewerProps) {
  const [mode, setMode] = useState<ViewMode>("split");
  const parsed = useMemo(() => parseUnifiedDiff(patch), [patch]);

  if (parsed.files.length === 0) {
    if (patch.trim() === "") {
      return null;
    }
    return (
      <div className="diff">
        <h3 className="details__heading">Diff preview</h3>
        <p className="muted">No textual changes to display.</p>
      </div>
    );
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
            className={`toggle__btn${mode === "unified" ? " toggle__btn--active" : ""}`}
            onClick={() => setMode("unified")}
          >
            Unified
          </button>
        </div>
      </div>
      <div className="diff__files">
        {parsed.files.map((file, index) => (
          <FileBlock key={index} file={file} mode={mode} />
        ))}
      </div>
    </div>
  );
}
