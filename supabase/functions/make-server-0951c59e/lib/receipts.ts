import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { betaJSONSchemaOutputFormat } from "npm:@anthropic-ai/sdk@0.135.0/helpers/beta/json-schema";
import { Buffer } from "node:buffer";

// ============================================================================
// READING INVOICES
// ============================================================================
//
// A declaration starts from the invoice or receipt: Claude reads it and the
// form fills itself in. The person who uploaded it still checks the result and
// submits it, so a misreading costs a correction, never an entry nobody saw.
//
// Needs ANTHROPIC_API_KEY among the function's secrets. Without it the receipt
// is still stored and the form is filled in by hand, as before.

const MODEL = "claude-opus-5-5";

// The same categories the admin screens offer, with what belongs in each.
const CATEGORIES: Record<string, string> = {
  "Reiskosten": "fuel, train and bus tickets, taxis, parking, tolls, car rental",
  "Apparatuur": "cameras, lenses, lighting, tripods, drones, memory cards, batteries, computers and other gear",
  "Software & Abonnementen": "software, licences, subscriptions, cloud storage, hosting, domain names",
  "Kantoorbenodigdheden": "office supplies, paper, ink, printing, postage",
  "Marketing & Advertenties": "advertising, promotion, flyers, business cards, sponsoring",
  "Verzekeringen": "insurance premiums",
  "Horeca & Representatie": "restaurants, lunches, coffee, drinks, gifts for clients",
  "Opleiding": "courses, workshops, training, books for the trade",
  "Overig": "anything that fits none of the above",
};

const VAT_RATES = [21, 9, 0];

const SYSTEM = `You read invoices and receipts for the expense claims of PhotoDeCaffeine, a photo and video studio in the Netherlands. Your reading fills in the claim form; the person who uploaded the document checks it before submitting.

Report what the document shows. Where a value is not on it, give null rather than a guess.

- isReceipt: true for an invoice, receipt, or other proof of a purchase with a price; false for anything else.
- amount: the total paid or payable including VAT, after discounts: the grand total (Totaal, Te betalen, Total due, Amount paid), not a subtotal. A number with a decimal point, such as 130.05.
- currency: the ISO 4217 code of that total, such as EUR.
- vatRate: the Dutch VAT rate charged, 21 or 9. Use 0 when no Dutch VAT is charged: exempt, reverse-charged ("btw verlegd"), foreign VAT, or no VAT shown. When both 21% and 9% appear, give the rate that covers the larger part of the amount.
- date: the invoice or purchase date as YYYY-MM-DD, not a due or delivery date. Dutch documents write the day first.
- description: a short line in Dutch for the list of claims, at most about 60 characters: the supplier first, then what was bought. For example "Cameranu — Peak Design statiefplaat" or "Adobe — Creative Cloud, oktober 2026".
- category: the best fit from this list:
${Object.entries(CATEGORIES).map(([name, what]) => `  - ${name}: ${what}`).join("\n")}`;

const FORMAT = betaJSONSchemaOutputFormat({
  type: "object",
  properties: {
    isReceipt: { type: "boolean" },
    amount: { anyOf: [{ type: "number" }, { type: "null" }] },
    currency: { anyOf: [{ type: "string" }, { type: "null" }] },
    vatRate: { type: "integer", enum: VAT_RATES },
    date: { anyOf: [{ type: "string", format: "date" }, { type: "null" }] },
    description: { type: "string" },
    category: { type: "string", enum: Object.keys(CATEGORIES) },
  },
  required: ["isReceipt", "amount", "currency", "vatRate", "date", "description", "category"],
  additionalProperties: false,
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
// The API takes an image of up to 5 MB once base64-encoded, and a request of
// up to 32 MB. Phone photos are scaled down in the browser before they get here.
const MAX_IMAGE_BYTES = 3_750_000;
const MAX_PDF_BYTES = 15_000_000;

export type ReceiptFields = {
  amount: number | null;
  vatRate: number;
  date: string | null;
  description: string;
  category: string;
};

/**
 * What the invoice says, ready for the declaration form, and a line for the
 * person when something could not be read. Never throws: a reading that fails
 * leaves the form to be filled in by hand.
 */
export async function readReceipt(file: File): Promise<{ fields: ReceiptFields | null; notice?: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.log("readReceipt: ANTHROPIC_API_KEY not set, nothing filled in");
    return { fields: null, notice: "Automatisch invullen staat nog uit. Vul de gegevens zelf in." };
  }
  const isPdf = file.type === "application/pdf";
  if (!isPdf && !IMAGE_TYPES.includes(file.type as ImageType)) {
    return { fields: null, notice: "Dit soort bestand kan niet automatisch worden gelezen. Vul de gegevens zelf in." };
  }
  if (file.size > (isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
    return { fields: null, notice: "Dit bestand is te groot om automatisch te lezen. Vul de gegevens zelf in." };
  }

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const document = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: file.type as ImageType, data } };

    // Waiting longer than this is worse than typing the four fields by hand.
    const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
    const message = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: FORMAT },
      system: SYSTEM,
      messages: [{ role: "user", content: [document, { type: "text", text: "Lees dit document." }] }],
    });

    const read = message.parsed_output;
    if (!read) {
      console.error("readReceipt: no reading, stop_reason", message.stop_reason);
      return { fields: null, notice: "De factuur kon niet worden gelezen. Vul de gegevens zelf in." };
    }
    if (!read.isReceipt) {
      return { fields: null, notice: "Dit lijkt geen factuur of bon. Vul de gegevens zelf in." };
    }

    const total = typeof read.amount === "number" && Number.isFinite(read.amount) && read.amount > 0
      ? Math.round(read.amount * 100) / 100
      : null;
    const currency = (read.currency || "EUR").toUpperCase();
    const date = typeof read.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(read.date) && !Number.isNaN(Date.parse(read.date))
      ? read.date
      : null;
    const fields: ReceiptFields = {
      // A total in another currency is not the euro amount the claim needs.
      amount: currency === "EUR" ? total : null,
      vatRate: VAT_RATES.includes(read.vatRate) ? read.vatRate : 21,
      date,
      description: read.description.trim().slice(0, 120),
      category: Object.keys(CATEGORIES).includes(read.category) ? read.category : "Overig",
    };
    if (currency !== "EUR" && total !== null) {
      return { fields, notice: `De factuur is in ${currency} (${total.toFixed(2).replace(".", ",")}). Vul het bedrag in euro in.` };
    }
    if (total === null) return { fields, notice: "Het totaalbedrag staat niet duidelijk op de factuur. Vul het zelf in." };
    return { fields };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("readReceipt: ANTHROPIC_API_KEY refused,", err.status);
      return { fields: null, notice: "Automatisch invullen werkt niet: de API-sleutel wordt geweigerd. Vul de gegevens zelf in." };
    }
    console.error("readReceipt failed:", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return { fields: null, notice: "De factuur kon niet worden gelezen. Vul de gegevens zelf in." };
  }
}
