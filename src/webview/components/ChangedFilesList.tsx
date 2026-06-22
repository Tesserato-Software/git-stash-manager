import type { GitStashChangedFile } from "../../extension/types/stash";

interface ChangedFilesListProps {
  files: GitStashChangedFile[];
}

export function ChangedFilesList({ files }: ChangedFilesListProps) {
  if (files.length === 0) {
    return <p className="muted">No changed files detected.</p>;
  }

  return (
    <ul className="files">
      {files.map((file) => (
        <li key={file.path} className="files__item">
          <span className="files__path">{file.path}</span>
          <span className="files__stats">
            {file.insertions ? (
              <span className="files__add">+{file.insertions}</span>
            ) : null}
            {file.deletions ? (
              <span className="files__del">-{file.deletions}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
