import { FilePlus, Receipt } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { post } from "../../api";
import { euro, fmtDate } from "../../format";
import { keys, useAction, useInvoices, useQuotes } from "../../queries";
import type { Invoice, Project } from "../../types";
import { Button, Card, Empty, Pill, SkeletonList } from "../../ui";
import { INVOICE_STATUS, QUOTE_STATUS } from "../Money";

export function FinanceTab({ project: p }: { project: Project }) {
  const navigate = useNavigate();
  const quotes = useQuotes();
  const invoices = useInvoices();
  const myQuotes = (quotes.data || []).filter((q) => q.projectId === p.id);
  const myInvoices = (invoices.data || []).filter((i) => i.projectId === p.id);
  const invoiced = myInvoices.filter((i) => i.status !== "void").reduce((s, i) => s + i.totals.total, 0);
  const paid = myInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.totals.total, 0);

  const fromQuote = useAction({
    fn: (quoteId: string) => post<{ invoice: Invoice }>(`/admin/invoices/from-quote/${quoteId}`),
    invalidate: () => [keys.invoices],
    success: "Conceptfactuur gemaakt",
    onSuccess: (r) => navigate(`/admin/invoice/${r.invoice.id}`),
  });

  return (
    <div className="s-grid-2">
      <div className="s-stack lg">
        <Card
          title="Offertes"
          action={<Button size="sm" icon={<FilePlus />} onClick={() => navigate(`/admin/quotes?new=1&projectId=${p.id}${p.clientIds[0] ? `&clientId=${p.clientIds[0]}` : ""}`)}>Nieuwe offerte</Button>}
          bodyClass="none"
        >
          {quotes.isLoading ? <SkeletonList rows={2} /> : myQuotes.length === 0 ? (
            <Empty title="Geen offerte gekoppeld">Maak een offerte vanaf hier, dan hoort hij bij dit project.</Empty>
          ) : (
            <ul className="s-list">
              {myQuotes.map((q) => (
                <li key={q.id} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                  <Link to={`/admin/quotes?open=${q.id}`} style={{ textDecoration: "none", minWidth: 0 }}>
                    <div className="t s-truncate">{q.number} · {q.title}</div>
                    <div className="s">{euro(q.totals.oneTime)}{q.totals.monthly ? ` + ${euro(q.totals.monthly)} p/m` : ""}</div>
                  </Link>
                  <Pill tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Pill>
                  {q.status === "accepted" && <Button size="sm" loading={fromQuote.isPending} onClick={() => fromQuote.mutate(q.id)}>Factuur maken</Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Facturen"
          action={<Button size="sm" icon={<Receipt />} onClick={() => navigate(`/admin/invoices?new=1&projectId=${p.id}${p.clientIds[0] ? `&clientId=${p.clientIds[0]}` : ""}`)}>Nieuwe factuur</Button>}
          bodyClass="none"
        >
          {invoices.isLoading ? <SkeletonList rows={2} /> : myInvoices.length === 0 ? (
            <Empty title="Nog geen facturen" />
          ) : (
            <ul className="s-list">
              {myInvoices.map((i) => (
                <li key={i.id}>
                  <Link to={`/admin/invoice/${i.id}`} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                    <div><div className="t">{i.number}</div><div className="s">Vervalt {fmtDate(i.dueOn)}</div></div>
                    <span className="s-mono">{euro(i.totals.total)}</span>
                    <Pill tone={i.overdue ? "bad" : INVOICE_STATUS[i.status].tone}>{i.overdue ? "Te laat" : INVOICE_STATUS[i.status].label}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Samenvatting">
        <div className="s-kv"><span>Waarde in pijplijn</span><span className="s-mono">{p.valueCents ? euro(p.valueCents / 100) : "–"}</span></div>
        <div className="s-kv"><span>Gefactureerd</span><span className="s-mono">{euro(invoiced)}</span></div>
        <div className="s-kv"><span>Betaald</span><span className="s-mono">{euro(paid)}</span></div>
        <div className="s-kv"><b>Nog te ontvangen</b><b className="s-mono">{euro(invoiced - paid)}</b></div>
      </Card>
    </div>
  );
}
