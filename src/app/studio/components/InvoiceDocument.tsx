import { euro, fmtDate } from "../format";
import type { Business, Invoice } from "../types";

/** The invoice as the client sees it: shown in the admin, on the public page and when printed. */
export function InvoiceDocument({ invoice: inv, business }: { invoice: Pick<Invoice, "number" | "clientName" | "clientAddress" | "clientEmail" | "issuedOn" | "dueOn" | "lines" | "totals" | "vatBasis" | "notes">; business: Business }) {
  return (
    <article className="s-doc">
      <div className="s-row between" style={{ alignItems: "flex-start" }}>
        <div className="s-stack sm">
          <span className="s-eyebrow">Factuur</span>
          <h2 style={{ fontSize: 26 }} className="s-mono">{inv.number}</h2>
        </div>
        <div className="s-stack sm s-small" style={{ textAlign: "right" }}>
          <b>{business.name}</b>
          {business.address && <span style={{ whiteSpace: "pre-line" }}>{business.address}</span>}
          {business.kvk && <span>KvK {business.kvk}</span>}
          {business.vatNumber && <span>Btw {business.vatNumber}</span>}
        </div>
      </div>
      <div className="s-row between" style={{ alignItems: "flex-start" }}>
        <div className="s-stack sm s-small">
          <span className="s-eyebrow">Aan</span>
          <b>{inv.clientName || inv.clientEmail}</b>
          {inv.clientAddress && <span style={{ whiteSpace: "pre-line" }}>{inv.clientAddress}</span>}
        </div>
        <div className="s-stack sm s-small" style={{ textAlign: "right" }}>
          <span>Factuurdatum <b>{fmtDate(inv.issuedOn)}</b></span>
          <span>Te betalen voor <b>{fmtDate(inv.dueOn)}</b></span>
        </div>
      </div>
      <table className="s-doc-lines">
        <thead><tr><th>Omschrijving</th><th className="right">Aantal</th><th className="right">Prijs</th><th className="right">Bedrag</th></tr></thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.label}{l.note && <div className="s-faint s-small">{l.note}</div>}</td>
              <td className="right s-mono">{l.quantity}</td>
              <td className="right s-mono">{euro(l.amount)}</td>
              <td className="right s-mono">{euro(l.quantity * l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="s-totals">
        <div className="s-kv"><span>Subtotaal</span><span className="s-mono">{euro(inv.totals.net)}</span></div>
        <div className="s-kv"><span>Btw {inv.totals.vatRate}%</span><span className="s-mono">{euro(inv.totals.vat)}</span></div>
        <div className="s-kv"><span>Totaal</span><span className="s-mono">{euro(inv.totals.total)}</span></div>
      </div>
      {inv.notes && <p className="s-small s-muted" style={{ whiteSpace: "pre-line" }}>{inv.notes}</p>}
      {business.iban && (
        <p className="s-small">Graag overmaken naar <b className="s-mono">{business.iban}</b> t.n.v. {business.name}, onder vermelding van <b className="s-mono">{inv.number}</b>.</p>
      )}
    </article>
  );
}
