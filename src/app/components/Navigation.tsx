import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { PdcLogo } from "./PdcLogo";
import { useLanguage } from "../context/LanguageContext";
import { scrollToTop } from "../lib/scroll";

// Link colours, hover and active states live in src/styles/site.css
// (.pdc-nav-*), so keyboard focus and touch get the same treatment as a mouse.

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const servicesButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!servicesOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [servicesOpen]);

  // Every navigation closes whatever menu led to it.
  useEffect(() => {
    setMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  }, [location.key]);

  // Opening the phone menu moves focus into it.
  useEffect(() => {
    if (menuOpen) mobileMenu.current?.querySelector<HTMLElement>("a, button")?.focus();
  }, [menuOpen]);

  const isServicesPage = location.pathname.startsWith("/services/");

  const SERVICES = [
    { label: t.nav.automotive, path: "/services/automotive" },
    { label: t.nav.socialMedia, path: "/services/social-media" },
  ];

  function closeServices(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    setServicesOpen(false);
    servicesButton.current?.focus();
  }

  function closeMobileMenu(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    setMenuOpen(false);
    menuButton.current?.focus();
  }

  return (
    <nav
      aria-label={t.nav.label}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: scrolled ? "rgba(14, 8, 2, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,251,224,0.08)" : "none",
        transition: "background-color 0.4s ease, border-bottom 0.4s ease",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo: home, or back to the top when already there */}
        <Link
          to="/"
          aria-label={t.nav.home}
          onClick={() => {
            if (location.pathname === "/") scrollToTop();
          }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <PdcLogo artboard width={200} height={80} style={{ display: "block", color: "#fffbe0" }} />
        </Link>

        {/* Desktop Nav */}
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "40px" }}
        >
          <Link to="/#work" className="pdc-nav-link">
            {t.nav.work}
          </Link>

          {/* Services dropdown */}
          <div
            ref={servicesRef}
            style={{ position: "relative" }}
            onKeyDown={closeServices}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setServicesOpen(false);
            }}
          >
            <button
              ref={servicesButton}
              type="button"
              className={`pdc-nav-link${isServicesPage ? " is-active" : ""}`}
              aria-expanded={servicesOpen}
              aria-controls="pdc-services-menu"
              onClick={() => setServicesOpen((o) => !o)}
            >
              {t.nav.services}
              <Chevron open={servicesOpen} />
            </button>

            {servicesOpen && (
              <div
                id="pdc-services-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 16px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "rgba(10, 5, 1, 0.97)",
                  border: "1px solid rgba(255,251,224,0.1)",
                  backdropFilter: "blur(12px)",
                  minWidth: "180px",
                  padding: "8px 0",
                }}
              >
                {SERVICES.map((s) => (
                  <NavLink key={s.path} to={s.path} className="pdc-nav-sublink">
                    {s.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/portfolio" end className="pdc-nav-link">
            {t.nav.portfolio}
          </NavLink>
          <NavLink to="/about" className="pdc-nav-link">
            {t.nav.about}
          </NavLink>

          {/* Client Portal link */}
          <Link to="/portal/login" className="pdc-nav-link pdc-nav-quiet">
            {t.nav.clientPortal}
          </Link>

          <Link to="/#contact" className="pdc-nav-cta">
            {t.nav.bookShoot}
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          ref={menuButton}
          type="button"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "4px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                display: "block",
                width: "24px",
                height: "1px",
                backgroundColor: "#fffbe0",
                transition: "transform 0.3s ease",
                transformOrigin: "center",
                transform:
                  menuOpen && i === 0
                    ? "rotate(45deg) translate(4px, 4px)"
                    : menuOpen && i === 1
                    ? "scaleX(0)"
                    : menuOpen && i === 2
                    ? "rotate(-45deg) translate(4px, -4px)"
                    : "none",
              }}
            />
          ))}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          ref={mobileMenu}
          onKeyDown={closeMobileMenu}
          style={{
            backgroundColor: "rgba(10, 5, 1, 0.98)",
            borderTop: "1px solid rgba(255,251,224,0.08)",
            padding: "28px 20px 36px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <Link to="/#work" className="pdc-nav-mobile">
            {t.nav.work}
          </Link>

          {/* Mobile Services accordion */}
          <div>
            <button
              type="button"
              className="pdc-nav-mobile"
              aria-expanded={mobileServicesOpen}
              aria-controls="pdc-mobile-services"
              onClick={() => setMobileServicesOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}
            >
              {t.nav.services}
              <Chevron open={mobileServicesOpen} />
            </button>
            {mobileServicesOpen && (
              <div id="pdc-mobile-services" style={{ paddingLeft: "16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {SERVICES.map((s) => (
                  <NavLink key={s.path} to={s.path} className="pdc-nav-mobile pdc-nav-mobile-sub">
                    {s.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/portfolio" end className="pdc-nav-mobile">
            {t.nav.portfolio}
          </NavLink>
          <NavLink to="/about" className="pdc-nav-mobile">
            {t.nav.about}
          </NavLink>

          {/* Mobile Client Portal link */}
          <Link to="/portal/login" className="pdc-nav-mobile pdc-nav-quiet">
            {t.nav.clientPortal}
          </Link>

          <Link to="/#contact" className="pdc-nav-cta pdc-nav-cta-block">
            {t.nav.bookShoot}
          </Link>
        </div>
      )}
    </nav>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="none"
      style={{
        transition: "transform 0.2s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
