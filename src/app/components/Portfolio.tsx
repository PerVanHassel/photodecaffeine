import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { usePortfolio, visibleArticles } from "../lib/siteData";
import { PortfolioTile } from "./PortfolioTile";

const SLOTS = 6;

export function Portfolio() {
  const { t } = useLanguage();
  const portfolio = usePortfolio();
  const articles = portfolio.data ?? [];
  const loading = portfolio.data === undefined && !portfolio.error;

  // Featured work first; the rest of the portfolio fills any open places, so
  // the mosaic never shows an empty tile while there is work to show.
  const visible = visibleArticles(articles) ?? [];
  const displayItems = [...visible.filter((a) => a.featured), ...visible.filter((a) => !a.featured)].slice(0, SLOTS);

  if (loading) {
    return (
      <section
        id="portfolio"
        style={{
          backgroundColor: "#080401",
          padding: "120px 0",
          fontFamily: "'Inter', sans-serif",
          minHeight: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,251,224,0.5)", fontSize: "12px", letterSpacing: "0.2em" }}>
          {t.portfolio.loading}
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section
        id="portfolio"
        style={{
          backgroundColor: "#080401",
          padding: "120px 0",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 40px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {t.portfolio.empty}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      id="portfolio"
      style={{
        backgroundColor: "#080401",
        padding: "120px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            flexWrap: "wrap",
            gap: "24px",
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
              {t.portfolio.label}
            </span>
            <h2
              style={{
                color: "#fffbe0",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              PDC <br />
              <span style={{ color: "rgba(255,251,224,0.4)" }}>{t.portfolio.titleLine2}</span>
            </h2>
          </div>
          <p
            className="pdc-hover-hint"
            style={{
              color: "rgba(255,251,224,0.5)",
              fontSize: "12px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: 0,
              textAlign: "right",
            }}
          >
            {t.portfolio.hoverReveal}
          </p>
        </div>

        <div
          className="portfolio-grid-main"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "380px 380px",
            gap: "2px",
          }}
        >
          <div
            style={{
              gridColumn: "1",
              gridRow: "1 / span 2",
              overflow: "hidden",
            }}
          >
            {displayItems[0] && (
              <PortfolioTile item={displayItems[0]} layout="fill" />
            )}
          </div>

          <div style={{ gridColumn: "2", gridRow: "1", overflow: "hidden" }}>
            {displayItems[1] && (
              <PortfolioTile item={displayItems[1]} layout="fill" />
            )}
          </div>

          <div style={{ gridColumn: "2", gridRow: "2", overflow: "hidden" }}>
            {displayItems[2] && (
              <PortfolioTile item={displayItems[2]} layout="fill" />
            )}
          </div>

          <div
            style={{
              gridColumn: "3",
              gridRow: "1 / span 2",
              overflow: "hidden",
            }}
          >
            {displayItems[3] && (
              <PortfolioTile item={displayItems[3]} layout="fill" />
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2px",
            marginTop: "2px",
          }}
        >
          <div style={{ overflow: "hidden", height: "280px" }}>
            {displayItems[4] && (
              <PortfolioTile item={displayItems[4]} layout="fill" />
            )}
          </div>
          <div style={{ overflow: "hidden", height: "280px" }}>
            {displayItems[5] && (
              <PortfolioTile item={displayItems[5]} layout="fill" />
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "64px" }}>
          <Link
            to="/portfolio"
            className="pdc-btn pdc-btn-quiet"
            style={{ padding: "16px 48px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.25em" }}
          >
            {t.portfolio.viewFull}
          </Link>
        </div>
      </div>
    </section>
  );
}
