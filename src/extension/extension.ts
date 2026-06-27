import * as vscode from "vscode";
import { StashManagerPanel } from "./webview/StashManagerPanel";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("gitStashManager.open", () => {
      StashManagerPanel.show(context.extensionUri);
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up: the panel disposes its own resources.
}
