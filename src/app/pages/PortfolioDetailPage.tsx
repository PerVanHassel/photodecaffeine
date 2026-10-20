import { Helmet } from "react-helmet-async";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowDown, ArrowLeft, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { GoogleG } from "../components/GoogleG";
import { Lightbox } from "../components/Lightbox";
import { CoverVideo } from "../components/PortfolioTile";
import { useLanguage } from "../context/LanguageContext";
import { useReveal } from "../hooks/useReveal";
import { HIGH_PRIORITY } from "../lib/images";
import { webSrcSet } from "../lib/photoFocus";
import { usePortfolio, useReviews, type PublicReview } from "../lib/siteData";

const pad = (n: number) => String(n).padStart(2, "0");

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const td = t.portfolioDetail;
  // The article comes from the shared portfolio list, which the prerender
  // bakes into the page; unpublished or unknown ids are simply not in it.
  const portfolio = usePortfolio();
  const article = portfolio.data?.find((a) => a.id === id) ?? null;
  const loading = portfolio.data === undefined && !portfolio.error;
  // Published reviews the studio linked to this piece in the admin.
  const reviews = useReviews().data?.filter((r) => r.portfolioArticleId === id) ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const spread = useRef<HTMLDivElement>(null);
  useReveal(spread, ".pdc-shot", article?.galleryUrls.join("|"));

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
  const photos = article.galleryUrls;
  const total = photos.length;
  // The band shows the cover, or the first photo when there is no cover.
  const coverUrl = article.coverUrl || photos[0] || "";
  const coverIsVideo = article.coverType === "video" && !!article.coverUrl;
  const description = article.description?.trim();

  return (
    <div
      style={{
        backgroundColor: "#fcf9ef",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Helmet>
        <title>{article.title} | Portfolio | PhotoDeCaffeine</title>
        <meta name="description" content={article.description ? `${article.description.slice(0, 140)}…` : `Bekijk de shoot ‘${article.title}’ van PhotoDeCaffeine: professionele ${/automotive/i.test(article.category) ? "automotive fotografie" : "fotografie"} door heel Nederland.`} />
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
          "description": article.description || `Fotoserie door PhotoDeCaffeine: ${article.title}`,
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
      {/* ── The cover as a black-and-white band, the title in wide capitals ── */}
      <header className="pdc-cover">
        {coverUrl && (
          <div className="pdc-cover-media" aria-hidden="true">
            {coverIsVideo ? (
              <CoverVideo src={coverUrl} />
            ) : (
              <img src={coverUrl} srcSet={webSrcSet(coverUrl)} sizes="100vw" alt="" {...HIGH_PRIORITY} />
            )}
          </div>
        )}
        <Link to="/portfolio" className="pdc-back-link pdc-cover-back">
          <ArrowLeft size={14} aria-hidden="true" />
          {td.back}
        </Link>
        <div className="pdc-cover-inner">
          {article.category && <span className="pdc-cover-kicker">{article.category}</span>}
          <h1 className="pdc-cover-title">{article.title}</h1>
          {total > 0 && (
            <>
              <p className="pdc-cover-meta">{td.photoCount(total)}</p>
              <Link to="#serie" className="pdc-cover-view">
                {td.viewSeries}
                <ArrowDown size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── The series on light paper ── */}
      <div className="pdc-paper pdc-article">
        <div className={`pdc-article-intro${description ? "" : " pdc-article-intro--meta"}`}>
          {description && (
            <div>
              <span className="pdc-kicker">{td.aboutLabel}</span>
              <p className={`pdc-article-lede${description.length > 220 ? " pdc-article-lede--long" : ""}`}>{description}</p>
            </div>
          )}
          <dl className="pdc-article-meta">
            {article.category && (
              <>
                <dt>{td.metaCategory}</dt>
                <dd>{article.category}</dd>
              </>
            )}
            <dt>{td.metaPhotos}</dt>
            <dd>{total}</dd>
          </dl>
        </div>

        {total === 0 ? (
          <p className="pdc-kicker" style={{ textAlign: "center", margin: "48px 0" }}>
            {td.noImages}
          </p>
        ) : (
          <div id="serie" ref={spread} className={`pdc-spread${total === 1 ? " pdc-spread--single" : ""}`}>
            {photos.map((url, idx) => {
              // Photos two and three of every four are the small ones.
              const small = idx % 4 === 1 || idx % 4 === 2;
              return (
                <button key={url} type="button" className="pdc-shot" onClick={() => setLightboxIndex(idx)}>
                  <span className="pdc-shot-frame">
                    <ImageWithFallback
                      src={url}
                      srcSet={webSrcSet(url)}
                      sizes={small && total > 1 ? "(max-width: 767px) 100vw, 34vw" : "(max-width: 767px) 100vw, 60vw"}
                      alt={photoAlt(idx + 1)}
                      // The first pair is close to view on arrival; the rest can wait.
                      loading={idx < 2 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </span>
                  <span className="pdc-shot-caption" aria-hidden="true">
                    <span>
                      {pad(idx + 1)} / {pad(total)}
                    </span>
                    <span className="pdc-shot-zoom">{td.enlarge}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {reviews.length > 0 && <ArticleReviews reviews={reviews} />}

        <div className="pdc-article-cta">
          <h2>{td.ctaTitle}</h2>
          <div className="pdc-article-cta-actions">
            <Link
              to="/#contact"
              className="pdc-btn pdc-btn-ink"
              style={{ padding: "16px 40px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em" }}
            >
              {td.cta}
            </Link>
            {/automotive/i.test(article.category) ? (
              <Link to="/services/automotive" className="pdc-text-link">
                {td.serviceLink}
              </Link>
            ) : (
              <Link to="/services/fotografie" className="pdc-text-link">
                {td.photographyLink}
              </Link>
            )}
          </div>
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

/** What the client of this shoot said, between the photos and the call to action. */
function ArticleReviews({ reviews }: { reviews: PublicReview[] }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="article-reviews" className="pdc-article-reviews">
      <h2 id="article-reviews" className="pdc-kicker" style={{ margin: "0 0 36px" }}>
        {t.portfolioDetail.reviewLabel}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "56px" }}>
        {reviews.map((review) => (
          <figure key={review.id} style={{ margin: 0 }}>
            <div role="img" aria-label={t.socialProof.rating(review.rating)} style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "24px" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={16} color="#a96f38" fill={n <= review.rating ? "#a96f38" : "none"} strokeWidth={2} aria-hidden="true" />
              ))}
            </div>
            <blockquote
              style={{
                color: "rgba(26,12,4,0.85)",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(18px, 2vw, 24px)",
                fontWeight: 300,
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              “{review.text}”
            </blockquote>
            <figcaption style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "28px" }}>
              {review.photoUrl && (
                <img src={review.photoUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" loading="lazy"
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
              )}
              <span style={{ color: "#1a0c04", fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" }}>{review.clientName}</span>
              {review.source === "google" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(26,12,4,0.6)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  · <GoogleG size={13} /> {t.socialProof.googleReview}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
