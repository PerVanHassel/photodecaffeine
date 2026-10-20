// What a declaration needs, read from the text of an invoice or receipt: the
// total, the VAT rate, the date and who it is from. Plain rules, no outside
// service. The text comes from the PDF itself or from OCR on a photo (see
// read.ts), and the person checks the form before submitting it.

export type ReceiptFields = {
  amount: number | null;
  vatRate: number | null;
  date: string | null;
  description: string;
  category: string | null;
};

export type Parsed = { fields: ReceiptFields; notice?: string };

const MONTHS: Record<string, number> = {
  januari: 1, january: 1, jan: 1, februari: 2, february: 2, feb: 2, maart: 3, march: 3, mrt: 3, mar: 3,
  april: 4, apr: 4, mei: 5, may: 5, juni: 6, june: 6, jun: 6, juli: 7, july: 7, jul: 7,
  augustus: 8, august: 8, aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

// 130,05 · 1.234,56 · 1,234.56 · 13,- ; not part of a date (12.08.2026) or a percentage.
const MONEY = /(?<![\d.,])(-?\d{1,3}(?:[.,']\d{3})+|-?\d+)[.,](\d{2}|-)(?![\d]|[.,]\d)(?!\s*%)/g;

const TOTAL_STRONG = /(totaal\s*(te\s*betalen|incl|bedrag|generaal|factuur)|te\s*(betalen|voldoen)|eindtotaal|totaalbedrag|factuurbedrag|factuurtotaal|total\s*(due|amount|incl|paid|to\s*pay|payable)|amount\s*(due|paid|payable)|grand\s*total|balance\s*due|bedrag\s*incl)/;
const TOTAL = /(totaal|total|totale)/;
const PAID = /\b(pin|pinnen|betaald|paid|contant|cash|maestro|v ?pay|visa|mastercard|creditcard|ideal|bancontact|bedrag)\b/;
const NOT_TOTAL = /(sub\s*-?\s*tota|excl|exclusief|netto|net\s*amount|zonder\s*btw|korting|discount|verzend|shipping|statiegeld|wisselgeld|retour|terug|\bchange\b|vorig|previous)/;
const VAT_WORD = /(\bbtw\b|b\.t\.w|\bvat\b|\btax\b|omzetbelasting|\bmwst\b|\bust\b|\btva\b|\biva\b)/;
const VAT_NONE = /(verlegd|reverse[\s-]*charge|vat\s*reverse|intracommunautair|intra[\s-]*community|vrijgesteld|exempt|kleineondernemersregeling|\bkor\b)/;

const DATE_ISSUE = /(factuur\s*datum|factuurdatum|datum\s*factuur|invoice\s*date|date\s*of\s*issue|issue\s*date|date\s*issued|datum\s*van\s*uitgifte|uitgiftedatum)/;
const DATE_LABEL = /(datum|date|besteld|order|aankoop|transactie|kassabon|bon\b)/;
const DATE_OTHER = /(verval|\bdue\b|betaal\s*(voor|vóór|uiterlijk)|uiterlijk|lever|deliver|geldig|valid|verloop|expir|periode|period|vanaf|t\/m|tot\s*en\s*met|volgende|next|\bend\b|eind)/;

// The studio itself is on every invoice as the customer; it is never the supplier.
const OWN = /(photo\s*de\s*caffeine|photodecaffeine|pdc\s*productions|van\s*hassel)/i;

type Supplier = { name: string; match: RegExp; category: string | null };
const s = (name: string, match: RegExp, category: string | null): Supplier => ({ name, match, category });
// Who a photo and video studio buys from. The category is left out where a
// shop sells everything; the words on the invoice decide then.
const SUPPLIERS: Supplier[] = [
  s("Cameranu", /camera\s*nu\b|cameranu/i, "Apparatuur"),
  s("Kamera Express", /kamera[\s-]*express/i, "Apparatuur"),
  s("Foto Konijnenberg", /foto\s*konijnenberg|fotokonijnenberg/i, "Apparatuur"),
  s("Calumet", /\bcalumet\b/i, "Apparatuur"),
  s("Coolblue", /\bcoolblue\b/i, "Apparatuur"),
  s("MediaMarkt", /media\s*markt/i, "Apparatuur"),
  s("Alternate", /\balternate\b/i, "Apparatuur"),
  s("Megekko", /\bmegekko\b/i, "Apparatuur"),
  s("Bol.com", /\bbol\.com\b|\bbol\b/i, null),
  s("Amazon", /\bamazon\b/i, null),
  s("Adobe", /\badobe\b/i, "Software & Abonnementen"),
  s("Google", /\bgoogle\s*(cloud|ireland|workspace|payment|commerce|llc)/i, "Software & Abonnementen"),
  s("Microsoft", /\bmicrosoft\b/i, "Software & Abonnementen"),
  s("Apple", /\bapple\s*(distribution|services|inc|b\.?v)|\bicloud\b/i, "Software & Abonnementen"),
  s("Canva", /\bcanva\b/i, "Software & Abonnementen"),
  s("Dropbox", /\bdropbox\b/i, "Software & Abonnementen"),
  s("Notion", /\bnotion\b/i, "Software & Abonnementen"),
  s("Vercel", /\bvercel\b/i, "Software & Abonnementen"),
  s("Supabase", /\bsupabase\b/i, "Software & Abonnementen"),
  s("Resend", /\bresend\b/i, "Software & Abonnementen"),
  s("Capture One", /capture\s*one/i, "Software & Abonnementen"),
  s("Pixieset", /\bpixieset\b/i, "Software & Abonnementen"),
  s("TransIP", /\btransip\b/i, "Software & Abonnementen"),
  s("Strato", /\bstrato\b/i, "Software & Abonnementen"),
  s("Hostnet", /\bhostnet\b/i, "Software & Abonnementen"),
  s("KPN", /\bKPN\b/, "Software & Abonnementen"),
  s("Odido", /\bodido\b/i, "Software & Abonnementen"),
  s("Vodafone", /\bvodafone\b/i, "Software & Abonnementen"),
  s("Ziggo", /\bziggo\b/i, "Software & Abonnementen"),
  s("NS", /\bNS\b|\bns\.nl\b|Nederlandse\s*Spoorwegen/, "Reiskosten"),
  s("Shell", /\bshell\b/i, "Reiskosten"),
  s("BP", /\bBP\b/, "Reiskosten"),
  s("Esso", /\besso\b/i, "Reiskosten"),
  s("TotalEnergies", /total\s*energies/i, "Reiskosten"),
  s("Tango", /\btango\b/i, "Reiskosten"),
  s("Tinq", /\btinq\b/i, "Reiskosten"),
  s("Q-Park", /q[\s-]*park/i, "Reiskosten"),
  s("ParkBee", /\bparkbee\b/i, "Reiskosten"),
  s("Parkmobile", /\bparkmobile\b/i, "Reiskosten"),
  s("Yellowbrick", /\byellowbrick\b/i, "Reiskosten"),
  s("EasyPark", /easy\s*park/i, "Reiskosten"),
  s("Uber", /\buber\b(?!\s*eats)/i, "Reiskosten"),
  s("Fastned", /\bfastned\b/i, "Reiskosten"),
  s("Vistaprint", /\bvistaprint\b/i, "Marketing & Advertenties"),
  s("Drukwerkdeal", /\bdrukwerkdeal\b/i, "Marketing & Advertenties"),
  s("Helloprint", /\bhelloprint\b/i, "Marketing & Advertenties"),
  s("Meta", /\bmeta\s*platforms\b|\bfacebook\s*ads\b/i, "Marketing & Advertenties"),
  s("LinkedIn", /\blinkedin\b/i, "Marketing & Advertenties"),
  s("PostNL", /\bpostnl\b/i, "Kantoorbenodigdheden"),
  s("Viking", /\bviking\b/i, "Kantoorbenodigdheden"),
  s("Centraal Beheer", /centraal\s*beheer/i, "Verzekeringen"),
  s("Interpolis", /\binterpolis\b/i, "Verzekeringen"),
  s("Nationale-Nederlanden", /nationale[\s-]*nederlanden/i, "Verzekeringen"),
  s("Allianz", /\ballianz\b/i, "Verzekeringen"),
  s("a.s.r.", /\ba\.s\.r\.|\basr\s*verzekeringen/i, "Verzekeringen"),
  s("Hiscox", /\bhiscox\b/i, "Verzekeringen"),
  s("Udemy", /\budemy\b/i, "Opleiding"),
  s("Skillshare", /\bskillshare\b/i, "Opleiding"),
  s("Domestika", /\bdomestika\b/i, "Opleiding"),
];

// Domains on an invoice that belong to banks, payment providers, mail hosts
// and social media rather than to the supplier.
const NOT_SUPPLIER_DOMAINS = /^(photodecaffeine|gmail|googlemail|hotmail|outlook|live|icloud|me|yahoo|kpnmail|ziggo|mollie|adyen|paypal|stripe|buckaroo|multisafepay|klarna|afterpay|riverty|ing|rabobank|abnamro|bunq|knab|triodos|snsbank|asnbank|regiobank|kvk|belastingdienst|google|facebook|instagram|linkedin|twitter|x|youtube|tiktok|pinterest|whatsapp|apple|w3|schema|thuiswinkel|webwinkelkeur|trustedshops|trustpilot|kiyoh|postnl|dhl|dpd|ups|gls|sendcloud|myparcel|bit|tinyurl)$/;

const KEYWORDS: [string, RegExp][] = [
  ["Reiskosten", /\b(brandstof|benzine|diesel|euro\s*95|euro\s*98|lpg|liter|tankstation|parkeren|parkeer\w*|parking|trein\w*|ov-?chip\w*|ovpay|taxi|tol|laadpaal|laadsessie|kwh)\b/g],
  ["Apparatuur", /\b(camera\w*|lens|lenzen|objectief|statief\w*|tripod|flitser\w*|flitsen|softbox\w*|\w*lamp|lampen|verlichting|led|drone|gimbal|sd-?kaart\w*|sdxc|geheugenkaart\w*|cfexpress|micro\s*sd|accu\w*|batterij\w*|oplader|ssd|harde\s*schijf|laptop|macbook|monitor|kabel\w*|adapter|cameratas|filter\w*|microfoon|videomicro|reflectiescherm|achtergrond\w*|canon|nikon|sony|fujifilm|dji|sandisk|lexar|godox|profoto|elinchrom|manfrotto|sigma|tamron|gopro|insta360|smallrig|peak\s*design)\b/g],
  ["Software & Abonnementen", /\b(abonnement\w*|subscription|licentie\w*|license|software|creative\s*cloud|lightroom|photoshop|premiere|hosting|domein\w*|domain|cloud|opslag|storage|maandelijks|monthly|jaarlijks|annual|plan)\b/g],
  ["Kantoorbenodigdheden", /\b(papier|printer\w*|inkt|toner|envelop\w*|postzegel\w*|kantoor\w*|pennen|nietjes|ordner\w*)\b/g],
  ["Marketing & Advertenties", /\b(advertentie\w*|advertising|ads|campagne\w*|campaign|promotie|flyer\w*|visitekaartje\w*|drukwerk|banner\w*|sponsoring|boost)\b/g],
  ["Verzekeringen", /\b(verzekering\w*|insurance|premie\w*|polis\w*|dekking)\b/g],
  ["Horeca & Representatie", /\b(lunch|diner|ontbijt|koffie|cappuccino|latte|thee|bier|wijn|frisdrank|broodje\w*|restaurant|eetcaf[eé]|horeca|fooi|maaltijd|bediening|tafel)\b/g],
  ["Opleiding", /\b(cursus\w*|course|training\w*|workshop\w*|opleiding\w*|masterclass\w*|webinar\w*|e-?learning|certificaat)\b/g],
];

/** Every money amount on a line, as numbers. */
function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(MONEY)) {
    const value = Number(`${m[1].replace(/[.,']/g, "")}.${m[2] === "-" ? "00" : m[2]}`);
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

const hasLetters = (line: string) => /[a-z]{2}/i.test(line.replace(/\b(eur|euro)\b/gi, ""));

function findTotal(lines: string[]): number | null {
  let best: { score: number; amount: number } | null = null;
  const consider = (score: number, amounts: number[]) => {
    const amount = amounts.filter((a) => a > 0).pop();
    if (amount === undefined) return;
    if (!best || score > best.score || (score === best.score && amount >= best.amount)) best = { score, amount };
  };
  lines.forEach((raw, i) => {
    const line = raw.toLowerCase();
    if (NOT_TOTAL.test(line)) return;
    if (VAT_WORD.test(line) && !/incl/.test(line)) return;
    const score = TOTAL_STRONG.test(line) ? 3 : TOTAL.test(line) ? 2 : PAID.test(line) ? 1 : 0;
    if (!score) return;
    const here = amountsIn(line);
    // A label whose amount is printed on the line below it.
    if (!here.length && lines[i + 1] && !hasLetters(lines[i + 1])) consider(score, amountsIn(lines[i + 1]));
    else consider(score, here);
  });
  if (best) return (best as { amount: number }).amount;
  // Nothing labelled as a total: the largest amount printed with a euro sign.
  const marked = lines.filter((l) => /€|\beur\b/i.test(l)).flatMap(amountsIn).filter((a) => a > 0);
  return marked.length ? Math.max(...marked) : null;
}

/** The Dutch VAT rate the invoice charges, a foreign rate it charges instead, or null. */
function findVat(lines: string[], total: number | null): { rate: number | null; foreign?: number } {
  const lower = lines.map((l) => l.toLowerCase());
  const base: Record<number, number> = {};
  const foreign: number[] = [];
  for (const line of lower) {
    const vatLine = VAT_WORD.test(line) || /tarief|hoog|laag/.test(line);
    for (const m of line.matchAll(/(?<![\d,.])(\d{1,2})(?:[.,]0{1,2})?\s*%/g)) {
      const rate = Number(m[1]);
      if (rate === 21 || rate === 9) {
        // On a VAT line the larger amount is the base, a single amount the VAT itself.
        const amounts = amountsIn(line);
        const b = amounts.length >= 2 ? Math.max(...amounts) : amounts.length ? (amounts[0] * 100) / rate : 0;
        base[rate] = Math.max(base[rate] ?? 0, b);
      } else if (vatLine && rate === 0) {
        base[0] = base[0] ?? 0;
      } else if (vatLine && rate > 0) {
        foreign.push(rate);
      }
    }
  }
  if (base[21] !== undefined && base[9] !== undefined) return { rate: base[9] > base[21] ? 9 : 21 };
  if (base[21] !== undefined) return { rate: 21 };
  if (base[9] !== undefined) return { rate: 9 };
  if (foreign.length) return { rate: 0, foreign: foreign[0] };
  if (base[0] !== undefined || lower.some((l) => VAT_NONE.test(l))) return { rate: 0 };
  // No rate printed: work it out from the VAT amount and the total.
  if (total) {
    for (const line of lower) {
      if (!VAT_WORD.test(line) || /incl|excl/.test(line)) continue;
      const amounts = amountsIn(line);
      if (amounts.length !== 1 || amounts[0] >= total) continue;
      if (amounts[0] === 0) return { rate: 0 };
      const r = (amounts[0] / (total - amounts[0])) * 100;
      if (Math.abs(r - 21) < 0.6) return { rate: 21 };
      if (Math.abs(r - 9) < 0.6) return { rate: 9 };
    }
  }
  return { rate: null };
}

function isoDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const now = new Date();
  if (y < 2000 || y > now.getFullYear() + 1) return null;
  return date.toISOString().slice(0, 10);
}

function datesIn(line: string): { date: string; at: number; end: number }[] {
  const out: { date: string | null; at: number; end: number }[] = [];
  const add = (m: RegExpMatchArray, date: string | null) => out.push({ date, at: m.index!, end: m.index! + m[0].length });
  for (const m of line.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) add(m, isoDate(+m[1], +m[2], +m[3]));
  for (const m of line.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?![\d.,])/g)) {
    const [a, b] = [+m[1], +m[2]];
    // Day first, as Dutch invoices write it, unless that cannot be.
    add(m, b > 12 && a <= 12 ? isoDate(+m[3], a, b) : isoDate(+m[3], b, a));
  }
  for (const m of line.matchAll(new RegExp(`\\b(\\d{1,2})(?:e|st|nd|rd|th)?\\s+(${MONTH})\\.?,?\\s+(\\d{4})\\b`, "g"))) add(m, isoDate(+m[3], MONTHS[m[2]], +m[1]));
  for (const m of line.matchAll(new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "g"))) add(m, isoDate(+m[3], MONTHS[m[1]], +m[2]));
  return out.filter((d): d is { date: string; at: number; end: number } => !!d.date).sort((a, b) => a.at - b.at);
}

function findDate(lines: string[]): string | null {
  const today = Date.now();
  let best: { score: number; date: string } | null = null;
  lines.forEach((raw, i) => {
    const line = raw.toLowerCase();
    const before = (lines[i - 1] || "").toLowerCase();
    let from = 0;
    for (const { date, at, end } of datesIn(line)) {
      // The label sits just before the date on its line, or on the line above.
      const own = line.slice(from, at);
      const label = /\p{L}{3}/u.test(own) ? own : from === 0 ? before : "";
      from = end;
      let score = DATE_ISSUE.test(label) ? 3 : DATE_LABEL.test(label) ? 2 : 0;
      if (DATE_OTHER.test(label)) score -= 4;
      const age = (today - Date.parse(date)) / 86_400_000;
      if (age < -7) score -= 3;
      if (age > 3 * 365) score -= 2;
      if (!best || score > best.score) best = { score, date };
    }
  });
  return best ? (best as { date: string }).date : null;
}

const titleCase = (word: string) => word.replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

function findSupplier(lines: string[], text: string): { name: string; category: string | null } | null {
  const own = new RegExp(OWN.source, "gi");
  const top = lines.slice(0, 10).map((l) => l.replace(own, " ")).join("\n");
  // The known name that comes first, so a retailer is not mistaken for a brand it sells.
  const known = (where: string) =>
    SUPPLIERS.map((x) => ({ x, at: where.search(x.match) })).filter((m) => m.at >= 0).sort((a, b) => a.at - b.at)[0]?.x;
  // Its own web or mail address is the surest sign of who sent the invoice.
  const domains = new Map<string, number>();
  for (const m of text.toLowerCase().matchAll(/(?<![\w-])(?:www\.|[\w.+-]*@|https?:\/\/)?(?:[a-z0-9-]+\.)*?([a-z0-9-]{2,})\.(?:nl|com|be|de|eu|io|net|org|shop|store|app|ie|fr|co\.uk)\b/g)) {
    if (!NOT_SUPPLIER_DOMAINS.test(m[1])) domains.set(m[1], (domains.get(m[1]) || 0) + 1);
  }
  const domain = [...domains.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const label = domain?.replace(/-/g, " ");
  const byDomain = label ? known(label) || known(label.toUpperCase()) : undefined;
  const match = byDomain || known(top);
  if (match) return { name: match.name, category: match.category };
  if (label) return { name: titleCase(label), category: null };
  // A company name with its legal form near the top: "Studio Licht B.V.".
  for (const raw of lines.slice(0, 15)) {
    const line = raw.replace(own, " ").trim();
    const m = line.match(/^\s*([\p{L}0-9&'. -]{2,40}?)\s+(b\.?\s?v\.?|v\.o\.f\.?|n\.v\.|ltd\.?|limited|gmbh|inc\.?|llc|s\.a\.)(?=\s|$|,)/iu);
    if (m) return { name: m[1].trim(), category: null };
  }
  // A shop receipt opens with the shop's name.
  for (const line of lines.slice(0, 5)) {
    const name = line.trim();
    if (OWN.test(name) || !/\p{L}{3}/u.test(name) || name.length > 40) continue;
    if (/^(factuur|invoice|kassabon|bon|receipt|rekening|nota|creditnota|pagina|page|datum|date)\b/i.test(name)) continue;
    if (/\d{4}\s?[a-z]{2}\b|straat|weg\b|laan\b|plein\b|tel|www|@/i.test(name)) continue;
    return { name: name === name.toUpperCase() ? titleCase(name.toLowerCase()) : name, category: null };
  }
  return null;
}

function findInvoiceNumber(text: string): string | null {
  const m = text.match(/(?:factuur(?:[ \t]*(?:nummer|nr\.?|no\.?))?|invoice(?:[ \t]*(?:number|no\.?|nr\.?|#))?)[ \t]*[:#.]?[ \t]*((?=[A-Z0-9\-\/.]*\d)[A-Z0-9][A-Z0-9\-\/.]{2,24})/i);
  return m ? m[1].replace(/[.\-/]+$/, "") : null;
}

function findCategory(text: string): string | null {
  const lower = text.toLowerCase();
  let best: { name: string; hits: number } | null = null;
  for (const [name, words] of KEYWORDS) {
    const hits = lower.match(words)?.length || 0;
    if (hits && (!best || hits > best.hits)) best = { name, hits };
  }
  return best ? (best as { name: string }).name : null;
}

function currencyOf(text: string): string {
  if (/€|\beur\b|\beuro\b/i.test(text)) return "EUR";
  if (/\$|\busd\b/i.test(text)) return "USD";
  if (/£|\bgbp\b/i.test(text)) return "GBP";
  return "EUR";
}

/** Reads the fields of a declaration out of an invoice's text. */
export function parseReceipt(text: string): Parsed {
  const clean = text
    .replace(/[   ]/g, " ")
    // OCR reads a 0 as an O now and then; only in the cents of an amount is that certain.
    .replace(/(\d[.,])([\doO]{2})(?![\w])/g, (_, a, b) => a + b.replace(/[oO]/g, "0"))
    .replace(/[ \t]+/g, " ");
  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    return { fields: { amount: null, vatRate: null, date: null, description: "", category: null }, notice: "Er staat geen leesbare tekst in dit bestand. Vul de gegevens zelf in." };
  }

  const currency = currencyOf(clean);
  const total = findTotal(lines);
  const vat = findVat(lines, total);
  const date = findDate(lines);
  const supplier = findSupplier(lines, clean);
  const number = findInvoiceNumber(clean);
  const description = [supplier?.name, number && `factuur ${number}`].filter(Boolean).join(", ");
  const fields: ReceiptFields = {
    amount: currency === "EUR" ? total : null,
    vatRate: vat.rate,
    date,
    description: description ? description[0].toUpperCase() + description.slice(1) : "",
    category: supplier?.category || findCategory(clean),
  };

  const notes: string[] = [];
  if (currency !== "EUR") notes.push(`De factuur is in ${currency}. Vul het bedrag in euro in.`);
  if (vat.foreign) notes.push(`${vat.foreign}% btw is geen Nederlands tarief, dus btw staat op 0%.`);
  const missing = [currency === "EUR" && total === null && "het bedrag", vat.rate === null && "het btw-tarief", !date && "de datum"].filter(Boolean);
  if (missing.length) notes.push(`Niet gevonden: ${missing.join(", ").replace(/, ([^,]*)$/, " en $1")}. Vul dat zelf in.`);
  return { fields, notice: notes.join(" ") || undefined };
}
