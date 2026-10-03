// The legal texts, each on its own page (pages/LegalPage.tsx) and linked from
// the footer and every inquiry form.

export type PolicySection = { heading: string; body: string };

export type PolicyDoc = {
  path: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export const policies = {
  privacy: {
    path: "/privacybeleid",
    title: "Privacybeleid",
    description: "Welke gegevens Photo De Caffeine verzamelt, waarvoor, hoe lang en wat uw rechten zijn.",
    lastUpdated: "Laatst bijgewerkt: oktober 2026",
    sections: [
      {
        heading: "1. Wie zijn wij",
        body: "Photo De Caffeine (PDC) is een visuele contentstudio, ingeschreven in Nederland onder KvK-nummer 94948933. Adres: Middenstraat 47, Roosendaal. Wij zijn verantwoordelijk voor de verwerking van uw persoonsgegevens zoals beschreven in dit beleid.",
      },
      {
        heading: "2. Gegevens die wij verzamelen",
        body: "Wanneer u een formulier op onze website invult, verzamelen wij uw naam, e-mailadres, telefoonnummer, bedrijfsnaam en de inhoud van uw bericht. Bij een boeking zijn dat ook het voertuig, de gewenste datum en de locatie. Wij verzamelen geen gevoelige persoonsgegevens en gebruiken geen advertentiecookies.",
      },
      {
        heading: "3. Hoe wij uw gegevens gebruiken",
        body: "Wij gebruiken uw gegevens uitsluitend om uw aanvraag te beantwoorden en, waar nodig, om onze klantrelatie te beheren. Wij verkopen, delen of verhuren uw gegevens niet aan derden.",
      },
      {
        heading: "4. Bezoekersstatistieken",
        body: "Wij tellen bezoeken met Plausible Analytics. Plausible gebruikt geen cookies en slaat geen persoonsgegevens op: wij zien alleen totalen, zoals hoeveel mensen een pagina bekeken of een aanvraag verstuurden.",
      },
      {
        heading: "5. Dienstverleners",
        body: "Voor de website en het verwerken van aanvragen werken wij met Vercel (hosting van de website), Supabase (database en opslag) en Plausible (bezoekersstatistieken). Zij verwerken gegevens alleen voor ons en niet voor eigen doeleinden.",
      },
      {
        heading: "6. Bewaartermijn",
        body: "Contactaanvragen bewaren wij maximaal 2 jaar na ontvangst. Gegevens van klantprojecten bewaren wij 7 jaar, vanwege de wettelijke bewaarplicht voor de administratie.",
      },
      {
        heading: "7. Uw rechten (AVG)",
        body: "U heeft recht op inzage, correctie en verwijdering van uw persoonsgegevens. Stuur uw verzoek naar contact@photodecaffeine.com. Wij reageren binnen 30 dagen.",
      },
      {
        heading: "8. Beveiliging",
        body: "Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen. Onze systemen gebruiken versleutelde verbindingen en opslag met toegangscontrole.",
      },
      {
        heading: "9. Contact",
        body: "Vragen over dit beleid? Mail naar contact@photodecaffeine.com of schrijf naar Middenstraat 47, Roosendaal.",
      },
    ],
  },
  terms: {
    path: "/algemene-voorwaarden",
    title: "Algemene voorwaarden",
    description: "De algemene voorwaarden van Photo De Caffeine: offertes, betaling, levering, annulering en gebruiksrechten.",
    lastUpdated: "Laatst bijgewerkt: oktober 2026",
    sections: [
      {
        heading: "1. Toepasselijkheid",
        body: "Deze voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en leveringen van Photo De Caffeine (PDC), KvK 94948933, Middenstraat 47, Roosendaal.",
      },
      {
        heading: "2. Offertes en overeenkomsten",
        body: "Alle offertes zijn 30 dagen geldig. Een overeenkomst komt tot stand na schriftelijke bevestiging (per e-mail) door beide partijen. Wijzigingen moeten schriftelijk worden bevestigd.",
      },
      {
        heading: "3. Betaling",
        body: "Vóór de shootdatum is een aanbetaling van 50% vereist. Het resterende bedrag moet binnen 14 dagen na de levering van de definitieve bestanden worden betaald. Over te laat betaalde facturen is de wettelijke rente verschuldigd.",
      },
      {
        heading: "4. Intellectueel eigendom",
        body: "PDC behoudt het volledige auteursrecht op alle beelden totdat de volledige betaling is ontvangen. Na volledige betaling ontvangt de opdrachtgever een niet-exclusieve gebruikslicentie zoals beschreven in de offerte. PDC mag de beelden gebruiken voor portfolio- en promotiedoeleinden, tenzij schriftelijk anders is afgesproken.",
      },
      {
        heading: "5. Levering",
        body: "Definitieve bestanden worden geleverd via een beveiligde downloadlink, binnen de termijn die in de projectovereenkomst staat. Standaard leveren wij binnen 14 werkdagen na de shoot.",
      },
      {
        heading: "6. Annulering",
        body: "Bij annulering binnen 7 dagen voor de shootdatum vervalt de aanbetaling. Bij annulering meer dan 14 dagen van tevoren wordt de aanbetaling volledig terugbetaald.",
      },
      {
        heading: "7. Aansprakelijkheid",
        body: "De aansprakelijkheid van PDC is beperkt tot de factuurwaarde van het betreffende project. PDC is niet aansprakelijk voor indirecte schade of gevolgschade.",
      },
      {
        heading: "8. Toepasselijk recht",
        body: "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Breda.",
      },
    ],
  },
  cookie: {
    path: "/cookiebeleid",
    title: "Cookiebeleid",
    description: "Welke cookies photodecaffeine.com gebruikt: alleen wat nodig is om in te loggen, geen advertentie- of trackingcookies.",
    lastUpdated: "Laatst bijgewerkt: oktober 2026",
    sections: [
      {
        heading: "1. Wat zijn cookies",
        body: "Cookies zijn kleine tekstbestanden die op uw apparaat worden geplaatst wanneer u een website bezoekt. Ze worden gebruikt om websites te laten werken, de prestaties te verbeteren en informatie aan website-eigenaren te verstrekken.",
      },
      {
        heading: "2. Cookies die wij gebruiken",
        body: "Wij gebruiken uitsluitend strikt noodzakelijke cookies. Dit zijn sessiecookies die nodig zijn om u ingelogd te houden in het klantportaal en de beheeromgeving. Wij gebruiken geen advertentie-, analyse- of trackingcookies. Onze bezoekersstatistieken (Plausible) werken zonder cookies.",
      },
      {
        heading: "3. Cookies van derden",
        body: "Wij gebruiken geen scripts van derden die cookies plaatsen, zoals Google Analytics of Meta Pixel. Als dat verandert, passen we dit beleid aan en tonen we een toestemmingsbanner.",
      },
      {
        heading: "4. Cookies beheren",
        body: "U kunt cookies op elk moment verwijderen of blokkeren via uw browserinstellingen. Let op: zonder sessiecookies kunt u niet inloggen in het klantportaal of de beheeromgeving.",
      },
      {
        heading: "5. Contact",
        body: "Vragen over ons cookiegebruik? Stuur een e-mail naar contact@photodecaffeine.com.",
      },
    ],
  },
} satisfies Record<string, PolicyDoc>;
