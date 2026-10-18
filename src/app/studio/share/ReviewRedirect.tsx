import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router";
import { GoogleG } from "../../components/GoogleG";
import { GOOGLE_REVIEW_URL } from "../../lib/google";
import { post } from "../api";
import { StudioFonts } from "../fonts";
import { useT } from "../portal/i18n";
import "../studio.css";

// The link in the review mail, /review/<token>. Lets the studio see the mail
// was opened, then hands over to Google's review form. When the server is slow
// or the token unknown, the client still ends up at the form.

const opened = new Set<string>();

export function ReviewRedirectPage() {
  const { token = "" } = useParams();
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const go = (to: string) => {
      if (done) return;
      done = true;
      setUrl(to);
      window.location.replace(to);
    };
    const timer = window.setTimeout(() => go(GOOGLE_REVIEW_URL), 4000);
    // Counted once, also when React runs this twice in development.
    if (!opened.has(token)) {
      opened.add(token);
      post<{ url: string }>("/review/open", { token })
        .then((r) => go(r.url || GOOGLE_REVIEW_URL))
        .catch(() => go(GOOGLE_REVIEW_URL));
    }
    return () => window.clearTimeout(timer);
  }, [token]);

  return (
    <div className="studio" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Helmet>
        <title>{t.toGoogleTitle}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <StudioFonts />
      <div className="s-stack" style={{ alignItems: "center", textAlign: "center", maxWidth: 360 }} role="status">
        <GoogleG size={40} />
        <p style={{ fontSize: 16 }}>{t.toGoogle}</p>
        <a className="s-btn" href={url || GOOGLE_REVIEW_URL}>{t.toGoogleManual}</a>
      </div>
    </div>
  );
}
