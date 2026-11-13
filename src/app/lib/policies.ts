import type { Language } from "../context/LanguageContext";

// Where the texts for clients live on the site. The words themselves are in
// legal.ts (and legal.en.ts), which only the legal pages load; this stays small
// because the footer and every form link here.

export type PolicyDoc = {
  /** The part of the document in legal.ts. */
  part: string;
  path: string;
  title: string;
  /** The footer's word for it. */
  short: string;
  description: string;
};

export const policies = {
  terms: {
    part: "p2",
    path: "/algemene-voorwaarden",
    title: "Algemene voorwaarden",
    short: "Algemene voorwaarden",
    description: "De algemene voorwaarden van PhotoDeCaffeine: offertes, betaling, uitvoering, aansprakelijkheid en geschillen.",
  },
  rights: {
    part: "p3",
    path: "/gebruiksrechten",
    title: "Auteursrecht en gebruiksrechten",
    short: "Gebruiksrechten",
    description: "Wie het auteursrecht heeft op foto's en film van PhotoDeCaffeine, en hoe je ze mag gebruiken.",
  },
  cancel: {
    part: "p4",
    path: "/annuleren-en-terugbetaling",
    title: "Annuleren, verplaatsen en terugbetaling",
    short: "Annuleren en terugbetaling",
    description: "Wat er gebeurt als plannen veranderen: herroepen, annuleren, verplaatsen en terugbetalen.",
  },
  delivery: {
    part: "p5",
    path: "/oplevering-en-revisies",
    title: "Oplevering, revisies en bestandsopslag",
    short: "Oplevering en revisies",
    description: "Hoe PhotoDeCaffeine oplevert: planning, revisierondes, downloadlinks en hoe lang bestanden bewaard blijven.",
  },
  websites: {
    part: "p10",
    path: "/voorwaarden-websites",
    title: "Websites: bouw, hosting en onderhoud",
    short: "Websites",
    description: "De afspraken als PhotoDeCaffeine een website voor je bouwt: huren of kopen, hosting, onderhoud en persoonsgegevens.",
  },
  privacy: {
    part: "p6",
    path: "/privacybeleid",
    title: "Privacyverklaring",
    short: "Privacy",
    description: "Welke gegevens PhotoDeCaffeine verwerkt, waarvoor, hoe lang en wat je rechten zijn.",
  },
  cookie: {
    part: "p7",
    path: "/cookiebeleid",
    title: "Cookiebeleid",
    short: "Cookies",
    description: "Welke cookies en vergelijkbare technieken photodecaffeine.com gebruikt, en wat je kunt kiezen.",
  },
  complaints: {
    part: "p8",
    path: "/contact-en-klachten",
    title: "Contact en klachten",
    short: "Contact en klachten",
    description: "Een klacht of vraag? Zo werkt het, en zo bereik je PhotoDeCaffeine.",
  },
  site: {
    part: "p9",
    path: "/websitevoorwaarden",
    title: "Gebruik van deze website",
    short: "Websitegebruik",
    description: "Wat wel en niet mag op photodecaffeine.com, en van wie de teksten en beelden zijn.",
  },
  promise: {
    part: "p1",
    path: "/onze-belofte",
    title: "Onze belofte",
    short: "Onze belofte",
    description: "Creatief werk, heldere afspraken en wederzijds respect: wat je van PhotoDeCaffeine mag verwachten.",
  },
} satisfies Record<string, PolicyDoc>;

type PolicyKey = keyof typeof policies;

/** The English names of the same pages; the addresses stay Dutch. */
const ENGLISH: Record<PolicyKey, Pick<PolicyDoc, "title" | "short" | "description">> = {
  terms: {
    title: "General terms and conditions",
    short: "Terms and conditions",
    description: "PhotoDeCaffeine's general terms and conditions: quotes, payment, how we carry out the work, liability and disputes.",
  },
  rights: {
    title: "Copyright and usage rights",
    short: "Usage rights",
    description: "Who owns the copyright in photos and film by PhotoDeCaffeine, and how you may use them.",
  },
  cancel: {
    title: "Cancellation, rescheduling and refunds",
    short: "Cancellation and refunds",
    description: "What happens when plans change: withdrawal, cancellation, rescheduling and refunds.",
  },
  delivery: {
    title: "Delivery, revisions and file storage",
    short: "Delivery and revisions",
    description: "How PhotoDeCaffeine delivers: timing, revision rounds, download links and how long files are kept.",
  },
  websites: {
    title: "Websites: build, hosting and maintenance",
    short: "Websites",
    description: "The agreements when PhotoDeCaffeine builds a website for you: renting or buying, hosting, maintenance and personal data.",
  },
  privacy: {
    title: "Privacy statement",
    short: "Privacy",
    description: "Which data PhotoDeCaffeine processes, what for, for how long and what your rights are.",
  },
  cookie: {
    title: "Cookie policy",
    short: "Cookies",
    description: "Which cookies and similar technologies photodecaffeine.com uses, and what you can choose.",
  },
  complaints: {
    title: "Contact and complaints",
    short: "Contact and complaints",
    description: "A complaint or a question? Here's how it works, and how to reach PhotoDeCaffeine.",
  },
  site: {
    title: "Use of this website",
    short: "Website use",
    description: "What is and isn't allowed on photodecaffeine.com, and who owns the texts and images.",
  },
  promise: {
    title: "Our promise",
    short: "Our promise",
    description: "Creative work, clear agreements and mutual respect: what you can expect from PhotoDeCaffeine.",
  },
};

const policiesEn = Object.fromEntries(
  Object.entries(policies).map(([key, doc]) => [key, { ...doc, ...ENGLISH[key as PolicyKey] }]),
) as Record<PolicyKey, PolicyDoc>;

/** The pages with their names in the page's language. */
export const localPolicies = (language: Language): Record<PolicyKey, PolicyDoc> => (language === "en" ? policiesEn : policies);
