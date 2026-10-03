import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { policies, type PolicyDoc } from "../lib/policies";

function LegalPage({ doc }: { doc: PolicyDoc }) {
  const others = Object.values(policies).filter((p) => p.path !== doc.path);
  return (
    <article className="pdc-legal">
      <Helmet>
        <title>{`${doc.title} | PhotoDeCaffeine`}</title>
        <meta name="description" content={doc.description} />
        <link rel="canonical" href={`https://www.photodecaffeine.com${doc.path}`} />
        <meta property="og:title" content={`${doc.title} | PhotoDeCaffeine`} />
        <meta property="og:description" content={doc.description} />
        <meta property="og:url" content={`https://www.photodecaffeine.com${doc.path}`} />
      </Helmet>
      <div className="pdc-legal-inner">
        <h1 className="pdc-legal-title">{doc.title}</h1>
        <p className="pdc-legal-updated">{doc.lastUpdated}</p>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <nav className="pdc-legal-others" aria-label="Andere voorwaarden">
          {others.map((p) => (
            <Link key={p.path} to={p.path}>
              {p.title}
            </Link>
          ))}
        </nav>
      </div>
    </article>
  );
}

export const PrivacyPage = () => <LegalPage doc={policies.privacy} />;
export const TermsPage = () => <LegalPage doc={policies.terms} />;
export const CookiePage = () => <LegalPage doc={policies.cookie} />;
