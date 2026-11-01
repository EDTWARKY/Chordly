import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Chordly Renderer Crash]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 select-text">
          <h1 className="text-2xl font-bold mb-3 tracking-tight">Chordly UI Encountered an Error</h1>
          <p className="text-sm text-neutral-400 mb-4 max-w-lg text-center">
            A component failed to render. You can reset local state or review the error stack below.
          </p>
          <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-red-300 max-w-3xl overflow-auto mb-5 w-full max-h-[300px]">
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              className="px-5 py-2.5 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition border border-white/15"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
            >
              Reset Cache & Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
