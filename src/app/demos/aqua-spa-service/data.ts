/**
 * De vaste inhoud van de demo, op een plek zodat de pagina's er samen uit putten.
 *
 * Merken en soorten onderdelen komen van de onderdelenpagina van
 * aquaspaservice.be. Prijzen staan hier bewust niet: sinds het gesprek van
 * 24-09-2026 is er geen webshop meer. Een klant vraagt een onderdeel aan,
 * Arjan zoekt het op bij zijn leveranciers en stuurt een offerte of factuur.
 */

export interface PartGroup {
  id: string;
  icon: string;
  label: string;
  body: string;
  brands: string[];
}

export const PART_GROUPS: PartGroup[] = [
  {
    id: "besturing",
    icon: "ph-cpu",
    label: "Besturingen en bedieningspanelen",
    body: "Het hart van uw spa. Gaat de besturing stuk, dan doet meestal niets het meer.",
    brands: ["Balboa", "Gecko"],
  },
  {
    id: "verwarming",
    icon: "ph-thermometer-hot",
    label: "Verwarmingselementen",
    body: "Verwarmt uw spa niet meer terwijl het water wel circuleert, dan begint het hier.",
    brands: ["Balboa", "Gecko", "Laing", "LX"],
  },
  {
    id: "pompen",
    icon: "ph-fan",
    label: "Pompen",
    body: "Circulatiepompen en massagepompen, in verschillende vermogens.",
    brands: ["Laing", "Aqua-Flo", "Waterway", "LX", "Espa", "Sam"],
  },
  {
    id: "jets",
    icon: "ph-waves",
    label: "Jets en leidingwerk",
    body: "Jets in meerdere diameters, koppelstukken en pvc voor het leidingwerk.",
    brands: ["Waterway", "Pentair"],
  },
  {
    id: "onderhoud",
    icon: "ph-flask",
    label: "Filters en onderhoudsproducten",
    body: "Vervangfilters en producten voor helder water. Zeg erbij welke spa u heeft.",
    brands: ["Diverse merken"],
  },
  {
    id: "sauna",
    icon: "ph-fire",
    label: "Sauna en hammam",
    body: "Onderdelen voor saunakachels, stoomgeneratoren en hun besturingen.",
    brands: ["Tylo", "Harvia", "Jacuzzi", "Effegibi"],
  },
];

/** De spamerken waarvoor hij herstelt en onderdelen levert. */
export const SPA_BRANDS = [
  "Aquamarine", "Balbao Spa", "Aquavia", "Nordic Hot Tub", "PDC Spa", "Beachcomber", "Platinum Spa",
  "Caldera", "Reflections", "Charisma", "Sunbelt", "Sundance", "Dimension One", "Coleman", "Gulf Coast",
  "Sun Spa", "Hydro Spa", "Thermo Spa", "Hydropool", "US Spa", "Portcril", "Jacuzzi", "Omni Hot Tub", "Jazzi",
];

/** Tarieven zoals Arjan ze op 24-09-2026 zelf noemde. */
export const RATES = [
  {
    icon: "ph-truck",
    title: "Voorrijkosten",
    price: "€ 95",
    note: "Plus btw, binnen 50 kilometer.",
  },
  {
    icon: "ph-clock",
    title: "Uurtarief",
    price: "€ 75",
    note: "Plus btw. Het eerste uur rekenen wij altijd, ook als het sneller klaar is. Daarna per kwartier.",
  },
];
