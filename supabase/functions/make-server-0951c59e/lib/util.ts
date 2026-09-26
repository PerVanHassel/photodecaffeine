/** 32 hex characters from the platform CSPRNG; for links that stand in for a login. */
export function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// Slugs address a demo page built into this site, so they may only ever be a
// path segment: lowercase letters, digits and hyphens.
export function demoSlugOf(value: any): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * The demos attached to a project, as [{slug, live}].
 *
 * Projects used to carry a single demoSlug/demoLive pair; those are still
 * written alongside the list so anything reading the old fields keeps working,
 * and are read here for projects saved before the list existed.
 */
export function projectDemos(project: any): { slug: string; live: boolean }[] {
  const raw = Array.isArray(project?.demos) ? project.demos : null;
  const list = raw
    ? raw.map((d: any) => ({ slug: demoSlugOf(d?.slug), live: Boolean(d?.live) }))
    : project?.demoSlug
      ? [{ slug: demoSlugOf(project.demoSlug), live: Boolean(project.demoLive) }]
      : [];

  // One entry per slug, first mention wins, empties dropped.
  const seen = new Set<string>();
  return list.filter((d) => {
    if (!d.slug || seen.has(d.slug)) return false;
    seen.add(d.slug);
    return true;
  });
}

export function computeQuarter(isoDate: string): string {
  const d = new Date(isoDate);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

// Declaration amounts are stored BTW-inclusive (the total on the receipt/
// factuur), matching how Dutch business expenses are normally logged. The
// reclaimable input VAT is the BTW portion of that total: for a 21% rate,
// a €121 receipt contains €21 BTW (121 / 1.21 * 0.21), not €121 * 0.21.
export function computeVatAmount(amount: number, vatRate: number): number {
  if (!vatRate) return 0;
  return Math.round(((amount * vatRate) / (100 + vatRate)) * 100) / 100;
}

// Helper function to sanitize filename for storage
export function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf(".");
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";

  // Sanitize the name part:
  // - Replace spaces with hyphens
  // - Remove or replace special characters (keep only alphanumeric, hyphens, underscores)
  // - Convert to lowercase for consistency
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-")              // spaces to hyphens
    .replace(/['"`]/g, "")             // remove quotes and apostrophes
    .replace(/[[\](){}]/g, "")         // remove brackets and parentheses
    .replace(/[^a-z0-9._-]/g, "-")     // replace other special chars with hyphen
    .replace(/-+/g, "-")               // collapse multiple hyphens
    .replace(/^-|-$/g, "");            // remove leading/trailing hyphens

  return sanitized + ext.toLowerCase();
}
