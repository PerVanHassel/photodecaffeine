// Address search and reverse lookup. PDOK's Locatieserver knows every Dutch
// address and place and needs no key; Photon (OpenStreetMap) covers the rest
// of the world, which matters for shoots across the border in Belgium.

export type GeoResult = { id: string; label: string; lat: number; lng: number };

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

function parsePoint(wkt: string): { lat: number; lng: number } | null {
  const m = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(wkt || "");
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
}

async function pdokSearch(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = `${PDOK}/free?q=${encodeURIComponent(q)}&rows=6&fl=id,weergavenaam,centroide_ll,type`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.response?.docs || [])
    .map((d: any) => {
      const p = parsePoint(d.centroide_ll);
      return p ? { id: `pdok-${d.id}`, label: d.weergavenaam, ...p } : null;
    })
    .filter(Boolean);
}

async function photonSearch(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=de`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.features || []).map((f: any, i: number) => {
    const p = f.properties || {};
    const label = [p.name, [p.street, p.housenumber].filter(Boolean).join(" "), p.city || p.town || p.village, p.country]
      .filter(Boolean)
      .filter((v: string, idx: number, arr: string[]) => arr.indexOf(v) === idx)
      .join(", ");
    return { id: `photon-${p.osm_id ?? i}`, label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
  });
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  const [nl, world] = await Promise.all([
    pdokSearch(query, signal).catch(() => []),
    photonSearch(query, signal).catch(() => []),
  ]);
  // Dutch results first; the world search fills in what PDOK does not know.
  const seen = new Set(nl.map((r) => r.label.toLowerCase()));
  return [...nl, ...world.filter((r) => !seen.has(r.label.toLowerCase()))].slice(0, 8);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`${PDOK}/reverse?lat=${lat}&lon=${lng}&rows=1&fl=weergavenaam&type=adres`);
    if (res.ok) {
      const doc = (await res.json())?.response?.docs?.[0];
      if (doc?.weergavenaam) return doc.weergavenaam;
    }
  } catch { /* fall through */ }
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=de`);
    if (res.ok) {
      const p = (await res.json())?.features?.[0]?.properties;
      if (p) return [[p.street, p.housenumber].filter(Boolean).join(" ") || p.name, p.city || p.town || p.village].filter(Boolean).join(", ");
    }
  } catch { /* nothing */ }
  return "";
}

// The studio is in Roosendaal; maps open there when there is nothing to show.
export const HOME: { lat: number; lng: number; zoom: number } = { lat: 51.5308, lng: 4.4653, zoom: 10 };
