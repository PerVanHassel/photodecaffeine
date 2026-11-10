// Texts of the match photography campaign: the strip on the home page, the
// page /wedstrijdfotografie with its request form, and the page after sending.
// Prices live in lib/matchBooking.ts; the sentences here say the same numbers.
//
// House rules for this campaign: "gratis" and "geen vaste kosten vooraf" only
// next to a team or club booking, never as a promise for everyone. No number
// of photos per player and no delivery time beyond the week in the steps.

const EMAIL = "contact@photodecaffeine.com";

const TRAVEL =
  "Tot en met Breda en tot 25 km enkele reis vanaf Roosendaal betaal je geen reiskosten, verder weg €0,25 per extra kilometer heen en terug (afgerond op hele euro's, onder de €5 rekenen we niets).";

export const matchPage = {
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
  label: "Start-upcampagne",
  // A soft hyphen, so the long word breaks cleanly on a phone.
  title: "Wedstrijd\u00adfotografie",
  titleEm: "voor spelers, teams en clubs",
  subtitle:
    "Boek met je team of club, zonder vaste kosten vooraf. Of boek alleen voor jezelf, met een bijdrage van €20. Elke foto kost daarna €5.",
  bookCta: "Boek je wedstrijdfotograaf",

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

  photos: {
    label: "Voorbeeldfoto's",
    title1: "Langs de",
    title2: "lijn.",
    body: "Hier komen foto's van wedstrijden, zodra we die met toestemming mogen laten zien.",
    placeholder: "Voorbeeldfoto volgt",
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
    optionalNote: "Velden zonder (optioneel) zijn nodig om je aanvraag te versturen.",

    typeLegend: "Hoe boek je?",
    typeTeam: "Voor je team of club",
    typeTeamNote: "Geen boekingsbijdrage",
    typeIndividual: "Voor jezelf",
    typeIndividualNote: "€20 bijdrage na bevestiging",

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
    matchesLabel: "Eén wedstrijd of meerdere? (optioneel)",
    matchesOne: "Eén wedstrijd",
    matchesMore: "Meerdere wedstrijden",
    matchesMoreHint: "Zet de andere data bij de opmerkingen.",

    playerLegend: "Over de speler",
    forWhomLabel: "Voor wie zijn de foto's?",
    forWhomPlaceholder: "Naam van de speler",
    shirtLabel: "Rugnummer (optioneel)",
    tipLabel: "Positie of herkenningstip (optioneel)",
    tipPlaceholder: "Bijvoorbeeld keeper, of de kleur van de schoenen",

    teamLegend: "Over het team",
    playersLabel: "Ongeveer hoeveel spelers?",
    contactPersonLabel: "Contactpersoon: trainer of teammanager",
    contactPersonPlaceholder: "Naam, en als je het hebt telefoon of e-mail",

    minorsLabel: "Spelen er spelers onder de 18 mee?",
    minorsHint: "Bijvoorbeeld een jeugdteam, of je boekt voor je kind.",
    yes: "Ja",
    no: "Nee",
    consentTitle: "Toestemming bij kinderen",
    consentBody: `Voor herkenbare foto's van kinderen is toestemming van de ouders nodig. Die regel jij als klant. Ouders geven toestemming door een account te maken in het klantportaal, of schriftelijk via ${EMAIL}.`,
    consentCheckTeam: "Ik zorg dat de ouders van de spelers onder de 18 toestemming geven.",
    consentCheckIndividual: "Ik zorg voor toestemming van de ouders van de speler.",

    messageLabel: "Opmerkingen (optioneel)",
    messagePlaceholder: "Alles wat helpt, zoals een tweede datum of de kleur van de shirts…",

    priceTitle: "Wat het kost",
    priceEmpty: "Kies bovenaan hoe je boekt. Dan zie je hier wat het kost.",
    priceTeam: [
      "Geen boekingsbijdrage en geen vaste kosten vooraf.",
      "Iedereen koopt zelf foto's in de galerij, voor €5 per foto.",
    ],
    priceTeamExample: "Voorbeeld: 3 foto's kosten €15.",
    priceIndividual: [
      "€20 boekingsbijdrage. Die betaal je pas na onze bevestiging, daarna staat de datum vast.",
      "Daarna €5 per foto.",
    ],
    priceIndividualExample: "Voorbeeld: €20 + 3 foto's van €5 = €35.",

    feeCheck: "Ik ga akkoord met de boekingsbijdrage van €20.",
    termsBefore: "Ik ga akkoord met de ",
    termsLink: "algemene voorwaarden",
    termsMiddle: " en de ",
    privacyLink: "privacyverklaring",
    termsAfter: ".",

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
