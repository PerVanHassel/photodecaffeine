// Where the texts for clients live on the site. The words themselves are in
// legal.ts, which only the legal pages load; this stays small because the footer
// and every form link here.

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
