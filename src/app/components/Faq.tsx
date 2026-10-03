import { Helmet } from "react-helmet-async";
import { useLanguage } from "../context/LanguageContext";

export type FaqItem = { q: string; a: string };

/**
 * Frequently asked questions as native <details> rows (open and close with
 * keyboard and screen readers without any script), plus the FAQPage data
 * search engines read.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  const { t } = useLanguage();
  return (
    <section className="pdc-faq" aria-labelledby="faq-title">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          })}
        </script>
      </Helmet>
      <div className="pdc-faq-inner">
        <h2 id="faq-title" className="pdc-faq-label">
          {t.faq.label}
        </h2>
        {items.map((item) => (
          <details key={item.q} className="pdc-faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
