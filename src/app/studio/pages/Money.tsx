import { Copy, Eye, FilePlus, Receipt, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { post } from "../api";
import { ago, euro, fmtDate } from "../format";
import { keys, useAction, useQuotes } from "../queries";
import type { Invoice, Quote } from "../types";
import { Button, Card, Empty, ErrorState, PageHead, Pill, Segmented, SkeletonList } from "../ui";
import { QuoteEditor, SendQuoteDialog } from "./QuoteEditor";
import { useSearchPatch, useUrlState } from "../urlState";

type Tone = "ok" | "warn" | "bad" | "info" | "acc" | undefined;

export const QUOTE_STATUS: Record<Quote["status"], { label: string; tone: Tone }> = {
  draft: { label: "Concept", tone: undefined },
  sent: { label: "Verstuurd", tone: "info" },
  accepted: { label: "Geaccepteerd", tone: "ok" },
  declined: { label: "Afgewezen", tone: "bad" },
};

export const INVOICE_STATUS: Record<Invoice["status"], { label: string; tone: Tone }> = {
  draft: { label: "Concept", tone: undefined },
  sent: { label: "Open", tone: "info" },
  paid: { label: "Betaald", tone: "ok" },
  void: { label: "Vervallen", tone: undefined },
};

export async function copyText(text: string, what = "Link") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} gekopieerd`);
  } catch {
    toast.error("Kopiëren lukte niet. Selecteer de link en kopieer hem zelf.");
  }
}

type Filter = "open" | "all" | "draft" | "accepted" | "declined";

/** Closes the editor and keeps the filter. */
const EDITOR_CLOSED = { open: null, new: null, projectId: null, clientId: null };

export function QuotesPage() {
  const { params, patch, href } = useSearchPatch();
  const navigate = useNavigate();
  const quotes = useQuotes();
  const [filter, setFilter] = useUrlState<Filter>("filter", "open");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState<Quote | null>(null);

  const openId = params.get("open");
  const creating = params.get("new") === "1";
  const editing = openId ? (quotes.data || []).find((x) => x.id === openId) || null : null;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (quotes.data || []).filter((x) => {
      const inFilter = filter === "all" ? true : filter === "open" ? x.status === "sent" || x.status === "draft" : x.status === filter;
      const inSearch = !term || `${x.number} ${x.title} ${x.clientName} ${x.clientEmail}`.toLowerCase().includes(term);
      return inFilter && inSearch;
    });
  }, [quotes.data, filter, q]);

  const toInvoice = useAction({
    fn: (id: string) => post<{ invoice: Invoice }>(`/admin/invoices/from-quote/${id}`),
    invalidate: () => [keys.invoices],
    success: "Conceptfactuur gemaakt",
    onSuccess: (r) => navigate(`/admin/invoice/${r.invoice.id}`),
  });

  const accepted = (quotes.data || []).filter((x) => x.status === "accepted").reduce((s, x) => s + x.totals.oneTime, 0);
  const open = (quotes.data || []).filter((x) => x.status === "sent").reduce((s, x) => s + x.totals.oneTime, 0);

  return (
    <div className="s-view">
      <PageHead
        title="Offertes"
        sub={quotes.data ? `${euro(open)} staat open, ${euro(accepted)} geaccepteerd.` : " "}
        actions={<Button variant="primary" icon={<FilePlus />} onClick={() => patch({ new: "1" })}>Nieuwe offerte</Button>}
      />
      <div className="s-row between">
        <Segmented<Filter> label="Filter" value={filter} onChange={setFilter} options={[
          { value: "open", label: "Open" }, { value: "accepted", label: "Geaccepteerd" }, { value: "declined", label: "Afgewezen" }, { value: "all", label: "Alles" },
        ]} />
        <label className="s-searchbox" style={{ width: 260 }}>
          <Search /><input placeholder="Zoek nummer, titel of klant" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoek offertes" />
        </label>
      </div>
      {quotes.isError && <ErrorState error={quotes.error} retry={() => quotes.refetch()} />}
      <Card bodyClass="none">
        {quotes.isLoading ? <SkeletonList rows={4} /> : rows.length === 0 ? (
          <Empty title="Geen offertes" action={<Button onClick={() => patch({ new: "1" })}>Maak een offerte</Button>}>
            {filter === "open" ? "Er staat niets open." : "Niets gevonden met dit filter."}
          </Empty>
        ) : (
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th>Nummer</th><th>Titel</th><th>Klant</th><th className="right">Bedrag</th><th>Status</th><th>Laatste stap</th><th /></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className="clickable" onClick={() => patch({ open: x.id })}>
                    <td className="s-mono"><Link to={href({ open: x.id })} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>{x.number}</Link></td>
                    <td style={{ fontWeight: 600 }}>{x.title}</td>
                    <td className="s-muted">{x.clientName || x.clientEmail || "–"}</td>
                    <td className="right s-mono">{euro(x.totals.oneTime)}{x.totals.monthly ? <span className="s-faint"> + {euro(x.totals.monthly)} p/m</span> : null}</td>
                    <td><Pill tone={QUOTE_STATUS[x.status].tone}>{QUOTE_STATUS[x.status].label}</Pill></td>
                    <td className="s-muted s-small">
                      {x.respondedAt ? `Antwoord ${ago(x.respondedAt)}`
                        : x.viewedAt ? `Bekeken ${ago(x.viewedAt)}${x.viewCount > 1 ? ` (${x.viewCount}×)` : ""}`
                        : x.sentAt ? `Verstuurd ${ago(x.sentAt)}, nog niet geopend`
                        : `Aangemaakt ${fmtDate(x.createdAt)}`}
                    </td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div className="s-row nowrap" style={{ justifyContent: "flex-end" }}>
                        {x.status === "accepted" && <Button size="sm" icon={<Receipt />} loading={toInvoice.isPending && toInvoice.variables === x.id} onClick={() => toInvoice.mutate(x.id)}>Factuur</Button>}
                        <Button size="sm" variant="ghost" iconOnly aria-label="Link kopiëren" title="Link kopiëren" icon={<Copy />} onClick={() => copyText(x.link)} />
                        <a className="s-btn ghost sm icon" href={`${new URL(x.link).pathname}${new URL(x.link).search}&preview=1`} target="_blank" rel="noreferrer" aria-label="Bekijk zoals de klant" title="Bekijk zoals de klant"><Eye size={15} /></a>
                        <Button size="sm" variant="ghost" iconOnly aria-label="Versturen" title="Versturen" icon={<Send />} onClick={() => setSending(x)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {(creating || editing) && (
        <QuoteEditor
          quote={editing}
          defaults={{ projectId: params.get("projectId") || "", clientId: params.get("clientId") || "" }}
          onClose={() => patch(EDITOR_CLOSED)}
          onSend={(saved) => { patch(EDITOR_CLOSED); setSending(saved); }}
        />
      )}
      <SendQuoteDialog quote={sending} onClose={() => setSending(null)} />
      <p className="s-small s-faint">Geaccepteerde offertes zetten het project op <Link to="/admin/pipeline">Geboekt</Link> en maken een taak aan.</p>
    </div>
  );
}
