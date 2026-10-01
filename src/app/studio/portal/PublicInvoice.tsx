import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import { get } from "../api";
import { InvoiceDocument } from "../components/InvoiceDocument";
import { StudioFonts } from "../fonts";
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

function Inner() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const data = useQuery({
    queryKey: ["public-invoice", id, token],
    queryFn: () => get<{ invoice: Invoice; business: Business }>(`/invoice/${id}?t=${encodeURIComponent(token)}`),
    retry: false,
  });
  const inv = data.data?.invoice;

  return (
    <div className="studio" style={{ background: "var(--sunken)", padding: "32px 16px" }}>
      <StudioFonts />
      <div className="s-view narrow" style={{ margin: "0 auto", maxWidth: 820 }}>
        {data.isError ? <ErrorState error={data.error} /> : !inv ? <Skeleton h={600} r={12} /> : (
          <>
            <div className="s-row between no-print">
              <Pill tone={inv.status === "paid" ? "ok" : inv.overdue ? "bad" : "info"}>{inv.status === "paid" ? "Betaald" : inv.overdue ? "Te laat" : inv.status === "void" ? "Vervallen" : "Open"}</Pill>
              <Button icon={<Printer />} onClick={() => window.print()}>Printen of opslaan als PDF</Button>
            </div>
            <InvoiceDocument invoice={inv} business={data.data!.business} />
          </>
        )}
      </div>
    </div>
  );
}
