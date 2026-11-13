import { Fragment, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { longDate } from "../i18n/format";
import { LEGAL_SECTIONS } from "../lib/legal";
import { LEGAL_EN_VERSION, LEGAL_SECTIONS_EN } from "../lib/legal.en";
import { LEGAL_DATE, LEGAL_VERSION } from "../lib/legalVersion";
import { localPolicies, policies, type PolicyDoc } from "../lib/policies";
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

function Blocks({ blocks, tableLabel }: { blocks: ReaderBlock[]; tableLabel: string }) {
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
        <div key={i} className="pdc-legal-table" tabIndex={0} role="region" aria-label={tableLabel}>
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

// The English translation, while it follows the Dutch text that applies now.
// When the Dutch text has moved on, the English pages show the Dutch one.
const ENGLISH_CURRENT = LEGAL_EN_VERSION === LEGAL_VERSION;

function LegalPage({ doc: dutchDoc }: { doc: PolicyDoc }) {
  const { t, language } = useLanguage();
  const tl = t.legalPage;
  const local = localPolicies(language);
  const doc = Object.values(local).find((p) => p.path === dutchDoc.path) ?? dutchDoc;
  const others = Object.values(local).filter((p) => p.path !== doc.path);
  const english = language === "en";
  const translated = english && ENGLISH_CURRENT;
  const sections = (translated ? LEGAL_SECTIONS_EN : LEGAL_SECTIONS).filter((s) => s.part === doc.part);
  // Shown in Dutch, the text keeps saying so to screen readers and translation tools.
  const textLang = english && !translated ? "nl" : undefined;
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
          <p className="pdc-legal-updated">{tl.version(LEGAL_VERSION, longDate(t, LEGAL_DATE))}</p>
          <button type="button" className="pdc-legal-print" onClick={() => window.print()}>{tl.print}</button>
        </div>
        {english && (translated ? tl.translationNote : tl.outdatedNote) && (
          <p className="pdc-legal-note" role="note">{translated ? tl.translationNote : tl.outdatedNote}</p>
        )}
        <div lang={textLang}>
          {sections.map((section) => (
            <section key={section.id}>
              <h2>{section.title}</h2>
              <Blocks blocks={section.blocks} tableLabel={tl.table} />
            </section>
          ))}
        </div>
        <nav className="pdc-legal-others" aria-label={tl.others}>
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
