import image_PDClogo2_0_12_1 from '@/imports/PDClogo2.0-12-1.png'
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import type { Language } from "../i18n/translations";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPortfolioPage = location.pathname === "/portfolio";
  const isAboutPage = location.pathname === "/about";
  const isAutomotivePage = location.pathname === "/services/automotive";
  const isSubPage = isPortfolioPage || isAboutPage || isAutomotivePage;

  const SERVICES = [
    { label: "Automotive", path: "/services/automotive" },
  ];

  const scrollLinkKeys = [
    { key: "work", id: "work", label: t.nav.work },
  ];

  const handleScrollLink = (id: string) => {
    setMenuOpen(false);
    if (isSubPage) {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(id.toLowerCase());
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      const el = document.getElementById(id.toLowerCase());
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePortfolioLink = () => {
    setMenuOpen(false);
    navigate("/portfolio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAboutLink = () => {
    setMenuOpen(false);
    navigate("/about");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
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
        {/* Logo */}
        <div
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img
            src={image_PDClogo2_0_12_1}
            alt="Photo De Caffeine"
            style={{
              height: "80px",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Desktop Nav */}
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "40px" }}
        >
          {scrollLinkKeys.map((link) => (
            <button
              key={link.key}
              onClick={() => handleScrollLink(link.id)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,251,224,0.55)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "color 0.2s ease",
                padding: 0,
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "#fffbe0")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color =
                  "rgba(255,251,224,0.55)")
              }
            >
              {link.label}
            </button>
          ))}

          {/* Services dropdown */}
          <div ref={servicesRef} style={{ position: "relative" }}>
            <button
              onClick={() => setServicesOpen((o) => !o)}
              style={{
                background: "none",
                border: "none",
                color: isAutomotivePage ? "#fffbe0" : "rgba(255,251,224,0.55)",
                fontSize: "10px",
                fontWeight: isAutomotivePage ? 600 : 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "color 0.2s ease",
                padding: 0,
                fontFamily: "'Inter', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#fffbe0")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = isAutomotivePage
                  ? "#fffbe0"
                  : "rgba(255,251,224,0.55)")
              }
            >
              {t.nav.services}
              <svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="none"
                style={{
                  transition: "transform 0.2s ease",
                  transform: servicesOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <path
                  d="M1 1L4 4L7 1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {servicesOpen && (
              <div
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
                  <button
                    key={s.path}
                    onClick={() => {
                      setServicesOpen(false);
                      navigate(s.path);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: location.pathname === s.path ? "#fffbe0" : "rgba(255,251,224,0.6)",
                      fontSize: "10px",
                      fontWeight: location.pathname === s.path ? 600 : 500,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      padding: "12px 24px",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      transition: "color 0.2s ease, background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fffbe0";
                      e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = location.pathname === s.path ? "#fffbe0" : "rgba(255,251,224,0.6)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handlePortfolioLink}
            style={{
              background: "none",
              border: "none",
              color: isPortfolioPage ? "#fffbe0" : "rgba(255,251,224,0.55)",
              fontSize: "10px",
              fontWeight: isPortfolioPage ? 600 : 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "#fffbe0")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = isPortfolioPage
                ? "#fffbe0"
                : "rgba(255,251,224,0.55)")
            }
          >
            {t.nav.portfolio}
          </button>
          <button
            onClick={handleAboutLink}
            style={{
              background: "none",
              border: "none",
              color: isAboutPage ? "#fffbe0" : "rgba(255,251,224,0.55)",
              fontSize: "10px",
              fontWeight: isAboutPage ? 600 : 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "#fffbe0")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = isAboutPage
                ? "#fffbe0"
                : "rgba(255,251,224,0.55)")
            }
          >
            {t.nav.about}
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher language={language} setLanguage={setLanguage} />

          {/* Client Portal link */}
          <button
            onClick={() => navigate("/portal/login")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.35)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "rgba(255,251,224,0.75)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "rgba(255,251,224,0.35)")
            }
          >
            Client Portal
          </button>

          <button
            onClick={() => handleScrollLink("contact")}
            style={{
              background: "none",
              border: "1px solid rgba(255,251,224,0.3)",
              color: "#fffbe0",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "10px 22px",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = "#fffbe0";
              el.style.color = "#1a0c04";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = "transparent";
              el.style.color = "#fffbe0";
            }}
          >
            {t.nav.bookShoot}
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
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
              style={{
                display: "block",
                width: "24px",
                height: "1px",
                backgroundColor: "#fffbe0",
                transition: "all 0.3s ease",
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
          style={{
            backgroundColor: "rgba(10, 5, 1, 0.98)",
            borderTop: "1px solid rgba(255,251,224,0.08)",
            padding: "28px 20px 36px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {scrollLinkKeys.map((link) => (
            <button
              key={link.key}
              onClick={() => handleScrollLink(link.id)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,251,224,0.7)",
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                padding: 0,
              }}
            >
              {link.label}
            </button>
          ))}

          {/* Mobile Services accordion */}
          <div>
            <button
              onClick={() => setMobileServicesOpen((o) => !o)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,251,224,0.7)",
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
              }}
            >
              {t.nav.services}
              <svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="none"
                style={{
                  transition: "transform 0.2s ease",
                  transform: mobileServicesOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <path
                  d="M1 1L4 4L7 1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {mobileServicesOpen && (
              <div style={{ paddingLeft: "16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {SERVICES.map((s) => (
                  <button
                    key={s.path}
                    onClick={() => {
                      setMenuOpen(false);
                      setMobileServicesOpen(false);
                      navigate(s.path);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: location.pathname === s.path ? "#fffbe0" : "rgba(255,251,224,0.5)",
                      fontSize: "12px",
                      fontWeight: 500,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      padding: 0,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handlePortfolioLink}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.7)",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
            }}
          >
            {t.nav.portfolio}
          </button>
          <button
            onClick={handleAboutLink}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.7)",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
            }}
          >
            {t.nav.about}
          </button>

          {/* Mobile language switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>

          {/* Mobile Client Portal link */}
          <button
            onClick={() => { setMenuOpen(false); navigate("/portal/login"); }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.4)",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
            }}
          >
            Client Portal
          </button>

          <button
            onClick={() => handleScrollLink("contact")}
            style={{
              background: "none",
              border: "1px solid rgba(255,251,224,0.3)",
              color: "#fffbe0",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "13px 22px",
              fontFamily: "'Inter', sans-serif",
              alignSelf: "flex-start",
              width: "100%",
              transition: "all 0.25s ease",
            }}
          >
            {t.nav.bookShoot}
          </button>
        </div>
      )}
    </nav>
  );
}

function LanguageSwitcher({
  language,
  setLanguage,
}: {
  language: Language;
  setLanguage: (l: Language) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        border: "1px solid rgba(255,251,224,0.15)",
        overflow: "hidden",
      }}
    >
      {(["en", "nl"] as Language[]).map((lang) => {
        const isActive = language === lang;
        return (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              background: isActive ? "rgba(255,251,224,0.1)" : "none",
              border: "none",
              color: isActive ? "#fffbe0" : "rgba(255,251,224,0.35)",
              fontSize: "9px",
              fontWeight: isActive ? 700 : 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "7px 11px",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s ease",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.color = "rgba(255,251,224,0.7)";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.color = "rgba(255,251,224,0.35)";
            }}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}