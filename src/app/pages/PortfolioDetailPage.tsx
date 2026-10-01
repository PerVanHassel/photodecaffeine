import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Lightbox } from "../components/Lightbox";
import { useLanguage } from "../context/LanguageContext";
import { usePortfolio } from "../lib/siteData";

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const td = t.portfolioDetail;
  // The article comes from the shared portfolio list, which the prerender
  // bakes into the page; unpublished or unknown ids are simply not in it.
  const portfolio = usePortfolio();
  const article = portfolio.data?.find((a) => a.id === id) ?? null;
  const loading = portfolio.data === undefined && !portfolio.error;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div
        role="status"
        style={{
          backgroundColor: "#080401",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "72px",
        }}
      >
        <div style={{ color: "rgba(255,251,224,0.55)", fontSize: "12px", letterSpacing: "0.2em" }}>
          {td.loading}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div
        style={{
          backgroundColor: "#080401",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "72px",
          gap: "24px",
        }}
      >
        <Helmet>
          <title>{`${td.notFound} | PhotoDeCaffeine`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 style={{ color: "rgba(255,251,224,0.6)", fontSize: "14px", fontWeight: 400, letterSpacing: "0.2em", margin: 0 }}>
          {td.notFound}
        </h1>
        <Link
          to="/portfolio"
          className="pdc-btn pdc-btn-quiet"
          style={{ padding: "12px 32px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em" }}
        >
          {td.back}
        </Link>
      </div>
    );
  }

  const photoAlt = (n: number) => td.photoAlt(article.title, n);

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
        <title>{article.title} — Portfolio | PhotoDeCaffeine</title>
        <meta name="description" content={article.description ? `${article.description.slice(0, 140)}…` : `Bekijk de shoot ‘${article.title}’ van PhotoDeCaffeine — professionele ${/automotive/i.test(article.category) ? "automotive fotografie" : "fotografie"} door heel Nederland.`} />
        <link rel="canonical" href={`https://www.photodecaffeine.com/portfolio/${article.id}`} />
        <meta property="og:title" content={`${article.title} | PhotoDeCaffeine`} />
        <meta property="og:description" content={article.description ? article.description.slice(0, 140) : `Professionele fotoserie door PhotoDeCaffeine.`} />
        <meta property="og:url" content={`https://www.photodecaffeine.com/portfolio/${article.id}`} />
        <meta property="og:type" content="article" />
        {article.coverUrl && <meta property="og:image" content={article.coverUrl} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${article.title} | PhotoDeCaffeine`} />
        <meta name="twitter:description" content={article.description ? article.description.slice(0, 140) : `Professionele fotoserie door PhotoDeCaffeine.`} />
        {article.coverUrl && <meta name="twitter:image" content={article.coverUrl} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          "name": article.title,
          "description": article.description || `Fotoserie door PhotoDeCaffeine — ${article.title}`,
          "url": `https://www.photodecaffeine.com/portfolio/${article.id}`,
          "image": article.coverUrl || undefined,
          "author": {
            "@type": "LocalBusiness",
            "name": "PhotoDeCaffeine",
            "url": "https://www.photodecaffeine.com"
          }
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Portfolio", "item": "https://www.photodecaffeine.com/portfolio" },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": `https://www.photodecaffeine.com/portfolio/${article.id}` }
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
          <Link to="/portfolio" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {td.back}
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
                  color: "rgba(200,144,90,0.8)",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "16px",
                }}
              >
                {article.category}
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(40px, 6vw, 72px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {article.title}
              </h1>
            </div>
          </div>

          {article.description && (
            <p
              style={{
                color: "rgba(255,251,224,0.5)",
                fontSize: "15px",
                fontWeight: 300,
                lineHeight: 1.8,
                marginTop: "32px",
                maxWidth: "700px",
              }}
            >
              {article.description}
            </p>
          )}
        </div>
      </div>

      <div
        className="pdc-detail-body"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {article.galleryUrls.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "rgba(255,251,224,0.5)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {td.noImages}
          </div>
        ) : (
          <div
            className="pdc-detail-masonry"
            style={{
              columnGap: "3px",
            }}
          >
            {article.galleryUrls.map((url, idx) => (
              <button
                key={url}
                type="button"
                className="pdc-detail-photo"
                onClick={() => setLightboxIndex(idx)}
              >
                <ImageWithFallback
                  src={url}
                  alt={photoAlt(idx + 1)}
                  // The first row is in view on arrival; the rest can wait.
                  loading={idx < 3 ? "eager" : "lazy"}
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "80px",
            textAlign: "center",
          }}
        >
          <Link
            to="/#contact"
            className="pdc-btn pdc-btn-solid"
            style={{ padding: "16px 48px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em" }}
          >
            {td.cta}
          </Link>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={article.galleryUrls}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          labels={{
            dialog: td.dialog(article.title),
            close: td.close,
            previous: td.previous,
            next: td.next,
            alt: photoAlt,
            position: td.photoOf,
          }}
        />
      )}
    </div>
  );
}
