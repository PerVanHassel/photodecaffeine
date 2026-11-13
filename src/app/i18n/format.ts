import type { Translations } from "./translations";

/** A portfolio category as typed in the admin, in the page's language. */
export const categoryLabel = (t: Translations, category: string) => t.portfolioPage.categories[category] ?? category;

/** A date (yyyy-mm-dd or ISO) written out, like "13 november 2026" or "13 November 2026". */
export function longDate(t: Translations, value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(t.locale, options);
}

/** A score like 4,8 (Dutch) or 4.8 (English), with one decimal. */
export const score = (t: Translations, n: number) => n.toLocaleString(t.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
