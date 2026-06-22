import type { GitStashDetails } from "../../extension/types/stash";
import { ChangedFilesList } from "./ChangedFilesList";

interface StashDetailsProps {
  stashRef?: string;
  details?: GitStashDetails;
  loading: boolean;
}

export function StashDetails({ stashRef, details, loading }: StashDetailsProps) {
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

  return (
    <div className="details">
      <h2 className="details__ref">{details.ref}</h2>
      <h3 className="details__heading">Changed files</h3>
      <ChangedFilesList files={details.files} />
    </div>
  );
}
