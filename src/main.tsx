import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { reloadOnce } from "./app/components/AppError";
import "./styles/index.css";

// A chunk from before the last deploy is gone; load the new version instead
// of failing. The router's error screen covers a second failure.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnce()) event.preventDefault();
});

const rootEl = document.getElementById("root")!;

// Hydrate prerendered HTML (react-snap), otherwise do a normal render
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, <App />);
} else {
  createRoot(rootEl).render(<App />);
}
