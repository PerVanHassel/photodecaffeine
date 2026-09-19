import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useSearchParams } from "react-router";
import { Home } from "./Home";
import { Shop, useCart } from "./Shop";
import { IMG, Logo, MAIL, TEL, TEL_LABEL } from "./shared";
import "./aqua.css";

/**
 * Demo voor Aqua Spa Service, onafhankelijke spa-technieker uit Verrebroek.
 *
 * Eén demo met drie weergaven, gekozen via ?p=:
 *   (leeg)      de homepage
 *   webshop     de webshop voor onderdelen
 *   brandkit    het brand kit-bord, bedoeld om aan de klant te tonen
 *
 * Alle bedrijfsgegevens komen van aquaspaservice.be, het KBO en de Gouden Gids.
 * Het logo is het echte woordmerk, als masker zodat het in licht en donker
 * meekleurt. De foto's zijn die van hun huidige site. De webshop gebruikt
 * voorbeeldproducten en voorbeeldprijzen; dat staat ook op de pagina zelf.
 */

type View = "home" | "shop" | "brandkit";
type Theme = "light" | "dark";

const THEME_KEY = "ass-theme";

export function AquaSpaServiceDemo() {
  const [params] = useSearchParams();
  const location = useLocation();
  const p = params.get("p");
  const view: View = p === "webshop" ? "shop" : p === "brandkit" ? "brandkit" : "home";

  const [theme, setTheme] = useState<Theme | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart, setCart, count } = useCart();
  const root = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);

  // Thema en reveal pas na het mounten, zodat de prerender niets van de browser vraagt.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Geen opslag: het systeemthema blijft gelden.
    }
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const current = theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Zie hierboven.
    }
  };

  // Naar de sectie uit de hash, of naar boven bij een andere weergave.
  const lastView = useRef<View | null>(null);
  useEffect(() => {
    setMenuOpen(false);
    const id = location.hash.slice(1);
    const switched = lastView.current !== null && lastView.current !== view;
    lastView.current = view;
    if (id) {
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0);
    } else if (switched) {
      window.scrollTo(0, 0);
    }
  }, [view, location.key, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Secties in beeld laten komen. Geeft leesvolgorde mee, geen decoratie.
  useEffect(() => {
    if (!ready || !root.current) return;
    const targets = Array.from(root.current.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready, view]);

  /** Een link naar een sectie op de homepage, vanaf elke weergave. */
  const section = (hash: string) => ({ search: "", hash });

  const navItems = [
    { label: "Wat we doen", to: section("#diensten") },
    { label: "Reviews", to: section("#reviews") },
    { label: "Merken", to: section("#merken") },
    { label: "Vragen", to: section("#vragen") },
    { label: "Webshop", to: { search: "?p=webshop", hash: "" }, current: view === "shop" },
    { label: "Contact", to: section("#contact") },
  ];

  const title =
    view === "shop"
      ? "Webshop onderdelen | Aqua Spa Service"
      : view === "brandkit"
        ? "Brand kit | Aqua Spa Service"
        : "Aqua Spa Service | Herstelling en onderhoud van jacuzzi's, spa's en sauna's";

  return (
    <div
      ref={root}
      className={ready ? "ass ass--js" : "ass"}
      data-theme={theme ?? undefined}
      lang="nl-BE"
    >
      <Helmet>
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css" />
      </Helmet>

      <a className="skip" href="#ass-main">
        Spring naar de inhoud
      </a>

      <header className="nav">
        <div className="wrap nav__inner">
          <Link className="logo" to={{ search: "", hash: "" }} aria-label="Aqua Spa Service, naar de startpagina">
            <Logo />
          </Link>

          <nav className="nav__links" aria-label="Hoofdmenu">
            {navItems.map((n) => (
              <Link key={n.label} to={n.to} aria-current={n.current ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="nav__side">
            <button className="iconbtn theme-toggle" type="button" aria-label="Wissel tussen licht en donker" onClick={toggleTheme}>
              <i className="ph ph-sun" aria-hidden="true" />
              <i className="ph ph-moon" aria-hidden="true" />
            </button>
            {view === "shop" && (
              <button
                className="iconbtn cartbtn"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Winkelmand openen, ${count} ${count === 1 ? "artikel" : "artikelen"}`}
                onClick={() => setCartOpen(true)}
              >
                <i className="ph ph-shopping-cart-simple" aria-hidden="true" />
                {count > 0 && (
                  <span className="cartbtn__count bump" key={count}>
                    {count}
                  </span>
                )}
              </button>
            )}
            <a className="btn btn--primary btn--sm" href={TEL}>
              <i className="ph ph-phone" aria-hidden="true" />
              Bel {TEL_LABEL}
            </a>
            <button
              ref={menuBtn}
              className="iconbtn menubtn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="ass-mobilemenu"
              aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <i className={menuOpen ? "ph ph-x" : "ph ph-list"} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mobilemenu" id="ass-mobilemenu" data-open={menuOpen ? "true" : "false"}>
          <div className="wrap">
            <ul>
              {navItems.map((n) => (
                <li key={n.label}>
                  <Link to={n.to} aria-current={n.current ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main id="ass-main">
        {view === "home" && <Home />}
        {view === "shop" && <Shop cart={cart} setCart={setCart} cartOpen={cartOpen} setCartOpen={setCartOpen} />}
        {view === "brandkit" && (
          <section className="brandkit">
            <div className="wrap">
              <h1 className="sr-only">Brand kit Aqua Spa Service</h1>
              <img
                src={`${IMG}/brandkit.png`}
                width={1920}
                height={1440}
                alt="Brand kit van Aqua Spa Service: logo, opbouw, website, belofte, kleuren, letter, visitekaartje, beeld en systeem."
              />
            </div>
          </section>
        )}
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot__grid">
            <div>
              <Link className="logo" to={{ search: "", hash: "" }} aria-label="Aqua Spa Service, naar de startpagina">
                <Logo />
              </Link>
              <p style={{ marginTop: 16, maxWidth: "38ch" }}>
                Onafhankelijk service- en adviesbedrijf voor jacuzzi's, whirlpools, sauna's en stoomcabines. Actief sinds
                2006.
              </p>
            </div>

            <nav aria-label="Voettekstmenu">
              <h3>Website</h3>
              <ul>
                {navItems.map((n) => (
                  <li key={n.label}>
                    <Link to={n.to}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <address>
              <h3>Contact</h3>
              <ul>
                <li>
                  <a href={TEL}>{TEL_LABEL}</a>
                </li>
                <li>
                  <a href={`mailto:${MAIL}`}>{MAIL}</a>
                </li>
                <li>Sluisstraat 31, 9130 Verrebroek</li>
              </ul>
            </address>
          </div>

          <div className="foot__base">
            <span>Copyright 2026 Aqua Spa Service</span>
            <span>Ondernemingsnummer en btw: BE 0883.523.510</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
