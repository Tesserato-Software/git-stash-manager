import type { GitStashEntry } from "../../extension/types/stash";

interface StashListProps {
  stashes: GitStashEntry[];
  totalCount: number;
  loading: boolean;
  selectedRef?: string;
  onSelect: (ref: string) => void;
}

export function StashList({
  stashes,
  totalCount,
  loading,
  selectedRef,
  onSelect
}: StashListProps) {
  if (loading) {
    return <p className="muted">Loading stashes…</p>;
  }

  if (totalCount === 0) {
    return (
      <div className="empty">
        <p>No stashes found in this repository.</p>
        <p className="muted">
          Stashes you create with <code>git stash</code> will appear here.
        </p>
      </div>
    );
  }

  if (stashes.length === 0) {
    return <p className="muted">No stashes match the current filter.</p>;
  }

  return (
    <ul className="stash-list">
      {stashes.map((stash) => (
        <li key={stash.ref}>
          <button
            className={`stash-item${stash.ref === selectedRef ? " stash-item--active" : ""}`}
            onClick={() => onSelect(stash.ref)}
          >
            <span className="stash-item__ref">{stash.ref}</span>
            {stash.branch && (
              <span className="stash-item__branch">{stash.branch}</span>
            )}
            <span className="stash-item__message">
              {stash.message || <em className="muted">(no message)</em>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
