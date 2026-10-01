import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

const RELOAD_KEY = "pdc-reloaded-at";

// After a deploy, an open tab still asks for the old hashed chunks, which no
// longer exist; the host answers with index.html and the import fails. A plain
// reload fixes that, so it happens once on its own before this screen shows.
export function isStaleChunk(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|MIME type|Loading chunk|ChunkLoadError|error loading dynamically/i.test(text);
}

export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // No storage: reload anyway, the screen below stops a loop on a second failure.
  }
  window.location.reload();
  return true;
}

export function AppError() {
  const error = useRouteError();
  const stale = isStaleChunk(error);
  const english = typeof navigator !== "undefined" && !navigator.language?.toLowerCase().startsWith("nl");

  useEffect(() => {
    if (stale) reloadOnce();
    else console.error(error);
  }, [stale, error]);

  const t = english
    ? {
        title: stale ? "There's a new version" : "Something went wrong",
        body: stale ? "The site was updated while this page was open. Refresh to load the latest version." : "This page ran into a problem. Refreshing usually fixes it.",
        refresh: "Refresh",
        home: "Go to home",
      }
    : {
        title: stale ? "Er staat een nieuwe versie klaar" : "Er ging iets mis",
        body: stale ? "De site is bijgewerkt terwijl deze pagina openstond. Ververs om de nieuwste versie te laden." : "Deze pagina liep vast. Verversen lost het meestal op.",
        refresh: "Verversen",
        home: "Naar home",
      };

  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : "";

  return (
    <main style={styles.page}>
      <div style={styles.box}>
        <div style={styles.icon}><RefreshCw size={30} strokeWidth={1.5} /></div>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.body}>{t.body}</p>
        <div style={styles.row}>
          <button type="button" style={styles.primary} onClick={() => window.location.reload()}>{t.refresh}</button>
          <a href="/" style={styles.secondary}>{t.home}</a>
        </div>
        {!stale && detail && <p style={styles.detail}>{detail}</p>}
      </div>
    </main>
  );
}

const font = "'Inter', system-ui, -apple-system, sans-serif";
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#080401", color: "#fffbe0", fontFamily: font },
  box: { maxWidth: 420, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  icon: { width: 104, height: 104, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#120a04", border: "1px solid rgba(200,149,92,0.15)", color: "#c8955c", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0 },
  body: { fontSize: 15, lineHeight: 1.6, color: "rgba(255,251,224,0.65)", margin: 0 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 },
  primary: { background: "#c8955c", color: "#080401", border: 0, padding: "12px 24px", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: font },
  secondary: { border: "1px solid rgba(255,251,224,0.2)", color: "#fffbe0", padding: "12px 24px", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" },
  detail: { fontSize: 12, color: "rgba(255,251,224,0.55)", margin: "8px 0 0", wordBreak: "break-word" },
};
