import * as vscode from "vscode";
import {
  GitError,
  applyStash,
  getStashDetails,
  isGitRepository,
  listStashes,
  popStash
} from "../git/gitService";
import type {
  ExtensionToWebviewMessage,
  StashActionKind,
  WebviewToExtensionMessage
} from "../types/stash";
import { getWebviewHtml } from "./getWebviewHtml";

/**
 * Owns the single Git Stash Manager webview panel. Runs Git on the extension
 * host, parses output, and exchanges typed messages with the React UI.
 */
export class StashManagerPanel {
  static readonly viewType = "gitStashManager.panel";
  private static current: StashManagerPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];

  static show(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (StashManagerPanel.current) {
      StashManagerPanel.current.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      StashManagerPanel.viewType,
      "Git Stash Manager",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist", "webview")]
      }
    );

    StashManagerPanel.current = new StashManagerPanel(panel, extensionUri);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this.panel.webview.html = getWebviewHtml(this.panel.webview, extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.handleMessage(message),
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), undefined, this.disposables);
  }

  private post(message: ExtensionToWebviewMessage): void {
    void this.panel.webview.postMessage(message);
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
      case "refreshStashes":
        await this.refreshStashes();
        break;
      case "selectStash":
        await this.loadStashDetails(message.ref);
        break;
      case "applyStash":
        await this.runStashAction(message.ref, "apply");
        break;
      case "popStash":
        await this.runStashAction(message.ref, "pop");
        break;
    }
  }

  /** Resolve the workspace folder Git should run in, or report why it can't. */
  private resolveCwd(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this.post({
        type: "error",
        message: "No workspace folder is open. Open a Git repository to inspect its stashes."
      });
      return undefined;
    }
    if (folders.length > 1) {
      // MVP: operate on the first folder and make that explicit.
      this.post({
        type: "error",
        message: `Multiple workspace folders detected. Using "${folders[0].name}" for now.`
      });
    }
    return folders[0].uri.fsPath;
  }

  private async refreshStashes(): Promise<void> {
    const cwd = this.resolveCwd();
    if (!cwd) {
      return;
    }

    this.post({ type: "stashesLoading" });
    try {
      if (!(await isGitRepository(cwd))) {
        this.post({
          type: "error",
          message: "The current workspace folder is not a Git repository."
        });
        return;
      }
      const stashes = await listStashes(cwd);
      this.post({ type: "stashesLoaded", payload: stashes });
    } catch (error) {
      this.reportError(error);
    }
  }

  private async loadStashDetails(ref: string): Promise<void> {
    const cwd = this.resolveCwd();
    if (!cwd) {
      return;
    }

    this.post({ type: "stashDetailsLoading", ref });
    try {
      const details = await getStashDetails(ref, cwd);
      this.post({ type: "stashDetailsLoaded", payload: details });
    } catch (error) {
      this.reportError(error);
    }
  }

  /**
   * Apply (or pop) a stash after an explicit, modal confirmation. This is the
   * first mutating action the extension performs, so the guardrail matters: the
   * user must confirm, and conflicts are surfaced without being treated as
   * failures.
   */
  private async runStashAction(ref: string, action: StashActionKind): Promise<void> {
    const cwd = this.resolveCwd();
    if (!cwd) {
      return;
    }

    const verb = action === "pop" ? "Pop" : "Apply";
    const detail =
      action === "pop"
        ? `This applies the changes from ${ref} onto your working tree and removes the stash once it applies cleanly.`
        : `This merges the changes from ${ref} into your working tree. The stash is kept.`;
    const confirmed = await vscode.window.showWarningMessage(
      `${verb} ${ref}?`,
      { modal: true, detail },
      verb
    );
    if (confirmed !== verb) {
      return; // User dismissed the dialog: do nothing.
    }

    this.post({ type: "stashActionRunning", ref, action });
    try {
      const result = action === "pop" ? await popStash(ref, cwd) : await applyStash(ref, cwd);
      this.post({ type: "stashActionResult", result });

      if (result.outcome === "conflict") {
        void vscode.window.showWarningMessage(
          `${verb} of ${ref} produced merge conflicts. Resolve them in your working tree.` +
            (action === "pop" ? " The stash was kept." : "")
        );
      } else {
        void vscode.window.showInformationMessage(
          action === "pop" ? `Popped ${ref}.` : `Applied ${ref}.`
        );
      }

      // The working tree changed, and a successful pop removes the stash, so the
      // list is now stale — reload it.
      await this.refreshStashes();
    } catch (error) {
      // The webview clears its busy state when it receives the error message.
      this.reportError(error);
    }
  }

  private reportError(error: unknown): void {
    if (error instanceof GitError) {
      if (error.details) {
        console.error(`[Git Stash Manager] ${error.message}\n${error.details}`);
      }
      this.post({ type: "error", message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Git Stash Manager] Unexpected error", error);
    this.post({ type: "error", message: `Unexpected error: ${message}` });
  }

  private dispose(): void {
    StashManagerPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}
