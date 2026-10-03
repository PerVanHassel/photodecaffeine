import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../context/LanguageContext";

/**
 * A booking button pinned to the bottom of the screen on phones, where the
 * menu's own button sits behind the hamburger. It steps aside while the form
 * it points to is on screen, and on the homepage until the hero, which has its
 * own buttons, has scrolled away. Hidden from tablets up by CSS.
 */
export function StickyCta() {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  // Service pages book through their own form; everything else through the contact form.
  const target =
    pathname === "/services/automotive"
      ? { id: "boeken", to: `${pathname}#boeken`, label: t.nav.bookShoot }
      : pathname === "/services/social-media"
        ? { id: "boeken", to: `${pathname}#boeken`, label: t.socialMediaPage.requestLabel }
        : { id: "contact", to: "/#contact", label: t.nav.bookShoot };
  const isHome = pathname === "/";

  const [formInView, setFormInView] = useState(false);
  const [pastHero, setPastHero] = useState(!isHome);

  useEffect(() => {
    setFormInView(false);
    const el = document.getElementById(target.id);
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting), { rootMargin: "0px 0px -15% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target.id, pathname]);

  useEffect(() => {
    if (!isHome) {
      setPastHero(true);
      return;
    }
    const update = () => setPastHero(window.scrollY > window.innerHeight * 0.6);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [isHome]);

  const shown = pastHero && !formInView;

  return (
    <>
      <div className="pdc-sticky-cta" data-shown={shown} aria-hidden={!shown}>
        <Link to={target.to} className="pdc-nav-cta pdc-sticky-cta-button" tabIndex={shown ? undefined : -1}>
          {target.label}
        </Link>
      </div>
      {/* Room at the end of the page, so the bar never covers the footer. */}
      <div className="pdc-sticky-cta-spacer" aria-hidden="true" />
    </>
  );
}
