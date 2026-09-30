import { Outlet } from "react-router";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { useLanguage } from "./context/LanguageContext";
import { usePageScroll } from "./lib/scroll";

export function Root() {
  const { t } = useLanguage();
  usePageScroll();

  return (
    <>
      <a
        href="#main"
        className="pdc-skip-link"
        onClick={(e) => {
          // Move focus past the menu without adding #main to the address.
          e.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        {t.nav.skipToContent}
      </a>
      <Navigation />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
