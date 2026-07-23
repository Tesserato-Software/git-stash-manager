import { useEffect, useMemo, useState } from "react";
import type {
  ExtensionToWebviewMessage,
  GitStashDetails,
  GitStashEntry,
  StashActionKind
} from "../extension/types/stash";
import { DiffViewer } from "./components/DiffViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StashDetails } from "./components/StashDetails";
import { StashList } from "./components/StashList";
import { onMessage, postMessage } from "./vscodeApi";

export function App() {
  const [stashes, setStashes] = useState<GitStashEntry[]>([]);
  const [stashesLoading, setStashesLoading] = useState(true);
  const [selectedRef, setSelectedRef] = useState<string | undefined>();
  const [details, setDetails] = useState<GitStashDetails | undefined>();
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [filter, setFilter] = useState("");
  const [busyAction, setBusyAction] = useState<
    { ref: string; action: StashActionKind } | undefined
  >();

  useEffect(() => {
    const unsubscribe = onMessage((message: ExtensionToWebviewMessage) => {
      switch (message.type) {
        case "stashesLoading":
          setStashesLoading(true);
          setError(undefined);
          break;
        case "stashesLoaded":
          setStashes(message.payload);
          setStashesLoading(false);
          break;
        case "stashDetailsLoading":
          setSelectedRef(message.ref);
          setDetails(undefined);
          setDetailsLoading(true);
          break;
        case "stashDetailsLoaded":
          setDetails(message.payload);
          setDetailsLoading(false);
          break;
        case "stashActionRunning":
          setBusyAction({ ref: message.ref, action: message.action });
          setError(undefined);
          break;
        case "stashActionResult":
          setBusyAction(undefined);
          // A successful pop removes the stash, so its details no longer exist.
          if (message.result.action === "pop" && message.result.outcome === "applied") {
            setSelectedRef(undefined);
            setDetails(undefined);
          }
          break;
        case "error":
          setError(message.message);
          setStashesLoading(false);
          setDetailsLoading(false);
          setBusyAction(undefined);
          break;
      }
    });

    postMessage({ type: "ready" });
    return unsubscribe;
  }, []);

  const handleRefresh = () => {
    setSelectedRef(undefined);
    setDetails(undefined);
    postMessage({ type: "refreshStashes" });
  };

  const handleSelect = (ref: string) => {
    postMessage({ type: "selectStash", ref });
  };

  const handleApply = (ref: string) => {
    postMessage({ type: "applyStash", ref });
  };

  const handlePop = (ref: string) => {
    postMessage({ type: "popStash", ref });
  };

  const filteredStashes = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return stashes;
    }
    return stashes.filter((stash) =>
      [stash.ref, stash.branch ?? "", stash.message]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [stashes, filter]);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Git Stash Manager</h1>
        <div className="app__actions">
          <input
            className="app__search"
            type="search"
            placeholder="Filter stashes…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter stashes"
          />
          <button className="button" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="app__error" role="alert">{error}</div>}

      <div className="app__body">
        <section className="app__pane app__pane--list">
          <StashList
            stashes={filteredStashes}
            totalCount={stashes.length}
            loading={stashesLoading}
            selectedRef={selectedRef}
            onSelect={handleSelect}
          />
        </section>
        <section className="app__pane app__pane--details">
          <ErrorBoundary>
            <StashDetails
              stashRef={selectedRef}
              details={details}
              loading={detailsLoading}
              busyAction={
                busyAction && busyAction.ref === selectedRef ? busyAction.action : undefined
              }
              onApply={handleApply}
              onPop={handlePop}
            />
            {details && <DiffViewer patch={details.patchRaw} />}
          </ErrorBoundary>
        </section>
      </div>
    </div>
  );
}
