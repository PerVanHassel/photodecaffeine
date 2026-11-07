import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Clock, CreditCard, Download, Loader2, Printer } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { get, post } from "../api";
import { InvoiceDocument } from "../components/InvoiceDocument";
import { downloadInvoicePdf } from "../components/invoicePdf";
import { StudioFonts } from "../fonts";
import { euro } from "../format";
import { queryClient } from "../queries";
import { QueryClientProvider } from "@tanstack/react-query";
import "../studio.css";
import type { Business, Invoice } from "../types";
import { Button, ErrorState, Pill, Skeleton } from "../ui";

/** The client's copy of an invoice, opened from the emailed link (the token stands in for a login). */
export function PublicInvoicePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner />
    </QueryClientProvider>
  );
}

// After Mollie's page: still asking, paid, not confirmed yet, not paid, or stopped by the client.
type Back = "checking" | "paid" | "waiting" | "failed" | "stopped" | null;

function Inner() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const token = params.get("t") || "";
  // While payments run on Mollie's test key, the button only shows with ?test=1.
  const test = params.get("test") === "1";
  const data = useQuery({
    queryKey: ["public-invoice", id, token, test],
    queryFn: () => get<{ invoice: Invoice; business: Business }>(`/invoice/${id}?t=${encodeURIComponent(token)}${test ? "&test=1" : ""}`),
    retry: false,
  });
  const inv = data.data?.invoice;
  const [saving, setSaving] = useState(false);
  async function download() {
    setSaving(true);
    try { await downloadInvoicePdf(inv!, data.data!.business); } finally { setSaving(false); }
  }

  const [back, setBack] = useState<Back>(() => (params.get("betaling") === "terug" ? "checking" : params.get("betaling") === "gestopt" ? "stopped" : null));
  // Back from Mollie: ask how it went, a few times while the bank finishes.
  useEffect(() => {
    if (!params.get("betaling")) return;
    // The answer is shown now; a reload should not ask again.
    const rest = new URLSearchParams(params);
    rest.delete("betaling");
    setParams(rest, { replace: true });
    if (back !== "checking") return;
    let stopped = false;
    let tries = 0;
    const ask = async () => {
      try {
        const r = await post<{ status: string }>(`/invoice/${id}/payment-check`, { token });
        if (stopped) return;
        if (r.status === "paid") { setBack("paid"); data.refetch(); return; }
        if (r.status === "canceled" || r.status === "expired" || r.status === "failed") { setBack("failed"); return; }
        // Still open a few seconds on: the client came back without paying
        // (Mollie's back button). Pending means the bank is still busy.
        if (r.status === "open" && tries >= 2) { setBack("stopped"); return; }
      } catch {
        // Asked again below.
      }
      if (stopped) return;
      if (++tries >= 10) { setBack("waiting"); return; }
      setTimeout(ask, 3000);
    };
    ask();
    return () => { stopped = true; };
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const r = await post<{ checkoutUrl: string }>(`/invoice/${id}/pay`, { token, test });
      // Stays "loading" while the browser goes to Mollie.
      window.location.assign(r.checkoutUrl);
    } catch (err) {
      setPayError((err as Error).message);
      setPaying(false);
    }
  }

  const canPay = !!inv?.payable && back !== "paid" && back !== "checking";
  const status = !inv ? null : inv.status === "paid" || back === "paid" ? "paid" : inv.overdue ? "late" : inv.status;

  return (
    <div className="studio" style={{ background: "var(--sunken)", padding: "32px 16px", minHeight: "100vh" }}>
      <StudioFonts />
      <div className="s-view narrow" style={{ margin: "0 auto", maxWidth: 820 }}>
        {data.isError ? <ErrorState error={data.error} /> : !inv ? <Skeleton h={600} r={12} /> : (
          <>
            <div className="s-row between no-print">
              <Pill tone={status === "paid" ? "ok" : status === "late" ? "bad" : "info"}>{status === "paid" ? "Betaald" : status === "late" ? "Te laat" : status === "void" ? "Vervallen" : "Open"}</Pill>
              <div className="s-row">
                <Button icon={<Printer />} onClick={() => window.print()}>Printen</Button>
                <Button variant={canPay ? "default" : "primary"} icon={<Download />} loading={saving} onClick={download}>Download PDF</Button>
              </div>
            </div>

            {back === "checking" && <Notice tone="info" icon={<Loader2 size={16} className="spin" />}>We kijken of je betaling binnen is…</Notice>}
            {back === "paid" && <Notice tone="ok" icon={<CircleCheck size={16} />}>Betaald, dank je wel. Je krijgt een bevestiging per mail.</Notice>}
            {back === "waiting" && <Notice tone="info" icon={<Clock size={16} />}>Je bank heeft de betaling nog niet bevestigd. Dat kan een paar minuten duren. Je krijgt een mail zodra hij binnen is.</Notice>}
            {back === "failed" && <Notice tone="bad" icon={<CircleAlert size={16} />}>De betaling is niet gelukt. Probeer het nog een keer, of maak het bedrag over.</Notice>}
            {back === "stopped" && <Notice tone="info" icon={<CircleAlert size={16} />}>Je hebt het betalen afgebroken. Je kunt het opnieuw proberen wanneer je wilt.</Notice>}

            {canPay && (
              <div className="s-card no-print">
                <div className="s-card-body s-row between" style={{ gap: 16, flexWrap: "wrap" }}>
                  <div className="s-stack sm" style={{ flex: "1 1 260px" }}>
                    <b>Direct online betalen{inv.onlineTest && <> <Pill tone="warn">Test</Pill></>}</b>
                    <span className="s-small s-muted">Met iDEAL | Wero, je kaart of Bancontact, op de beveiligde betaalpagina van Mollie. Liever overmaken? Dat kan ook, de gegevens staan onderaan de factuur.</span>
                  </div>
                  <Button variant="primary" icon={<CreditCard />} loading={paying} onClick={pay}>Betaal {euro(inv.totals.total)}</Button>
                </div>
                {payError && <p className="s-small" role="alert" style={{ color: "var(--bad)", padding: "0 20px 16px", margin: 0 }}>{payError}</p>}
              </div>
            )}

            <InvoiceDocument invoice={back === "paid" && inv.status !== "paid" ? { ...inv, status: "paid", paidAt: new Date().toISOString() } : inv} business={data.data!.business} />
          </>
        )}
      </div>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: "ok" | "bad" | "info"; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="s-row nowrap no-print" role="status" style={{ gap: 10, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: `var(--${tone}-soft)`, color: `var(--${tone})` }}>
      <span style={{ display: "inline-flex", marginTop: 2 }} aria-hidden="true">{icon}</span>
      <span className="s-small" style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}
