import {
  lineTotal, percentTotal, todayIso, workdaysBetween,
  type Business, type QuoteDoc, type QuoteLine,
} from "../../components/quote/model";

/**
 * What has to be on a quote before it goes out, checked against the draft as
 * it is being built. The list follows PDC's own terms (Websitebeleid &
 * Gebruiksrechten, the parts approved so far: 10 working days valid, 40% on
 * booking, 14 days to pay, 3 revision rounds, 10 working days for feedback),
 * Martine's advice of 21 October 2026, and what Dutch law asks of a price
 * given to a consumer or a business.
 *
 * - error: the quote is wrong or incomplete; fix before sending.
 * - todo:  still open, often an internal open point.
 * - warn:  probably fine, but look again.
 * - ok:    in order.
 */

export type CheckState = "ok" | "warn" | "todo" | "error";

export type CheckSection =
  | "basis" | "client" | "intro" | "problem" | "scope" | "price" | "payment" | "planning"
  | "maintenance" | "rights" | "aftercare" | "terms" | "open";

export interface CheckItem {
  id: string;
  group: "Gegevens" | "Wat je krijgt" | "Prijs" | "Afspraken" | "Rechten" | "Versturen";
  label: string;
  state: CheckState;
  hint?: string;
  section: CheckSection;
  /** A one-click repair the builder can offer. */
  fix?: "validUntil" | "vatIncl";
}

export const STATE_ORDER: Record<CheckState, number> = { error: 0, todo: 1, warn: 2, ok: 3 };

const filled = (s: string | undefined | null) => !!s && s.trim().length > 0;
const hasDigit = (s: string) => /\d/.test(s);

export function quoteChecklist(q: QuoteDoc, business: Business | null | undefined): CheckItem[] {
  const d = q.details || {};
  const services = d.services || [];
  const web = services.includes("web");
  const media = services.includes("photo") || services.includes("video");
  const consumer = d.audience === "consumer";
  const lines: QuoteLine[] = [...(q.oneTime || []), ...(q.monthly || [])];
  const items: CheckItem[] = [];
  const add = (i: CheckItem) => items.push(i);

  // ── Gegevens ──
  const missingBiz = [!filled(business?.address) && "adres", !filled(business?.kvk) && "KVK-nummer", !filled(business?.vatNumber) && "btw-nummer", !filled(business?.email) && "e-mail"].filter(Boolean);
  add({
    id: "pdc", group: "Gegevens", section: "basis",
    label: "Gegevens van PDC: naam, adres, KVK, btw-nummer",
    state: business ? (missingBiz.length ? "error" : "ok") : "warn",
    hint: business ? (missingBiz.length ? `Ontbreekt: ${missingBiz.join(", ")}. Vul ze in bij Instellingen.` : undefined) : "Worden geladen.",
  });
  add({
    id: "number", group: "Gegevens", section: "basis",
    label: "Offertenummer en datum",
    state: q.number ? "ok" : "todo",
    hint: q.number ? undefined : "Het nummer komt er bij het opslaan op; de datum is de dag van versturen.",
  });
  add({
    id: "client", group: "Gegevens", section: "client",
    label: consumer ? "Naam en e-mail van de klant" : "Bedrijf, contactpersoon en e-mail",
    state: !filled(q.clientName) || !filled(q.clientEmail) ? "error" : !consumer && !filled(d.client?.company) ? "warn" : "ok",
    hint: !filled(q.clientEmail) ? "Zonder e-mail kan de offerte niet weg." : !filled(q.clientName) ? "Zet de naam erop." : !consumer && !filled(d.client?.company) ? "Zakelijk: zet de bedrijfsnaam erbij. Die komt ook op de factuur." : undefined,
  });
  add({
    id: "address", group: "Gegevens", section: "client",
    label: "Adres van de klant",
    state: filled(d.client?.address) ? "ok" : "warn",
    hint: filled(d.client?.address) ? undefined : "Hoeft niet op de offerte, wel op de factuur. Vraag het nu, dan heb je het straks.",
  });
  const abroad = filled(d.client?.country) && !/^(nl|nederland|netherlands)$/i.test(d.client!.country!.trim());
  if (abroad && !consumer) {
    add({
      id: "abroad", group: "Gegevens", section: "client",
      label: "Zakelijke klant in het buitenland",
      state: filled(d.client?.vatId) ? "warn" : "error",
      hint: "Binnen de EU is de btw bij een zakelijke klant meestal verlegd. Zet het btw-nummer van de klant erbij en check het tarief.",
    });
  }

  // ── Wat je krijgt ──
  add({ id: "title", group: "Wat je krijgt", section: "basis", label: "Titel", state: filled(q.title) ? "ok" : "error", hint: filled(q.title) ? undefined : "Geef de offerte een titel." });
  add({
    id: "services", group: "Wat je krijgt", section: "basis", label: "Soort werk gekozen (website, foto, video)",
    state: services.length ? "ok" : "error", hint: services.length ? undefined : "Daar hangt van af welke afspraken erop moeten.",
  });
  add({
    id: "problem", group: "Wat je krijgt", section: "problem", label: "Wat het de klant oplevert",
    state: filled(d.problem) ? "ok" : "warn",
    hint: filled(d.problem) ? undefined : "Verkoop het probleem dat je oplost, niet alleen wat je maakt (tip van Martine).",
  });
  const included = (q.included || []).filter(filled);
  add({
    id: "included", group: "Wat je krijgt", section: "scope", label: "Wat er inbegrepen is",
    state: included.length >= 3 ? "ok" : included.length ? "warn" : "error",
    hint: included.length >= 3 ? undefined : "Noem concreet wat de klant krijgt: pagina's, functies, aantallen.",
  });
  if (media) {
    const counts = [...included, ...lines.map((l) => `${l.label} ${l.note || ""} ${l.qty || ""}`)].some(hasDigit);
    add({
      id: "counts", group: "Wat je krijgt", section: "scope", label: "Aantallen en formaten (beelden, minuten, versies)",
      state: counts ? "ok" : "warn",
      hint: counts ? undefined : "Zet erbij hoeveel foto's of hoe lang de video wordt. Meer is meerprijs.",
    });
  }
  const excluded = (d.excluded || []).filter(filled);
  add({
    id: "excluded", group: "Wat je krijgt", section: "scope", label: "Wat er niet bij zit",
    state: excluded.length ? "ok" : "warn",
    hint: excluded.length ? undefined : "Voorkomt discussie achteraf, bijvoorbeeld teksten schrijven of hosting.",
  });

  // ── Prijs ──
  const priced = lines.filter((l) => filled(l.label));
  add({
    id: "lines", group: "Prijs", section: "price", label: "Minstens één bedrag",
    state: priced.filter((l) => !l.optional).length ? "ok" : "error",
    hint: priced.length ? undefined : "Zet er een eenmalig of maandelijks bedrag in.",
  });
  const zero = priced.filter((l) => lineTotal(l) === 0);
  add({
    id: "zero", group: "Prijs", section: "price", label: "Elke regel heeft een bedrag",
    state: zero.length ? "error" : "ok",
    hint: zero.length ? `${zero.map((l) => `"${l.label}"`).join(", ")} staat op € 0.` : undefined,
  });
  const unnamed = [...(q.oneTime || []), ...(q.monthly || [])].filter((l) => !filled(l.label) && lineTotal(l) !== 0);
  if (unnamed.length) add({ id: "unnamed", group: "Prijs", section: "price", label: "Elke regel heeft een omschrijving", state: "error", hint: "Een bedrag zonder omschrijving valt weg bij het opslaan." });
  const rate = Number(q.vatRate);
  add({
    id: "vat", group: "Prijs", section: "price",
    label: consumer ? "Particulier: bedragen inclusief btw" : "Btw duidelijk: exclusief of inclusief",
    state: consumer && q.vatBasis !== "incl" ? "error" : ![0, 9, 21].includes(rate) ? "warn" : "ok",
    hint: consumer && q.vatBasis !== "incl" ? "Een particulier krijgt prijzen inclusief btw." : ![0, 9, 21].includes(rate) ? `${rate}% is geen gewoon tarief. Klopt dat?` : undefined,
    fix: consumer && q.vatBasis !== "incl" ? "vatIncl" : undefined,
  });
  if (web) {
    add({
      id: "monthly", group: "Prijs", section: "price", label: "Maandkosten en wat ze dekken",
      state: (q.monthly || []).length ? "ok" : "warn",
      hint: (q.monthly || []).length ? undefined : "Geen maandkosten? Zeg dan wie onderhoud en hosting doet.",
    });
    const extra = (d.extraCosts || []).filter(filled);
    const hosting = extra.some((s) => /host|domein/i.test(s)) || lines.some((l) => /host|domein/i.test(l.label));
    add({
      id: "hosting", group: "Prijs", section: "price", label: "Hosting en domein: wie betaalt wat",
      state: hosting ? "ok" : "warn",
      hint: hosting ? undefined : "Zet erbij of hosting en domein erbij komen, en hoe (doorbelast zonder opslag, of de klant betaalt zelf).",
    });
  }
  if (lines.some((l) => l.optional)) {
    add({ id: "options", group: "Prijs", section: "price", label: "Opties tellen niet mee in het totaal", state: "ok", hint: "De klant vinkt ze aan bij akkoord; de factuur rekent ze mee." });
  }

  // ── Afspraken ──
  const steps = d.payment?.steps || [];
  const pct = percentTotal(steps);
  add({
    id: "payment", group: "Afspraken", section: "payment", label: "Betaalmomenten tellen op tot 100%",
    state: steps.length === 0 ? "error" : Math.abs(pct - 100) > 0.01 ? "error" : "ok",
    hint: steps.length === 0 ? "Zet erop wanneer er betaald wordt, bijvoorbeeld 40% bij akkoord en 60% bij oplevering." : Math.abs(pct - 100) > 0.01 ? `Nu ${pct}%.` : undefined,
  });
  const term = Number(d.payment?.termDays) || 0;
  add({
    id: "term", group: "Afspraken", section: "payment", label: "Betaaltermijn (14 dagen)",
    state: term > 0 ? (term === 14 ? "ok" : "warn") : "error",
    hint: term > 0 ? (term === 14 ? undefined : `${term} dagen, de voorwaarden zeggen 14.`) : "Zet de betaaltermijn erop.",
  });
  add({
    id: "planning", group: "Afspraken", section: "planning", label: "Planning: wanneer start en klaar",
    state: filled(d.planning) ? "ok" : "warn", hint: filled(d.planning) ? undefined : "Een verwachte duur of datum, en waar die van afhangt.",
  });
  add({
    id: "delivers", group: "Afspraken", section: "planning", label: "Wat de klant aanlevert",
    state: (d.clientDelivers || []).some(filled) ? "ok" : "warn", hint: (d.clientDelivers || []).some(filled) ? undefined : "Teksten, logo, toegang tot domein of locatie.",
  });
  if (web || services.includes("video")) {
    const rev = d.revisions;
    add({
      id: "revisions", group: "Afspraken", section: "planning", label: "Revisierondes en feedbacktermijn",
      state: !rev ? "error" : rev.untilRight ? "warn" : rev.rounds > 0 && rev.feedbackDays > 0 ? "ok" : "error",
      hint: !rev ? "Zet erop hoeveel rondes er inzitten (standaard 3)." : rev.untilRight ? "\"Tot het klopt\" is alleen voor familie en vrienden. Anders 3 rondes." : undefined,
    });
  }
  add({
    id: "extrawork", group: "Afspraken", section: "aftercare", label: "Uurtarief voor meerwerk",
    state: (d.extraWork?.hourly || 0) > 0 ? "ok" : "warn", hint: (d.extraWork?.hourly || 0) > 0 ? undefined : "Wat kost werk buiten deze offerte?",
  });
  if (web) {
    add({
      id: "aftercare", group: "Afspraken", section: "aftercare", label: "Nazorg na livegang",
      state: d.aftercare?.days || filled(d.aftercare?.note) ? "ok" : "warn",
      hint: d.aftercare?.days || filled(d.aftercare?.note) ? undefined : "Hoe lang herstel je gratis als iets na livegang niet werkt, en wanneer wordt het meerwerk?",
    });
    if ((q.monthly || []).length) {
      const m = d.maintenance;
      add({
        id: "smallchange", group: "Afspraken", section: "maintenance", label: "Wat onderhoud dekt, en wat een kleine wijziging is",
        state: m && m.covers?.some(filled) && filled(m.smallChange) ? "ok" : "warn",
        hint: m && m.covers?.some(filled) && filled(m.smallChange) ? undefined : "Omschrijf wat er onder een kleine wijziging valt (tip van Martine).",
      });
      add({
        id: "cancel", group: "Afspraken", section: "maintenance", label: "Opzeggen: hoe en wat er dan gebeurt",
        state: filled(m?.cancel) ? "ok" : "warn", hint: filled(m?.cancel) ? undefined : "Per maand opzegbaar? En wat gebeurt er met de site?",
      });
    }
  }
  const days = q.validUntil ? workdaysBetween(todayIso(), q.validUntil) : 0;
  add({
    id: "valid", group: "Afspraken", section: "terms", label: "Geldig tot (10 werkdagen)",
    state: !q.validUntil ? "error" : q.validUntil < todayIso() ? "error" : days < 5 ? "warn" : "ok",
    hint: !q.validUntil ? "Zet er een datum op." : q.validUntil < todayIso() ? "Die datum is al voorbij." : days < 5 ? `Nog ${days} werkdagen. Zet hem op 10 werkdagen vanaf vandaag.` : undefined,
    fix: !q.validUntil || q.validUntil < todayIso() || days < 5 ? "validUntil" : undefined,
  });

  // ── Rechten ──
  if (web) {
    const own = d.ownership;
    add({
      id: "ownership", group: "Rechten", section: "rights", label: "Van wie zijn website, broncode en accounts",
      state: own && own.rows?.some((r) => filled(r.what) && filled(r.owner)) ? "ok" : "error",
      hint: own && own.rows?.length ? undefined : "Huren of kopen, en van wie domein, teksten, ontwerp en accounts zijn.",
    });
    if (own?.model !== "buy") {
      add({
        id: "buyout", group: "Rechten", section: "rights", label: "Wat kopen (afkoop) kost",
        state: own?.buyout != null && own.buyout > 0 ? "ok" : "todo",
        hint: own?.buyout != null && own.buyout > 0 ? undefined : "Vul de afkoopprijs in, zodat de klant weet hoe hij de site kan meenemen.",
      });
    }
  }
  if (media) {
    const lic = d.license;
    add({
      id: "license", group: "Rechten", section: "rights", label: "Licentie: wie, waarvoor, welke kanalen, hoe lang",
      state: lic && filled(lic.holder) && lic.channels?.length && filled(lic.duration) ? "ok" : "error",
      hint: lic && filled(lic.holder) ? undefined : "Zonder licentie mag de klant de beelden eigenlijk niet gebruiken.",
    });
    add({
      id: "portfolio", group: "Rechten", section: "rights", label: "Portfolio: alleen met aparte toestemming",
      state: lic && filled(lic.portfolio) ? "ok" : "warn", hint: "Vraag het apart, nooit vooraf aangevinkt.",
    });
  }

  // ── Versturen ──
  const open = (d.openPoints || []).filter(filled);
  open.forEach((p, i) => add({ id: `open${i}`, group: "Versturen", section: "open", label: p, state: "todo", hint: "Intern open punt. De klant ziet dit niet." }));
  add({
    id: "terms", group: "Versturen", section: "terms", label: "Algemene voorwaarden",
    state: filled(d.termsVersion) ? "ok" : "warn",
    hint: filled(d.termsVersion) ? undefined : "De voorwaarden staan nog niet op de site. Zet de belangrijke afspraken daarom in de offerte zelf, zoals hier.",
  });
  if (consumer) add({ id: "withdraw", group: "Versturen", section: "terms", label: "Bedenktijd voor particulieren staat erop", state: "ok" });

  return items;
}

/** Counts per state, for the summary at the top of the list. */
export function checkSummary(items: CheckItem[]) {
  const by = (s: CheckState) => items.filter((i) => i.state === s).length;
  return { total: items.length, ok: by("ok"), warn: by("warn"), todo: by("todo"), error: by("error") };
}

// ---------------------------------------------------------------------------
// Invoices: what the Belastingdienst requires on every invoice.
// ---------------------------------------------------------------------------

export interface InvoiceCheckInput {
  number: string;
  issuedOn: string;
  dueOn: string;
  clientName: string;
  clientAddress: string;
  lines: { label: string; quantity: number; amount: number; note: string }[];
  notes: string;
  vatRate: number;
}

const MONTHS = /januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|\d{1,2}[-/.]\d{1,2}/i;

export function invoiceChecklist(inv: InvoiceCheckInput, business: Business | null | undefined): CheckItem[] {
  const items: CheckItem[] = [];
  const add = (label: string, ok: boolean, hint?: string, state: CheckState = "error") =>
    items.push({ id: label, group: "Gegevens", section: "basis", label, state: ok ? "ok" : state, hint: ok ? undefined : hint });
  add("Uniek, opvolgend factuurnummer", !!inv.number);
  add("Factuurdatum", !!inv.issuedOn);
  add("Naam en adres van PDC", filled(business?.name) && filled(business?.address), "Vul het adres in bij Instellingen.");
  add("KVK-nummer van PDC", filled(business?.kvk), "Vul het in bij Instellingen.");
  add("Btw-nummer van PDC", filled(business?.vatNumber), "Vul het in bij Instellingen.");
  add("Naam van de klant", filled(inv.clientName), "Bij een bedrijf: de bedrijfsnaam.");
  add("Adres van de klant", filled(inv.clientAddress), "Verplicht op een factuur aan een bedrijf; vraag het na.", "warn");
  add("Omschrijving en aantal per regel", inv.lines.length > 0 && inv.lines.every((l) => filled(l.label) && l.quantity > 0), "Elke regel een omschrijving en een aantal.");
  const dated = [inv.notes, ...inv.lines.map((l) => `${l.label} ${l.note}`)].some((s) => MONTHS.test(s || ""));
  add("Datum of periode van de levering", dated, "Zet erbij wanneer het werk is gedaan, bijvoorbeeld 'geleverd op 12 oktober' of 'aanbetaling'.", "warn");
  add("Btw-tarief en btw-bedrag", [0, 9, 21].includes(Number(inv.vatRate)), "Gebruik 21%, 9% of 0% met reden.", "warn");
  const days = inv.issuedOn && inv.dueOn ? Math.round((new Date(inv.dueOn).getTime() - new Date(inv.issuedOn).getTime()) / 86400000) : -1;
  add("Betaaltermijn 14 dagen", days === 14, days < 0 ? "Zet een vervaldatum." : `Nu ${days} dagen; de voorwaarden zeggen 14.`, days < 0 ? "error" : "warn");
  add("IBAN om naar over te maken", filled(business?.iban), "Vul het in bij Instellingen.");
  return items;
}
