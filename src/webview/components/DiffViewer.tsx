interface DiffViewerProps {
  patch: string;
}

type LineType = "addition" | "deletion" | "meta" | "hunk" | "context";

function classify(line: string): LineType {
  if (line.startsWith("diff ") || line.startsWith("index ") ||
      line.startsWith("--- ") || line.startsWith("+++ ")) {
    return "meta";
  }
  if (line.startsWith("@@")) {
    return "hunk";
  }
  if (line.startsWith("+")) {
    return "addition";
  }
  if (line.startsWith("-")) {
    return "deletion";
  }
  return "context";
}

/**
 * Minimal raw-patch viewer. Lines are classified for color only; the raw text
 * is preserved exactly so nothing is lost when structured parsing is skipped.
 */
export function DiffViewer({ patch }: DiffViewerProps) {
  const trimmed = patch.replace(/\n+$/, "");
  if (trimmed.trim() === "") {
    return null;
  }

  const lines = trimmed.split("\n");

  return (
    <div className="diff">
      <h3 className="details__heading">Diff preview</h3>
      <pre className="diff__body">
        {lines.map((line, index) => (
          <div key={index} className={`diff__line diff__line--${classify(line)}`}>
            {line || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}
