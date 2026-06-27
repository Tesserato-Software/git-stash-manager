import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

/**
 * Prevents a render error in one part of the UI (e.g. a malformed diff) from
 * blanking the whole webview. Shows the error message instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Git Stash Manager] Webview render error", error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app__error" role="alert">
          Something went wrong while rendering: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
