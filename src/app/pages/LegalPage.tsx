import { Fragment, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { LEGAL_SECTIONS } from "../lib/legal";
import { LEGAL_DATE, LEGAL_VERSION } from "../lib/legalVersion";
import { policies, type PolicyDoc } from "../lib/policies";
import type { ReaderBlock } from "../studio/documents/types";

const LINKS = /(https?:\/\/[^\s]+|www\.photodecaffeine\.com\/[\w-]*|[\w.+-]+@[\w-]+\.[a-z]{2,})/g;

/** Addresses in the running text become links, without the full stop behind them. */
function linked(text: string): ReactNode[] {
  return text.split(LINKS).map((piece, i) => {
    if (i % 2 === 0) return piece;
    const clean = piece.replace(/[.,;:]+$/, "");
    const rest = piece.slice(clean.length);
    const link = clean.includes("@") ? <a href={`mailto:${clean}`}>{clean}</a>
      : clean.startsWith("www.photodecaffeine.com") ? <Link to={clean.slice("www.photodecaffeine.com".length) || "/"}>{clean}</Link>
      : <a href={clean} target="_blank" rel="noreferrer">{clean}</a>;
    return <Fragment key={i}>{link}{rest}</Fragment>;
  });
}

/** **Bold** is the only markup the document uses. */
function Inline({ text }: { text: string }) {
  return <>{text.split("**").map((piece, i) => (i % 2 ? <strong key={i}>{linked(piece)}</strong> : <Fragment key={i}>{linked(piece)}</Fragment>))}</>;
}

function Blocks({ blocks }: { blocks: ReaderBlock[] }) {
  const out: ReactNode[] = [];
  let items: ReactNode[] = [];
  const endList = () => {
    if (items.length) out.push(<ul key={`l${out.length}`}>{items}</ul>);
    items = [];
  };
  blocks.forEach((b, i) => {
    if (b.t === "li") {
      items.push(<li key={i}><Inline text={b.text} /></li>);
      return;
    }
    endList();
    if (b.t === "table") {
      const [head, ...rows] = b.rows;
      out.push(
        <div key={i} className="pdc-legal-table" tabIndex={0} role="region" aria-label="Tabel">
          <table>
            <thead><tr>{head.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0] + r[1]}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else {
      out.push(<p key={i}><Inline text={b.text} /></p>);
    }
  });
  endList();
  return <>{out}</>;
}

function LegalPage({ doc }: { doc: PolicyDoc }) {
  const others = Object.values(policies).filter((p) => p.path !== doc.path);
  const sections = LEGAL_SECTIONS.filter((s) => s.part === doc.part);
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
        <div className="pdc-legal-head">
          <p className="pdc-legal-updated">Versie {LEGAL_VERSION}, geldig vanaf {LEGAL_DATE}</p>
          <button type="button" className="pdc-legal-print" onClick={() => window.print()}>Printen of opslaan als pdf</button>
        </div>
        {sections.map((section) => (
          <section key={section.id}>
            <h2>{section.title}</h2>
            <Blocks blocks={section.blocks} />
          </section>
        ))}
        <nav className="pdc-legal-others" aria-label="Andere voorwaarden">
          {others.map((p) => (
            <Link key={p.path} to={p.path}>
              {p.short}
            </Link>
          ))}
        </nav>
      </div>
    </article>
  );
}

export const PromisePage = () => <LegalPage doc={policies.promise} />;
export const TermsPage = () => <LegalPage doc={policies.terms} />;
export const RightsPage = () => <LegalPage doc={policies.rights} />;
export const CancelPage = () => <LegalPage doc={policies.cancel} />;
export const DeliveryPage = () => <LegalPage doc={policies.delivery} />;
export const WebsitesPage = () => <LegalPage doc={policies.websites} />;
export const PrivacyPage = () => <LegalPage doc={policies.privacy} />;
export const CookiePage = () => <LegalPage doc={policies.cookie} />;
export const ComplaintsPage = () => <LegalPage doc={policies.complaints} />;
export const SiteTermsPage = () => <LegalPage doc={policies.site} />;
