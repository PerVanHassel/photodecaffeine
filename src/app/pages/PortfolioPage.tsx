import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PortfolioTile } from "../components/PortfolioTile";
import { useLanguage } from "../context/LanguageContext";
import { usePortfolio, visibleArticles } from "../lib/siteData";

function SkeletonGrid({ label }: { label: string }) {
  const heights = [320, 480, 260, 400, 340, 560, 300, 420, 380];
  return (
    <div className="portfolio-masonry" role="status" aria-label={label} style={{ columnCount: 3, columnGap: "3px" }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="pdc-skeleton"
          style={{
            width: "100%",
            height: `${h}px`,
            backgroundColor: "rgba(255,251,224,0.04)",
            marginBottom: "3px",
            breakInside: "avoid",
            animation: "pdc-skeleton-pulse 1.6s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

const ALL = "All";

export function PortfolioPage() {
  const { t } = useLanguage();
  const portfolio = usePortfolio();
  const articles = visibleArticles(portfolio.data) ?? [];
  const loading = portfolio.data === undefined && !portfolio.error;
  const error = portfolio.error;
  // The chosen category lives in the address (?categorie=…), so it survives a
  // reload and can be shared. The prerendered HTML shows every category, so
  // the address is read only after hydration.
  const [params, setParams] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const activeCategory = (hydrated && params.get("categorie")) || ALL;
  const setActiveCategory = (cat: string) =>
    setParams(cat === ALL ? {} : { categorie: cat }, { replace: true, preventScrollReset: true });

  const categories = [
    ALL,
    ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort(),
  ];

  const filtered =
    activeCategory === ALL
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  return (
    <div
      style={{
        backgroundColor: "#080401",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "72px",
      }}
    >
      <Helmet>
        <title>Portfolio — Fotografie & Video | PhotoDeCaffeine</title>
        <meta name="description" content="Bekijk het portfolio van PhotoDeCaffeine — automotive, editorial en studio fotografie door heel Nederland. Scherpe beelden voor merken, showrooms en particulieren." />
        <link rel="canonical" href="https://www.photodecaffeine.com/portfolio" />
        <meta property="og:title" content="Portfolio | PhotoDeCaffeine" />
        <meta property="og:description" content="Automotive, editorial en studio fotografie door heel Nederland. Bekijk onze shoots." />
        <meta property="og:url" content="https://www.photodecaffeine.com/portfolio" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portfolio | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Automotive, editorial en studio fotografie door heel Nederland. Bekijk onze shoots." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Portfolio", "item": "https://www.photodecaffeine.com/portfolio" }
          ]
        })}</script>
      </Helmet>
      <div
        className="pdc-svc-head"
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link to="/" className="pdc-back-link">
            {t.portfolioPage.backToHome}
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "32px",
            }}
          >
            <div>
              <span
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "16px",
                }}
              >
                {t.portfolioPage.label}
              </span>
              <h1
                className="pdc-page-title"
                style={{
                  color: "#fffbe0",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {t.portfolioPage.titleLine1}
                <br />
                <span style={{ color: "rgba(255,251,224,0.4)" }}>{t.portfolioPage.titleLine2}</span>
              </h1>
            </div>

            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "340px",
                textAlign: "right",
              }}
            >
              {t.portfolioPage.subtitle.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      <div
        className="pdc-gutter"
        style={{
          position: "sticky",
          top: "72px",
          zIndex: 50,
          backgroundColor: "rgba(8, 4, 1, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
        }}
      >
        <div
          className="hide-scrollbar"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            gap: "0",
            overflowX: "auto",
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className="pdc-filter"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(cat)}
              >
                {(t.portfolioPage.categories as Record<string, string>)[cat] ?? cat}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="pdc-page-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {loading ? (
          <SkeletonGrid label={t.portfolio.loading} />
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "120px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {t.portfolioPage.loadError}
            </span>
            <button
              type="button"
              onClick={portfolio.retry}
              className="pdc-btn pdc-btn-quiet"
              style={{ padding: "12px 28px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em" }}
            >
              {t.portfolioPage.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "120px 0",
              color: "rgba(255,251,224,0.5)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {t.portfolioPage.noWork}
          </div>
        ) : (
          <div
            className="portfolio-masonry"
            style={{
              columnCount: 3,
              columnGap: "3px",
            }}
          >

            {filtered.map((item) => (
              <PortfolioTile key={item.id} item={item} layout="masonry" />
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "64px",
            borderTop: "1px solid rgba(255,251,224,0.06)",
            paddingTop: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {activeCategory !== ALL && (
            <span
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {t.portfolioPage.showingOf(filtered.length, articles.length)}
            </span>
          )}
          <Link
            to="/#contact"
            className="pdc-btn pdc-btn-invert"
            style={{ padding: "14px 36px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.22em" }}
          >
            {t.portfolioPage.bookShoot}
          </Link>
        </div>
      </div>
    </div>
  );
}
