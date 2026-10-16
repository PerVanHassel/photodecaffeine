import { euro, fmtDate } from "../format";
import type { Business, Invoice } from "../types";

type Doc = Pick<Invoice, "number" | "clientName" | "clientAddress" | "clientEmail" | "issuedOn" | "dueOn" | "lines" | "totals" | "notes">;

// jsPDF's built-in fonts only know WinAnsi; Intl puts (narrow) no-break spaces in amounts.
const clean = (s: string) => String(s ?? "").replace(/[  ]/g, " ");

/** Builds the invoice as a real A4 PDF (selectable text) and hands it to the browser as a download. */
export async function downloadInvoicePdf(inv: Doc, business: Business): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 20, R = 190, BOTTOM = 277;
  const INK: [number, number, number] = [26, 22, 19];
  const FAINT: [number, number, number] = [128, 120, 112];
  const RULE: [number, number, number] = [222, 216, 208];

  const font = (size: number, bold = false, color = INK) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const text = (s: string, x: number, y: number, align: "left" | "right" = "left") => doc.text(clean(s), x, y, { align });
  const lines = (s: string, width: number) => doc.splitTextToSize(clean(s), width) as string[];
  const rule = (y: number) => { doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(L, y, R, y); };

  // Header: number left, business right.
  font(8, true, FAINT); text("FACTUUR", L, 26);
  font(22, true); text(inv.number, L, 36);
  let yr = 26;
  font(10, true); text(business.name, R, yr, "right"); yr += 5;
  font(9);
  for (const s of [...(business.address ? business.address.split("\n") : []), business.kvk && `KvK ${business.kvk}`, business.vatNumber && `Btw ${business.vatNumber}`, business.email]) {
    if (s) { text(s, R, yr, "right"); yr += 4.5; }
  }

  // Client left, dates right.
  let y = Math.max(52, yr + 8);
  font(8, true, FAINT); text("AAN", L, y);
  let yl = y + 6;
  font(10, true);
  for (const s of lines(inv.clientName || inv.clientEmail, 100)) { text(s, L, yl); yl += 5; }
  font(9);
  for (const s of inv.clientAddress ? inv.clientAddress.split("\n").flatMap((p) => lines(p, 100)) : []) { text(s, L, yl); yl += 4.5; }
  font(9, false, FAINT); text("Factuurdatum", R - 32, y + 6, "right"); text("Te betalen voor", R - 32, y + 11, "right");
  font(9, true); text(fmtDate(inv.issuedOn), R, y + 6, "right"); text(fmtDate(inv.dueOn), R, y + 11, "right");

  // Lines.
  const COL = { qty: 130, price: 160, amount: R };
  const head = (at: number) => {
    font(8, true, FAINT);
    text("OMSCHRIJVING", L, at); text("AANTAL", COL.qty, at, "right"); text("PRIJS", COL.price, at, "right"); text("BEDRAG", COL.amount, at, "right");
    rule(at + 2.5);
    return at + 8;
  };
  y = head(Math.max(yl, y + 11) + 12);
  for (const l of inv.lines) {
    font(10);
    const label = lines(l.label, 95);
    font(8.5);
    const note = l.note ? lines(l.note, 95) : [];
    const h = label.length * 5 + note.length * 4 + 4;
    if (y + h > BOTTOM) { doc.addPage(); y = head(26); }
    font(10);
    label.forEach((s, i) => text(s, L, y + i * 5));
    text(String(l.quantity), COL.qty, y, "right");
    text(euro(l.amount), COL.price, y, "right");
    text(euro(l.quantity * l.amount), COL.amount, y, "right");
    font(8.5, false, FAINT);
    note.forEach((s, i) => text(s, L, y + label.length * 5 + i * 4 - 1));
    y += h;
    rule(y - 3);
  }

  // Totals.
  if (y + 30 > BOTTOM) { doc.addPage(); y = 26; }
  y += 4;
  const total = (label: string, value: string, bold = false) => {
    font(bold ? 11 : 9.5, bold, bold ? INK : FAINT); text(label, 130, y);
    font(bold ? 11 : 9.5, bold); text(value, R, y, "right");
    y += bold ? 7 : 5.5;
  };
  total("Subtotaal", euro(inv.totals.net));
  total(`Btw ${inv.totals.vatRate}%`, euro(inv.totals.vat));
  doc.setDrawColor(...RULE); doc.line(130, y - 3, R, y - 3); y += 1.5;
  total("Totaal", euro(inv.totals.total), true);

  // Notes and payment.
  y += 6;
  const para = (s: string, color = INK) => {
    font(9, false, color);
    for (const ln of s.split("\n").flatMap((p) => lines(p, R - L))) {
      if (y > BOTTOM) { doc.addPage(); y = 26; }
      text(ln, L, y); y += 4.5;
    }
    y += 3;
  };
  if (inv.notes) para(inv.notes, FAINT);
  if (business.iban) para(`Graag overmaken naar ${business.iban} t.n.v. ${business.name}, onder vermelding van ${inv.number}.`);

  doc.setProperties({ title: `Factuur ${inv.number}`, author: business.name });
  doc.save(`Factuur ${inv.number}.pdf`);
}
