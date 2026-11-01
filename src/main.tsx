import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProvider } from "./store";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

console.log("[chordly-renderer] main.tsx: starting");

const root = document.getElementById("root");

if (!root) {
  console.error("[chordly-renderer] main.tsx: no root element found");
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <AppProvider>
            <App />
          </AppProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log("[chordly-renderer] main.tsx: render initialized");
  } catch (error) {
    console.error("[chordly-renderer] main.tsx: render error", error);
  }
}
