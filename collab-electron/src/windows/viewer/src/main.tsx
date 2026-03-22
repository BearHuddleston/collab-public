import { createRoot } from "react-dom/client";
import { initDarkMode } from "@collab/shared/dark-mode";
import "./styles/Theme.css";
import "@collab/components/Markdown/MarkdownContent.css";
import { AnalyticsProvider } from "../../shared/PostHogProvider";

// BlockNote captures console.warn during module initialization, so install the
// filter before dynamically importing the editor-heavy viewer tree.
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].startsWith("linkifyjs:")) {
    return;
  }
  originalWarn(...args);
};

async function bootstrap(): Promise<void> {
  const { default: App } = await import("./App");

  initDarkMode();

  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root element");

  // BlockNote currently triggers React 19 dev-mode flushSync warnings under
  // StrictMode, so keep the viewer outside StrictMode until the dependency is fixed.
  createRoot(root).render(
    <AnalyticsProvider>
      <App />
    </AnalyticsProvider>,
  );
}

void bootstrap();
