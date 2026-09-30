import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter, matchRoutes, type RouteObject } from "react-router";
import App from "./app/App.tsx";
import { isStaleChunk, reloadOnce } from "./app/components/AppError";
import { routes } from "./app/routes";
import "./styles/index.css";

// A chunk from before the last deploy is gone; load the new version instead
// of failing. The router's error screen covers a second failure.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnce()) event.preventDefault();
});

/**
 * Loads the code of the page being opened before the first render.
 *
 * The prerendered HTML was rendered with that page in place. Rendering it on
 * the client without its chunk would put a loading state where the server had
 * content, React would throw the prerendered HTML away, and the visitor would
 * see the page blink. Resolving the lazy route first keeps both identical.
 */
async function loadOpenedRoute() {
  const matches = matchRoutes(routes, window.location) ?? [];
  await Promise.all(
    matches
      .filter((m) => typeof m.route.lazy === "function")
      .map(async (m) => {
        const load = m.route.lazy as () => Promise<Partial<RouteObject>>;
        Object.assign(m.route, { ...(await load()), lazy: undefined });
      })
  );
}

async function start() {
  const rootEl = document.getElementById("root")!;
  let prerendered = rootEl.hasChildNodes();
  try {
    await loadOpenedRoute();
  } catch (err) {
    if (isStaleChunk(err) && reloadOnce()) return;
    // Let the router try again and show its error screen; there is nothing
    // left to hydrate against.
    rootEl.replaceChildren();
    prerendered = false;
  }
  const app = <App router={createBrowserRouter(routes)} />;
  if (prerendered) hydrateRoot(rootEl, app);
  else createRoot(rootEl).render(app);
}

void start();
