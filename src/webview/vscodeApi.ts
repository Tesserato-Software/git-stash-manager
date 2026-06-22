import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage
} from "../extension/types/stash";

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

// `acquireVsCodeApi` may only be called once per webview session.
export const vscode: VsCodeApi = acquireVsCodeApi();

export function postMessage(message: WebviewToExtensionMessage): void {
  vscode.postMessage(message);
}

/** Subscribe to messages from the extension host. Returns an unsubscribe fn. */
export function onMessage(
  handler: (message: ExtensionToWebviewMessage) => void
): () => void {
  const listener = (event: MessageEvent<ExtensionToWebviewMessage>) =>
    handler(event.data);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
