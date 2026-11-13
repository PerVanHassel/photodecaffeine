// Lays two language versions of the same texts side by side. TypeScript
// already checks that both have the same keys; this also checks what it
// cannot: lists of the same length, and the same value wherever a value is
// data rather than words (prices, ids, links, yes/no). The build runs it
// (scripts/prerender.mjs) and stops on any difference, so a price changed in
// Dutch cannot stay old in English.

/** Strings under these keys are data, the same in every language. */
const DATA_KEYS = new Set(["id", "path", "to", "file", "vat", "email", "kvk", "btw", "part", "sentPath", "stepsId"]);

/** Word lists that are allowed to differ, like the portfolio's category names. */
const FREE = new Set(["translations.portfolioPage.categories"]);

const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** Every difference between `a` (Dutch) and `b` (the translation), as a readable line. */
export function compareTexts(a: unknown, b: unknown, path: string): string[] {
  if (FREE.has(path)) return [];
  const ka = kind(a);
  const kb = kind(b);
  if (ka !== kb) return [`${path}: ${ka} in het Nederlands, ${kb} in de vertaling`];
  switch (ka) {
    case "number":
    case "boolean":
    case "null":
      return a === b ? [] : [`${path}: ${String(a)} in het Nederlands, ${String(b)} in de vertaling`];
    case "string": {
      // Error messages are words, even under a key like "email".
      const key = path.split(".").pop()!.replace(/\[\d+\]$/, "");
      const data = DATA_KEYS.has(key) && !path.includes(".errors.");
      return data && a !== b ? [`${path}: "${a}" in het Nederlands, "${b}" in de vertaling`] : [];
    }
    case "function":
      return (a as (...args: unknown[]) => unknown).length === (b as (...args: unknown[]) => unknown).length
        ? []
        : [`${path}: de functie heeft een ander aantal argumenten`];
    case "array": {
      const la = a as unknown[];
      const lb = b as unknown[];
      if (la.length !== lb.length) return [`${path}: ${la.length} items in het Nederlands, ${lb.length} in de vertaling`];
      return la.flatMap((item, i) => compareTexts(item, lb[i], `${path}[${i}]`));
    }
    case "object": {
      const oa = a as Record<string, unknown>;
      const ob = b as Record<string, unknown>;
      const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
      return [...keys].flatMap((k) =>
        !(k in oa) ? [`${path}.${k}: alleen in de vertaling`]
        : !(k in ob) ? [`${path}.${k}: ontbreekt in de vertaling`]
        : compareTexts(oa[k], ob[k], `${path}.${k}`),
      );
    }
    default:
      return [];
  }
}

type Section = { id: string; part: string; blocks: ({ t: string; text: string } | { t: "table"; rows: string[][] })[] };

/**
 * The translated terms line up with the Dutch ones: the same sections in the
 * same order, each with the same kinds of blocks and tables of the same size,
 * and as much bold text. The words themselves are for a person to check.
 */
export function compareLegal(nl: Section[], en: Section[]): string[] {
  if (nl.length !== en.length) return [`voorwaarden: ${nl.length} stukken in het Nederlands, ${en.length} in de vertaling`];
  return nl.flatMap((a, i) => {
    const b = en[i];
    const at = `voorwaarden ${a.id}`;
    if (a.id !== b.id || a.part !== b.part) return [`${at}: in de vertaling staat hier ${b.id}`];
    if (a.blocks.length !== b.blocks.length) return [`${at}: ${a.blocks.length} blokken in het Nederlands, ${b.blocks.length} in de vertaling`];
    return a.blocks.flatMap((x, j) => {
      const y = b.blocks[j];
      if (x.t !== y.t) return [`${at}, blok ${j + 1}: ${x.t} in het Nederlands, ${y.t} in de vertaling`];
      if ("rows" in x && "rows" in y) {
        const same = x.rows.length === y.rows.length && x.rows.every((r, k) => r.length === y.rows[k].length);
        return same ? [] : [`${at}, blok ${j + 1}: de tabel heeft een andere vorm`];
      }
      if ("text" in x && "text" in y && x.text.split("**").length !== y.text.split("**").length) {
        return [`${at}, blok ${j + 1}: andere vetgedrukte stukken`];
      }
      return [];
    });
  });
}
