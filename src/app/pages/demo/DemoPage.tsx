import { Suspense, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { portalFetch, supabase } from "../../../lib/supabase";
import { findDemo } from "../../demos/registry";

type State =
  | { phase: "loading" }
  | { phase: "live" }
  | { phase: "preview" }
  | { phase: "offline" };

/**
 * Renders a demo that lives inside this site, at /demo/<slug>.
 *
 * A visitor only ever sees a demo the admin has switched on. When it is off,
 * a signed-in admin still gets it — with a bar saying so — because that is the
 * only way to look a demo over before handing it to the client.
 */
export function DemoPage() {
  const { slug } = useParams();
  const demo = findDemo(slug);
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!demo) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await portalFetch(`/demo/${demo.slug}`);
        if (cancelled) return;
        if (data.live) {
          setState({ phase: "live" });
          return;
        }
      } catch {
        // Falls through to the admin check; a visitor lands on "offline".
      }

      // Switched off. An admin signed in on this browser may still look.
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (token) {
          await portalFetch(`/admin/demo/${demo.slug}`, {}, token);
          if (!cancelled) setState({ phase: "preview" });
          return;
        }
      } catch {
        // Not an admin, or the check failed: treat it as offline.
      }
      if (!cancelled) setState({ phase: "offline" });
    })();

    return () => {
      cancelled = true;
    };
  }, [demo]);

  if (!demo || state.phase === "offline") return <DemoUnavailable />;
  if (state.phase === "loading") return <DemoLoading />;

  const { Component } = demo;
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {state.phase === "preview" && <PreviewBar name={demo.name} />}
      <Suspense fallback={<DemoLoading />}>
        <Component />
      </Suspense>
    </>
  );
}

function PreviewBar({ name }: { name: string }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 999,
        background: "#c8905a", color: "#1a1512",
        font: "600 12px/1 'Inter', system-ui, sans-serif",
        letterSpacing: "0.06em", padding: "10px 16px", textAlign: "center",
      }}
    >
      Deze demo staat offline — alleen jij ziet hem. {name}
    </div>
  );
}

function DemoLoading() {
  return (
    <div style={shell}>
      <span style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 11 }}>
        Laden…
      </span>
    </div>
  );
}

function DemoUnavailable() {
  return (
    <div style={shell}>
      <Helmet>
        <title>Demo niet beschikbaar</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{ textAlign: "center", maxWidth: "36ch" }}>
        <p style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 10, opacity: 0.5, margin: "0 0 14px" }}>
          PhotoDeCaffeine
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Deze demo staat nu niet online
        </h1>
        <p style={{ opacity: 0.6, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Vraag het even na bij PhotoDeCaffeine, dan wordt hij weer aangezet.
        </p>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0f0f0e",
  color: "#ece8e2",
  fontFamily: "'Inter', system-ui, sans-serif",
  padding: "40px 20px",
};
