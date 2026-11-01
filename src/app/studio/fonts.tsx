import { Helmet } from "react-helmet-async";

/** Geist and Geist Mono, for the admin and the portal. */
export function StudioFonts() {
  return (
    <Helmet>
      <link rel="stylesheet" href="/fonts/geist.css" />
    </Helmet>
  );
}
