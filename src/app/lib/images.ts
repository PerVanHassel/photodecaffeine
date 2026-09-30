/**
 * Marks an image as the page's largest paint so the browser fetches it first.
 * React 18 does not know the camelCase prop yet, so the plain attribute is
 * passed through.
 */
export const HIGH_PRIORITY = { fetchpriority: "high" } as {};
