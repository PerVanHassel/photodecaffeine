import { useLanguage } from "../context/LanguageContext";

// Texts of the match photography campaign: the strip on the home page, the
// page /wedstrijdfotografie with its request form, and the page after sending.
// Prices live in lib/matchBooking.ts; the sentences here say the same numbers.
// In Dutch and English (en below, same shape, compared by the build like the
// rest of the site's texts in i18n/check.ts).
//
// House rules for this campaign: "gratis" and "geen vaste kosten vooraf" only
// next to a team or club booking, never as a promise for everyone. No number
// of photos per player and no delivery time beyond the week in the steps.

const EMAIL = "contact@photodecaffeine.com";

const TRAVEL =
  "Tot en met Breda en tot 25 km enkele reis vanaf Roosendaal betaal je geen reiskosten, verder weg €0,25 per extra kilometer heen en terug (afgerond op hele euro's, onder de €5 rekenen we niets).";

const nl = {
  path: "/wedstrijdfotografie",
  sentPath: "/wedstrijdfotografie/verstuurd",
  stepsId: "zo-werkt-het",
  email: EMAIL,
  metaTitle: "Wedstrijdfotografie voor spelers, teams en clubs | PhotoDeCaffeine",
  metaDescription:
    "Een fotograaf bij je wedstrijd. Boek met je team of club zonder vaste kosten vooraf, of alleen voor jezelf met €20 bijdrage. Elke foto kost €5.",

  // The strip on the home page, right under the service cards. The label says
  // who the free booking is for, so the headline does not promise it to everyone.
  band: {
    label: "Voor teams en clubs",
    title: "Gratis boeking",
    titleEm: "voor je wedstrijd.",
    // Non-breaking spaces keep each amount with its word.
    body: "Team of club: geen vaste kosten vooraf. Alleen voor jezelf: €20\u00a0bijdrage, daarna €5\u00a0per\u00a0foto.",
    cta: "Boek je wedstrijdfotograaf",
    more: "Zo werkt het",
    facts: [
      { value: "€0", text: "boekingsbijdrage voor je team" },
      { value: "€5", text: "per foto, inclusief btw" },
      { value: "1 week", text: "tot de foto's in de galerij staan" },
    ],
  },

  backLabel: "Home",
  label: "Wedstrijdfotografie",
  // Two lines in the site's way: the second one dim, then the copper italic.
  title: "Gratis",
  title2: "boeken",
  titleEm: "voor je team of club",
  subtitle:
    "Boek met je team of club, zonder vaste kosten vooraf. Of boek alleen voor jezelf, met een bijdrage van €20. Elke foto kost daarna €5.",
  bookCta: "Boek je wedstrijdfotograaf",
  heroCta: "Boek voor je team",
  heroMore: "Zo werkt het",
  // The tag on the photo in the header.
  heroTag: "Start-upcampagne",
  heroPrice: "€5 per foto",

  choose: {
    label: "Twee manieren",
    title1: "Kies hoe",
    title2: "je boekt.",
    body: "Voor het hele team, of alleen voor jezelf. In de galerij koopt iedereen zelf foto's, voor €5 per stuk.",
  },
  team: {
    name: "Voor je team of club",
    badge: "Gratis boeking",
    pitch: "Je boekt voor het hele team. Spelers, ouders en fans kopen zelf de foto's die ze willen.",
    price: "€0",
    priceNote: "boekingsbijdrage",
    perPhoto: "Daarna €5 per foto",
    example: "Voorbeeld: 3 foto's = €15",
    items: [
      "Geen vaste kosten vooraf",
      "Iedereen koopt zelf in de galerij",
      "Foto's eerst met watermerk, na aankoop zonder",
      "Kopen en downloaden met een account in het klantportaal",
    ],
    cta: "Boek voor je team",
  },
  individual: {
    name: "Voor jezelf",
    pitch: "Voor een speler die alleen voor zichzelf boekt, of een ouder die boekt voor het eigen kind.",
    price: "€20",
    priceNote: "boekingsbijdrage",
    perPhoto: "Daarna €5 per foto",
    example: "Voorbeeld: bijdrage + 3 foto's = €35",
    items: [
      "Je betaalt de bijdrage pas na onze bevestiging",
      "Daarna staat de datum vast",
      "Foto's eerst met watermerk, na aankoop zonder",
      "Kopen en downloaden met een account in het klantportaal",
    ],
    cta: "Boek voor jezelf",
  },

  steps: {
    label: "Het proces",
    title1: "Zo werkt",
    title2: "het.",
    body: "Vijf stappen, van je aanvraag tot je foto's.",
    step: (n: number) => `Stap ${String(n).padStart(2, "0")}`,
    items: [
      { title: "Aanvraag", sub: "Jij vult het formulier in", body: "Kies of je voor je team of voor jezelf boekt, en vertel welke wedstrijd het is." },
      { title: "Bevestiging", sub: "Binnen 24 uur", body: "We bevestigen de datum, met eventuele reiskosten erbij." },
      { title: "Bijdrage", sub: "Alleen als je voor jezelf boekt", body: "Je betaalt €20 na onze bevestiging. Daarna staat de datum vast. Bij een teamboeking sla je deze stap over." },
      { title: "Wedstrijd", sub: "Wij fotograferen", body: "Binnen een week staan de foto's met watermerk in de galerij." },
      { title: "Je foto's", sub: "Kiezen en downloaden", body: "Maak een account in het klantportaal, betaal €5 per foto en download ze zonder watermerk." },
    ],
  },

  prices: {
    label: "Prijzen",
    title1: "Wat het",
    title2: "kost.",
    body: "Wat je in totaal betaalt, inclusief btw.",
    team: "Team of club",
    teamNote: "€5 per foto, per koper",
    individual: "Voor jezelf",
    individualNote: "€20 bijdrage + €5 per foto",
    photoCount: (n: number) => (n === 1 ? "1 foto" : `${n} foto's`),
    travelLabel: "Reiskosten",
    travel: TRAVEL,
    rightsLabel: "Watermerk en rechten",
    rightsBefore: "In de galerij staan de foto's eerst met watermerk. Na aankoop download je ze zonder watermerk, met de ",
    rightsLink: "gebruiksrechten uit onze voorwaarden",
    rightsAfter: ".",
    packagesLabel: "Liever vooraf vastleggen?",
    packagesBefore: "Wil je een vaste set foto's vooraf? ",
    packagesLink: "Bekijk onze sportpakketten vanaf €50",
    packagesAfter: ".",
  },

  // Photos from the Sport category of the portfolio, in the photo strip of the service pages.
  photos: {
    label: "Uit het portfolio",
    title1: "Langs de",
    title2: "lijn.",
    body: "Een greep uit ons sportwerk. Klik op een foto om de hele serie te zien.",
    link: "Bekijk het hele portfolio →",
    previous: "Vorige foto's",
    next: "Volgende foto's",
  },

  request: {
    includedLabel: "Wat je kunt verwachten",
    included: [
      "Antwoord op je aanvraag binnen 24 uur",
      "Eventuele reiskosten in de bevestiging, voordat de boeking vaststaat",
      "Binnen een week de foto's met watermerk in de galerij",
      "Foto's kopen voor €5 per stuk, inclusief btw",
      "Downloaden zonder watermerk, met de gebruiksrechten uit onze voorwaarden",
    ],
    mailLabel: "Liever mailen?",
    mailBody: "Stuur je aanvraag gerust naar",
  },

  form: {
    label: "Aanvraag",
    title: "Vraag je wedstrijd aan",
    intro: "Vul in wat je weet. We reageren binnen 24 uur.",

    typeLegend: "Hoe boek je?",
    typeTeam: "Voor je team of club",
    typeTeamNote: "Gratis boeken, daarna €5 per foto",
    typeIndividual: "Voor jezelf",
    typeIndividualNote: "€20 bijdrage na bevestiging, daarna €5 per foto",

    aboutLegend: "Over jou",
    roleLabel: "Ik ben",
    roles: {
      speler: "Speler",
      ouder: "Ouder",
      trainer: "Trainer of teammanager",
      club: "Club of bestuur",
    },
    nameLabel: "Je naam",
    namePlaceholder: "Voor- en achternaam…",
    emailLabel: "E-mailadres",
    emailPlaceholder: "jij@voorbeeld.nl",
    emailHint: "Hier sturen we de bevestiging naartoe.",
    phoneLabel: "Telefoon (optioneel)",
    phonePlaceholder: "06 12345678",

    matchLegend: "De wedstrijd",
    clubLabel: "Naam van de club",
    teamLabel: "Team",
    teamLabelOptional: "Team (optioneel)",
    teamPlaceholder: "Bijvoorbeeld JO13-1 of Dames 2",
    sportLabel: "Sport",
    sports: ["Voetbal", "Hockey", "Korfbal", "Handbal", "Basketbal", "Volleybal", "Rugby", "Anders"],
    sportOther: "Anders",
    sportOtherLabel: "Welke sport?",
    dateLabel: "Datum",
    timeLabel: "Aanvangstijd",
    locationLabel: "Locatie",
    locationPlaceholder: "Sportpark of sporthal, met de plaats",

    forWhomLabel: "Voor wie zijn de foto's?",
    forWhomPlaceholder: "Naam van de speler, en het rugnummer als je dat weet",

    playersLabel: "Ongeveer hoeveel spelers?",
    contactPersonLabel: "Contactpersoon: trainer of teammanager",
    contactPersonPlaceholder: "Naam, en als je het hebt telefoon of e-mail",

    minorsLabel: "Spelen er spelers onder de 18 mee?",
    yes: "Ja",
    no: "Nee",
    consentBody: `Voor herkenbare foto's van kinderen is toestemming van de ouders nodig. Die regel jij als klant. Ouders geven toestemming door een account te maken in het klantportaal, of schriftelijk via ${EMAIL}.`,
    consentCheckTeam: "Ik zorg dat de ouders van de spelers onder de 18 toestemming geven.",
    consentCheckIndividual: "Ik zorg voor toestemming van de ouders van de speler.",

    messageLabel: "Opmerkingen (optioneel)",
    messagePlaceholder: "Alles wat helpt, zoals meerdere wedstrijden of de kleur van de shirts…",

    feeCheck: "Ik ga akkoord met de boekingsbijdrage van €20.",
    termsBefore: "Ik ga akkoord met de ",
    termsLink: "algemene voorwaarden",
    termsMiddle: " en de ",
    privacyLink: "privacyverklaring",
    termsAfter: ".",
    // For screen readers, after a link that opens a new tab.
    newTab: " (opent in een nieuw tabblad)",

    submit: "Verstuur aanvraag",
    submitting: "Versturen…",
    summaryLabel: "Nog niet compleet",
    summaryTitle: (n: number) => (n === 1 ? "Er ontbreekt nog 1 ding" : `Er ontbreken nog ${n} dingen`),
    sendError: `Versturen is niet gelukt. Probeer het nog eens, of mail je aanvraag naar ${EMAIL}.`,

    errors: {
      type: "Kies of je voor je team of voor jezelf boekt.",
      role: "Kies wie je bent.",
      name: "Vul je naam in.",
      email: "Vul je e-mailadres in.",
      emailInvalid: "Dit e-mailadres klopt niet. Het ziet er zo uit: naam@voorbeeld.nl.",
      club: "Vul de naam van de club in.",
      team: "Vul in om welk team het gaat.",
      sport: "Kies een sport.",
      sportOther: "Vul in welke sport het is.",
      date: "Kies de datum van de wedstrijd.",
      datePast: "Deze datum is al geweest. Kies een datum vanaf vandaag.",
      time: "Vul de aanvangstijd in.",
      location: "Vul in waar de wedstrijd is.",
      forWhom: "Vul in voor wie de foto's zijn.",
      players: "Vul ongeveer in hoeveel spelers er zijn.",
      playersInvalid: "Vul een aantal in tussen 1 en 99.",
      contactPerson: "Vul de naam van de trainer of teammanager in.",
      minors: "Kies of er spelers onder de 18 meedoen.",
      consent: "Vink aan dat je de toestemming van de ouders regelt.",
      fee: "Vink aan dat je akkoord gaat met de bijdrage van €20.",
      terms: "Vink aan dat je akkoord gaat met de voorwaarden en de privacyverklaring.",
    },
  },

  faq: [
    {
      q: "Wat kost het voor een team?",
      a: "Een teamboeking heeft geen boekingsbijdrage en geen vaste kosten vooraf. Iedereen die foto's wil, koopt ze zelf in de galerij voor €5 per foto, inclusief btw. Is de wedstrijd verder weg dan onze reisgrens, dan staan de reiskosten in de bevestiging, voordat de boeking definitief is.",
    },
    {
      q: "Wat kost het als ik alleen voor mezelf boek?",
      a: "Je betaalt een boekingsbijdrage van €20, nadat wij je aanvraag hebben bevestigd. Daarna kost elke foto €5, inclusief btw. Met 3 foto's betaal je dus €35. Eventuele reiskosten staan in de bevestiging.",
    },
    {
      q: "Mag ik als speler zelf boeken?",
      a: "Ja. Wil je alleen foto's van jezelf, kies dan 'Voor jezelf'. Boek je voor het hele team, dan vragen we ook naar je trainer of teammanager.",
    },
    {
      q: "Wat is het verschil met de sportpakketten?",
      a: "Bij een sportpakket, vanaf €50, leg je vooraf een vaste set foto's vast. Bij wedstrijdfotografie kies je na de wedstrijd zelf welke foto's je koopt, voor €5 per foto. Voor een team zonder vaste kosten vooraf, voor jezelf met een bijdrage van €20.",
    },
    {
      q: "Wanneer betaal ik reiskosten?",
      a: "Tot en met Breda en tot 25 km enkele reis vanaf Roosendaal betaal je geen reiskosten. Verder weg rekenen we €0,25 per extra kilometer, heen en terug, afgerond op hele euro's. Komt dat onder de €5 uit, dan rekenen we niets. Voorbeeld: 45 km enkele reis is 20 extra kilometer, heen en terug 40 km, dus €10. Het bedrag staat in de bevestiging, voordat de boeking definitief is.",
    },
    {
      q: "Moet ik een account hebben?",
      a: "Om foto's te kopen en te downloaden wel. Dat account maak je aan in ons klantportaal, met je e-mailadres.",
    },
    {
      q: "Waarom staat er een watermerk op de foto's?",
      a: "In de galerij zie je alle foto's eerst met een watermerk. Zo kun je rustig kiezen. Na aankoop download je de foto zonder watermerk.",
    },
    {
      q: "Welke rechten krijg ik?",
      a: "Je krijgt de gebruiksrechten uit onze voorwaarden. Als particulier mag je je foto's downloaden, bewaren, afdrukken, delen met familie en vrienden en plaatsen op je eigen social media, zolang dat niet commercieel is. Wil je een foto gebruiken voor reclame of sponsoring, vraag het ons dan eerst.",
    },
    {
      q: "Hoe lang kan ik downloaden?",
      a: "Tot drie maanden na levering, tenzij we iets anders afspreken. Download je foto's dus op tijd en bewaar zelf een kopie.",
    },
    {
      q: "Hoe zit het met jeugdteams en toestemming?",
      a: `Voor herkenbare foto's van kinderen is toestemming van de ouders nodig. Die regel jij als klant. Ouders geven toestemming door een account te maken in het klantportaal, of schriftelijk via ${EMAIL}. Foto's van kinderen zetten we niet op onze website zonder aparte toestemming.`,
    },
    {
      q: "Kan ik annuleren?",
      a: `Ja. Mail zo snel mogelijk naar ${EMAIL}, met je naam, de club en de datum. Wat er gebeurt met een bijdrage die je al betaald hebt, staat in onze regeling Annuleren en terugbetaling.`,
    },
    {
      q: "Komen jullie altijd als ik voor mezelf boek?",
      a: "Pas als wij je aanvraag hebben bevestigd en jij de bijdrage van €20 hebt betaald, staat de datum vast. Dan komen we. Kan het toch niet doorgaan door iets buiten onze macht, zoals extreem weer, dan laten we dat meteen weten en zoeken we samen een andere datum. Lukt dat niet, dan gelden onze regels voor annuleren en terugbetaling.",
    },
  ],

  end: {
    linksLabel: "Voorwaarden",
    links: [
      { to: "/algemene-voorwaarden", label: "Algemene voorwaarden" },
      { to: "/gebruiksrechten", label: "Gebruiksrechten" },
      { to: "/annuleren-en-terugbetaling", label: "Annuleren en terugbetaling" },
      { to: "/privacybeleid", label: "Privacyverklaring" },
    ],
    contactLabel: "Contact",
    title1: "Vragen?",
    title2: "Mail ons.",
    body: "We reageren binnen 24 uur.",
  },

  sent: {
    metaTitle: "Aanvraag verstuurd | PhotoDeCaffeine",
    label: "Aanvraag verstuurd",
    title: "We reageren binnen 24 uur",
    received: (name: string, club: string, date: string) =>
      `Bedankt${name ? `, ${name}` : ""}. Je aanvraag${club ? ` voor ${club}` : ""}${date ? ` op ${date}` : ""} is binnen.`,
    nextTitle: "Wat er nu gebeurt",
    nextTeam: [
      "We kijken of we op die datum kunnen en sturen je een bevestiging, met eventuele reiskosten.",
      "We fotograferen de wedstrijd. Binnen een week staan de foto's met watermerk in de galerij.",
      "Iedereen maakt een account, kiest foto's voor €5 per stuk en downloadt ze zonder watermerk.",
    ],
    nextIndividual: [
      "We kijken of we op die datum kunnen en sturen je een bevestiging, met eventuele reiskosten.",
      "Je betaalt de bijdrage van €20. Daarna staat de datum vast.",
      "We fotograferen de wedstrijd. Binnen een week staan de foto's met watermerk in de galerij.",
      "Je maakt een account, kiest je foto's voor €5 per stuk en downloadt ze zonder watermerk.",
    ],
    question: "Vragen? Mail naar",
    back: "Wedstrijdfotografie",
    home: "Naar de homepage",
  },
};

export type MatchTexts = typeof nl;

const TRAVEL_EN =
  "As far as Breda, and up to 25 km one way from Roosendaal, you pay no travel costs. Further away it's €0.25 per extra kilometre, there and back (rounded to whole euros; under €5 we charge nothing).";

const en: MatchTexts = {
  path: "/wedstrijdfotografie",
  sentPath: "/wedstrijdfotografie/verstuurd",
  stepsId: "zo-werkt-het",
  email: EMAIL,
  metaTitle: "Match photography for players, teams and clubs | PhotoDeCaffeine",
  metaDescription:
    "A photographer at your match. Book with your team or club with no fixed costs up front, or just for yourself with a €20 contribution. Every photo costs €5.",

  band: {
    label: "For teams and clubs",
    title: "Free booking",
    titleEm: "for your match.",
    body: "Team or club: no fixed costs up front. Just for yourself: a €20 contribution, then €5 per photo.",
    cta: "Book your match photographer",
    more: "How it works",
    facts: [
      { value: "€0", text: "booking contribution for your team" },
      { value: "€5", text: "per photo, including VAT" },
      { value: "1 week", text: "until the photos are in the gallery" },
    ],
  },

  backLabel: "Home",
  label: "Match photography",
  title: "Free",
  title2: "booking",
  titleEm: "for your team or club",
  subtitle:
    "Book with your team or club, with no fixed costs up front. Or book just for yourself, with a €20 contribution. After that, every photo costs €5.",
  bookCta: "Book your match photographer",
  heroCta: "Book for your team",
  heroMore: "How it works",
  heroTag: "Start-up campaign",
  heroPrice: "€5 per photo",

  choose: {
    label: "Two ways",
    title1: "Choose how",
    title2: "you book.",
    body: "For the whole team, or just for yourself. In the gallery everyone buys their own photos, at €5 each.",
  },
  team: {
    name: "For your team or club",
    badge: "Free booking",
    pitch: "You book for the whole team. Players, parents and fans buy the photos they want themselves.",
    price: "€0",
    priceNote: "booking contribution",
    perPhoto: "Then €5 per photo",
    example: "Example: 3 photos = €15",
    items: [
      "No fixed costs up front",
      "Everyone buys their own photos in the gallery",
      "Photos watermarked at first, without the watermark once bought",
      "Buy and download with an account in the client portal",
    ],
    cta: "Book for your team",
  },
  individual: {
    name: "For yourself",
    pitch: "For a player booking just for themselves, or a parent booking for their own child.",
    price: "€20",
    priceNote: "booking contribution",
    perPhoto: "Then €5 per photo",
    example: "Example: contribution + 3 photos = €35",
    items: [
      "You only pay the contribution after we confirm",
      "Then the date is fixed",
      "Photos watermarked at first, without the watermark once bought",
      "Buy and download with an account in the client portal",
    ],
    cta: "Book for yourself",
  },

  steps: {
    label: "The process",
    title1: "How it",
    title2: "works.",
    body: "Five steps, from your request to your photos.",
    step: (n) => `Step ${String(n).padStart(2, "0")}`,
    items: [
      { title: "Request", sub: "You fill in the form", body: "Choose whether you're booking for your team or for yourself, and tell us which match it is." },
      { title: "Confirmation", sub: "Within 24 hours", body: "We confirm the date, with any travel costs included." },
      { title: "Contribution", sub: "Only if you book for yourself", body: "You pay €20 after we confirm. Then the date is fixed. With a team booking you skip this step." },
      { title: "Match", sub: "We take the photos", body: "Within a week the watermarked photos are in the gallery." },
      { title: "Your photos", sub: "Choose and download", body: "Create an account in the client portal, pay €5 per photo and download them without the watermark." },
    ],
  },

  prices: {
    label: "Prices",
    title1: "What it",
    title2: "costs.",
    body: "What you pay in total, including VAT.",
    team: "Team or club",
    teamNote: "€5 per photo, per buyer",
    individual: "For yourself",
    individualNote: "€20 contribution + €5 per photo",
    photoCount: (n) => (n === 1 ? "1 photo" : `${n} photos`),
    travelLabel: "Travel costs",
    travel: TRAVEL_EN,
    rightsLabel: "Watermark and rights",
    rightsBefore: "In the gallery the photos are watermarked at first. Once you've bought them, you download them without the watermark, with the ",
    rightsLink: "usage rights from our terms",
    rightsAfter: ".",
    packagesLabel: "Rather agree it in advance?",
    packagesBefore: "Want a fixed set of photos agreed beforehand? ",
    packagesLink: "See our sports packages from €50",
    packagesAfter: ".",
  },

  photos: {
    label: "From the portfolio",
    title1: "On the",
    title2: "sidelines.",
    body: "A selection of our sports work. Click a photo to see the whole series.",
    link: "View the full portfolio →",
    previous: "Previous photos",
    next: "Next photos",
  },

  request: {
    includedLabel: "What you can expect",
    included: [
      "A reply to your request within 24 hours",
      "Any travel costs in the confirmation, before the booking is fixed",
      "The watermarked photos in the gallery within a week",
      "Photos for €5 each, including VAT",
      "Downloads without the watermark, with the usage rights from our terms",
    ],
    mailLabel: "Prefer email?",
    mailBody: "Feel free to send your request to",
  },

  form: {
    label: "Request",
    title: "Request your match",
    intro: "Fill in what you know. We reply within 24 hours.",

    typeLegend: "How are you booking?",
    typeTeam: "For your team or club",
    typeTeamNote: "Free to book, then €5 per photo",
    typeIndividual: "For yourself",
    typeIndividualNote: "€20 contribution after confirmation, then €5 per photo",

    aboutLegend: "About you",
    roleLabel: "I am",
    roles: {
      speler: "A player",
      ouder: "A parent",
      trainer: "A coach or team manager",
      club: "The club or its board",
    },
    nameLabel: "Your name",
    namePlaceholder: "First and last name…",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    emailHint: "We'll send the confirmation here.",
    phoneLabel: "Phone (optional)",
    phonePlaceholder: "+31 6 12345678",

    matchLegend: "The match",
    clubLabel: "Club name",
    teamLabel: "Team",
    teamLabelOptional: "Team (optional)",
    teamPlaceholder: "For example JO13-1 or Dames 2",
    sportLabel: "Sport",
    sports: ["Football", "Hockey", "Korfball", "Handball", "Basketball", "Volleyball", "Rugby", "Other"],
    sportOther: "Other",
    sportOtherLabel: "Which sport?",
    dateLabel: "Date",
    timeLabel: "Start time",
    locationLabel: "Location",
    locationPlaceholder: "Sports ground or sports hall, with the town",

    forWhomLabel: "Who are the photos for?",
    forWhomPlaceholder: "The player's name, and their shirt number if you know it",

    playersLabel: "Roughly how many players?",
    contactPersonLabel: "Contact person: coach or team manager",
    contactPersonPlaceholder: "Name, plus phone or email if you have it",

    minorsLabel: "Are any players under 18 taking part?",
    yes: "Yes",
    no: "No",
    consentBody: `Recognisable photos of children need their parents' consent. As the client, you arrange that. Parents give consent by creating an account in the client portal, or in writing via ${EMAIL}.`,
    consentCheckTeam: "I'll make sure the parents of the players under 18 give their consent.",
    consentCheckIndividual: "I'll arrange consent from the player's parents.",

    messageLabel: "Comments (optional)",
    messagePlaceholder: "Anything that helps, like several matches or the colour of the shirts…",

    feeCheck: "I agree to the €20 booking contribution.",
    termsBefore: "I agree to the ",
    termsLink: "general terms and conditions",
    termsMiddle: " and the ",
    privacyLink: "privacy statement",
    termsAfter: ".",
    newTab: " (opens in a new tab)",

    submit: "Send request",
    submitting: "Sending…",
    summaryLabel: "Not complete yet",
    summaryTitle: (n) => (n === 1 ? "1 thing is still missing" : `${n} things are still missing`),
    sendError: `Sending didn't work. Please try again, or email your request to ${EMAIL}.`,

    errors: {
      type: "Please choose whether you're booking for your team or for yourself.",
      role: "Please choose who you are.",
      name: "Please enter your name.",
      email: "Please enter your email address.",
      emailInvalid: "This email address isn't right. It should look like this: name@example.com.",
      club: "Please enter the club's name.",
      team: "Please enter which team it is.",
      sport: "Please choose a sport.",
      sportOther: "Please enter which sport it is.",
      date: "Please choose the date of the match.",
      datePast: "This date has already passed. Please choose a date from today onwards.",
      time: "Please enter the start time.",
      location: "Please enter where the match is.",
      forWhom: "Please enter who the photos are for.",
      players: "Please enter roughly how many players there are.",
      playersInvalid: "Please enter a number between 1 and 99.",
      contactPerson: "Please enter the name of the coach or team manager.",
      minors: "Please choose whether any players under 18 are taking part.",
      consent: "Please tick to confirm that you'll arrange the parents' consent.",
      fee: "Please tick to agree to the €20 contribution.",
      terms: "Please tick to agree to the terms and the privacy statement.",
    },
  },

  faq: [
    {
      q: "What does it cost for a team?",
      a: "A team booking has no booking contribution and no fixed costs up front. Anyone who wants photos buys them in the gallery for €5 per photo, including VAT. If the match is further away than our travel limit, the travel costs are in the confirmation, before the booking is final.",
    },
    {
      q: "What does it cost if I book just for myself?",
      a: "You pay a €20 booking contribution after we've confirmed your request. After that, every photo costs €5, including VAT. So with 3 photos you pay €35. Any travel costs are in the confirmation.",
    },
    {
      q: "Can I book myself as a player?",
      a: "Yes. If you only want photos of yourself, choose 'For yourself'. If you're booking for the whole team, we'll also ask about your coach or team manager.",
    },
    {
      q: "How is this different from the sports packages?",
      a: "With a sports package, from €50, you agree a fixed set of photos in advance. With match photography you choose which photos to buy after the match, for €5 per photo. For a team with no fixed costs up front, for yourself with a €20 contribution.",
    },
    {
      q: "When do I pay travel costs?",
      a: "As far as Breda, and up to 25 km one way from Roosendaal, you pay no travel costs. Further away we charge €0.25 per extra kilometre, there and back, rounded to whole euros. If that comes to less than €5, we charge nothing. Example: 45 km one way is 20 extra kilometres, 40 km there and back, so €10. The amount is in the confirmation, before the booking is final.",
    },
    {
      q: "Do I need an account?",
      a: "To buy and download photos, yes. You create that account in our client portal, with your email address.",
    },
    {
      q: "Why is there a watermark on the photos?",
      a: "In the gallery you first see all the photos with a watermark, so you can take your time choosing. Once you've bought a photo, you download it without the watermark.",
    },
    {
      q: "What rights do I get?",
      a: "You get the usage rights from our terms. As a private individual you may download, keep and print your photos, share them with family and friends, and post them on your own social media, as long as that isn't commercial. Want to use a photo for advertising or sponsorship? Then ask us first.",
    },
    {
      q: "How long can I download?",
      a: "Up to three months after delivery, unless we agree otherwise. So download your photos in time and keep a copy yourself.",
    },
    {
      q: "What about youth teams and consent?",
      a: `Recognisable photos of children need their parents' consent. As the client, you arrange that. Parents give consent by creating an account in the client portal, or in writing via ${EMAIL}. We don't put photos of children on our website without separate consent.`,
    },
    {
      q: "Can I cancel?",
      a: `Yes. Email ${EMAIL} as soon as possible, with your name, the club and the date. What happens to a contribution you've already paid is set out in our Cancellation and refunds policy.`,
    },
    {
      q: "Will you always come if I book for myself?",
      a: "The date is only fixed once we've confirmed your request and you've paid the €20 contribution. Then we'll be there. If it can't go ahead after all because of something beyond our control, like extreme weather, we'll let you know straight away and find another date together. If that doesn't work out, our rules on cancellation and refunds apply.",
    },
  ],

  end: {
    linksLabel: "Terms",
    links: [
      { to: "/algemene-voorwaarden", label: "General terms and conditions" },
      { to: "/gebruiksrechten", label: "Usage rights" },
      { to: "/annuleren-en-terugbetaling", label: "Cancellation and refunds" },
      { to: "/privacybeleid", label: "Privacy statement" },
    ],
    contactLabel: "Contact",
    title1: "Questions?",
    title2: "Email us.",
    body: "We reply within 24 hours.",
  },

  sent: {
    metaTitle: "Request sent | PhotoDeCaffeine",
    label: "Request sent",
    title: "We'll reply within 24 hours",
    received: (name, club, date) =>
      `Thank you${name ? `, ${name}` : ""}. We've received your request${club ? ` for ${club}` : ""}${date ? ` on ${date}` : ""}.`,
    nextTitle: "What happens next",
    nextTeam: [
      "We check whether we're free on that date and send you a confirmation, with any travel costs.",
      "We photograph the match. Within a week the watermarked photos are in the gallery.",
      "Everyone creates an account, picks photos at €5 each and downloads them without the watermark.",
    ],
    nextIndividual: [
      "We check whether we're free on that date and send you a confirmation, with any travel costs.",
      "You pay the €20 contribution. Then the date is fixed.",
      "We photograph the match. Within a week the watermarked photos are in the gallery.",
      "You create an account, pick your photos at €5 each and download them without the watermark.",
    ],
    question: "Questions? Email",
    back: "Match photography",
    home: "To the home page",
  },
};

/**
 * The Dutch texts. Also where the paths and the values a request is sent with
 * come from (roles, sports): those stay Dutch whatever the page's language.
 */
export const matchPage = nl;

export const matchPages = { nl, en };

/** The campaign's texts in the visitor's language. */
export function useMatchPage(): MatchTexts {
  return matchPages[useLanguage().language];
}
