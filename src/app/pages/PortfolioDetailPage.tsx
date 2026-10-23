import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Star } from "lucide-react";
import { ArticleView } from "../components/article/ArticleView";
import { GoogleG } from "../components/GoogleG";
import { Lightbox } from "../components/Lightbox";
import { useLanguage } from "../context/LanguageContext";
import { heroCover, pageOf, pagePhotos, pageSummary } from "../lib/articlePage";
import { usePortfolio, useReviews, type PublicReview } from "../lib/siteData";

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
  // The page maker's layout, or one built from the text and photos.
  const page = useMemo(() => (article ? pageOf(article) : null), [article]);
  const photos = useMemo(() => (article && page ? pagePhotos(article, page) : []), [article, page]);
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

  if (!article || !page) {
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

  const url = `https://www.photodecaffeine.com/portfolio/${article.id}`;
  const summary = pageSummary(article, page);
  const blurb = summary ? (summary.length > 150 ? `${summary.slice(0, 147).trimEnd()}…` : summary) : "";
  const image = heroCover(article)?.kind === "image" ? heroCover(article)!.url : photos[0];
  const automotive = /automotive/i.test(article.category);

  return (
    <div className="pa-site">
      <Helmet>
        <title>{article.title} | Portfolio | PhotoDeCaffeine</title>
        <meta name="description" content={blurb || `Bekijk de shoot ‘${article.title}’ van PhotoDeCaffeine: professionele ${automotive ? "automotive fotografie" : "fotografie"} door heel Nederland.`} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${article.title} | PhotoDeCaffeine`} />
        <meta property="og:description" content={blurb || "Professionele fotoserie door PhotoDeCaffeine."} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        {image && <meta property="og:image" content={image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${article.title} | PhotoDeCaffeine`} />
        <meta name="twitter:description" content={blurb || "Professionele fotoserie door PhotoDeCaffeine."} />
        {image && <meta name="twitter:image" content={image} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "description": summary || `Fotoserie door PhotoDeCaffeine: ${article.title}`,
          "url": url,
          "image": photos.length ? photos.slice(0, 6) : image || undefined,
          "datePublished": article.createdAt,
          "dateModified": article.updatedAt,
          "author": { "@type": "Organization", "name": "PhotoDeCaffeine", "url": "https://www.photodecaffeine.com" },
          "publisher": { "@type": "Organization", "name": "PhotoDeCaffeine", "url": "https://www.photodecaffeine.com" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.photodecaffeine.com/" },
            { "@type": "ListItem", "position": 2, "name": "Portfolio", "item": "https://www.photodecaffeine.com/portfolio" },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": url }
          ]
        })}</script>
      </Helmet>

      <ArticleView
        source={article}
        page={page}
        onOpen={(photo) => {
          const i = photos.indexOf(photo);
          if (i >= 0) setLightboxIndex(i);
        }}
        back={
          <Link to="/portfolio" className="pdc-back-link">
            <ArrowLeft size={14} aria-hidden="true" />
            {td.back}
          </Link>
        }
      >
        {reviews.length > 0 && <ArticleReviews reviews={reviews} />}

        <div className="pa-end">
          <span className="pa-end-label">{td.ctaLabel}</span>
          <h2 className="pa-end-title">
            {td.ctaTitle1} <span>{td.ctaTitle2}</span>
          </h2>
          <div className="pa-end-actions">
            <Link to="/#contact" className="pa-end-btn">{td.cta}</Link>
            <Link to={automotive ? "/services/automotive" : "/services/fotografie"} className="pa-end-link">
              {automotive ? td.serviceLink : td.photographyLink}
            </Link>
          </div>
        </div>
      </ArticleView>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          labels={{
            dialog: td.dialog(article.title),
            close: td.close,
            previous: td.previous,
            next: td.next,
            alt: (n) => td.photoAlt(article.title, n),
            position: td.photoOf,
          }}
        />
      )}
    </div>
  );
}

/** What the client of this shoot said, between the article and the call to action. */
function ArticleReviews({ reviews }: { reviews: PublicReview[] }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="article-reviews" className="pa-reviews">
      <h2 id="article-reviews">{t.portfolioDetail.reviewLabel}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "56px" }}>
        {reviews.map((review) => (
          <figure key={review.id} style={{ margin: 0 }}>
            <div role="img" aria-label={t.socialProof.rating(review.rating)} className="pa-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={16} fill={n <= review.rating ? "currentColor" : "none"} strokeWidth={2} aria-hidden="true" />
              ))}
            </div>
            <blockquote>“{review.text}”</blockquote>
            <figcaption>
              {review.photoUrl && <img src={review.photoUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" loading="lazy" />}
              <b>{review.clientName}</b>
              {review.source === "google" && (
                <span>
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
