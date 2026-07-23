import type { GitStashDetails, StashActionKind } from "../../extension/types/stash";
import { ChangedFilesList } from "./ChangedFilesList";

interface StashDetailsProps {
  stashRef?: string;
  details?: GitStashDetails;
  loading: boolean;
  /** The action currently running against this stash, if any. */
  busyAction?: StashActionKind;
  onApply: (ref: string) => void;
  onPop: (ref: string) => void;
}

export function StashDetails({
  stashRef,
  details,
  loading,
  busyAction,
  onApply,
  onPop
}: StashDetailsProps) {
  if (!stashRef) {
    return (
      <p className="muted">Select a stash to inspect its changed files and diff.</p>
    );
  }

  if (loading) {
    return <p className="muted">Loading {stashRef}…</p>;
  }

  if (!details) {
    return <p className="muted">No details available for {stashRef}.</p>;
  }

  const busy = busyAction !== undefined;

  return (
    <div className="details">
      <div className="details__header">
        <h2 className="details__ref">{details.ref}</h2>
        <div className="details__actions">
          <button
            className="button"
            disabled={busy}
            onClick={() => onApply(details.ref)}
            title="Apply these changes to your working tree and keep the stash"
          >
            {busyAction === "apply" ? "Applying…" : "Apply"}
          </button>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => onPop(details.ref)}
            title="Apply these changes and remove the stash if it applies cleanly"
          >
            {busyAction === "pop" ? "Popping…" : "Pop"}
          </button>
        </div>
      </div>
      <p className="muted details__hint">
        Apply keeps the stash; Pop removes it once it applies cleanly. You'll be
        asked to confirm.
      </p>
      <h3 className="details__heading">Changed files</h3>
      <ChangedFilesList files={details.files} />
    </div>
  );
}
