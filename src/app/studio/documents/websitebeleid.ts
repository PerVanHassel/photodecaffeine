// The document the team reads in the admin: the texts for clients (lib/legal.ts,
// also what the site shows) with the internal notes around them. This is the
// source now; the Word file it started from stopped at version 1.1.

import { LEGAL_PARTS, LEGAL_SECTIONS } from "../../lib/legal";
import type { ReaderDocument, ReaderPart, ReaderSection } from "./types";

const START_PARTS: ReaderPart[] = [
  {
    "id": "start",
    "title": "Voor je begint",
    "meta": []
  }
];

const NOTE_PARTS: ReaderPart[] = [
  {
    "id": "intern",
    "title": "Interne implementatienotities",
    "meta": [],
    "internal": true
  }
];

const START: ReaderSection[] = [
  {
    "id": "start--over-dit-document",
    "part": "start",
    "title": "Over dit document",
    "blocks": [
      {
        "t": "note",
        "text": "**Status op 6 november 2026:** versie 1.3. Alle notities van Per zijn verwerkt en de invulvelden zijn ingevuld. De klantteksten staan op de website en nieuwe offertes gaan met deze versie de deur uit. Een jurist heeft de teksten niet getoetst: dat moet nog, net als de andere punten onder H in de interne notities. De website is op 2 november 2026 met een browser gecontroleerd op cookies, lokale opslag en externe diensten. De uitkomst staat in het Cookiebeleid."
      },
      {
        "t": "note",
        "text": "**Wat is er veranderd in versie 1.3:** klanten kunnen een factuur online betalen via Mollie. Artikel 5 van de voorwaarden noemt de betaalmethoden en zegt dat online betalen niets extra kost. De privacyverklaring noemt Mollie bij de dienstverleners, zegt wat we van een betaling bewaren en hoe lang. Het cookiebeleid zegt dat de betaalpagina van Mollie zijn eigen regels heeft. Bij herroepen staat dat we een online betaling via Mollie terugstorten, met een creditfactuur."
      },
      {
        "t": "note",
        "text": "**Wat is er veranderd in versie 1.2:** offertes zijn 10 werkdagen geldig, 40% voorschot, betaaltermijn en feedback 10 werkdagen, drie revisierondes. Downloadlinks blijven een kwartaal staan voor foto en video, bij websites is er geen download. Er is een afspraak over schade aan de drone. Bij portretten staat met nadruk dat ander gebruik alleen kan als beide kanten dat duidelijk afspreken. Pagina 10 over websites is nieuw. Bedrijfsgegevens, leveranciers, bewaartermijnen en cookies zijn ingevuld met wat de site echt doet. Interne aanwijzingen zijn uit de klantteksten gehaald."
      }
    ],
    "changed": true
  },
  {
    "id": "start--zo-publiceer-je-deze-teksten",
    "part": "start",
    "title": "Zo publiceer je deze teksten",
    "blocks": [
      {
        "t": "p",
        "text": "De genummerde pagina’s hieronder zijn de teksten voor klanten en staan op de website. De implementatienotities en formulieren aan het einde zijn interne documenten en komen niet op de site. De klantteksten staan in src/app/lib/legal.ts. Verander je daar iets aan de inhoud, verhoog dan ook het versienummer: bij een offerte bewaren we met welke versie iemand akkoord ging."
      },
      {
        "t": "p",
        "text": "Links in de footer: Algemene voorwaarden · Gebruiksrechten · Annuleren & terugbetaling · Oplevering & revisies · Websites · Privacy · Cookies · Contact & klachten · Websitegebruik · Onze belofte · Overeenkomst herroepen · Cookie-instellingen."
      },
      {
        "t": "p",
        "text": "Vastgestelde werkafspraken: offertes zijn 10 werkdagen geldig; een voorschot van 40% bij boeking; een betaaltermijn van 10 werkdagen; drie revisierondes voor film-, ontwerp- en websitewerk; feedback bij voorkeur binnen 10 werkdagen; downloadlinks zijn een kwartaal beschikbaar voor foto en video, bij websites is er geen download; ruw productiemateriaal wordt 90 dagen na definitieve oplevering bewaard; definitieve masterbestanden worden 12 maanden bewaard; gebruik buiten de licentie door een zakelijke opdrachtgever kost twee keer het gewone licentietarief, met 100% extra als een verplichte naamsvermelding ontbreekt. Werkdagen zijn maandag tot en met vrijdag."
      }
    ]
  }
];

const NOTES: ReaderSection[] = [
  {
    "id": "intern--a-bedrijfsgegevens-en-werkafspraken-die",
    "part": "intern",
    "title": "A. Bedrijfsgegevens en werkafspraken die moeten worden bevestigd",
    "blocks": [
      {
        "t": "p",
        "text": "1. Gedaan, met één open punt: de gegevens uit de instellingen staan in de teksten. Controleer bij de KVK of naam en adres precies zo zijn ingeschreven. De rechtsvorm staat nergens genoemd en moet erbij."
      },
      {
        "t": "p",
        "text": "2. Gedaan: Per heeft de afspraken op 23 oktober 2026 aangepast in de notities. Laat ze aansluiten op de daadwerkelijke capaciteit, verzekering en verplichtingen aan leveranciers."
      },
      {
        "t": "p",
        "text": "3. Websitebouw staat nu op pagina 10. Open: voeg productspecifieke voorwaarden toe vóór verkoop van albums, afdrukken, downloadbare gidsen, cursussen, cadeaubonnen of andere producten buiten deze productieopdrachten."
      },
      {
        "t": "p",
        "text": "4. Maak onderscheid tussen zakelijke overeenkomsten en consumentenovereenkomsten. Een particuliere bruiloft is niet automatisch een zakelijke opdracht omdat de klant een bedrijf heeft."
      },
      {
        "t": "p",
        "text": "5. Leg opleverdata, aantallen, formaten, kosten en rechten per offerte vast. De website kan niet alle projectspecifieke afspraken vervangen."
      },
      {
        "t": "p",
        "text": "6. Open: bepaal de prijsstelling voor betaalde commerciële reclame. Neem betaalde socialmedia-inzet uitdrukkelijk op waar dat de bedoeling is, zodat de klant niet wordt verrast door een uitgesloten kanaal. Leg ook het licentietarief per soort gebruik vast; de vergoeding bij gebruik buiten de licentie (pagina 3, artikel 13) rekent daarmee."
      },
      {
        "t": "p",
        "text": "7. Gedaan op 2 november 2026: privacyverklaring, leveranciers, bewaartermijnen en cookies zijn ingevuld na controle van de site en de code. De cookiebanner werkt echt. Controleer de lijst als je een nieuwe dienst gaat gebruiken."
      },
      {
        "t": "p",
        "text": "8. Open: laat een Nederlandse jurist de annuleringsvergoeding voor consumenten, zakelijke aansprakelijkheidslimiet, rechtenoverdrachten, de uitsluiting van artikel 19 Auteurswet, de vergoeding bij gebruik buiten de licentie en afspraken met filmmakers en performers toetsen. Alleen brede voorwaarden publiceren garandeert geen bescherming."
      },
      {
        "t": "p",
        "text": "9. Open: er is nu alleen een Nederlandse versie. Houd de Nederlandse en Engelse versie inhoudelijk gelijk en verstrek voorwaarden in een taal die de klant begrijpt. Een eventuele afspraak over welke taalversie voorgaat, moet duidelijk zijn overeengekomen en kan dwingendrechtelijke rechten niet wegnemen."
      },
      {
        "t": "p",
        "text": "10. Gedaan: de oude tekst over intellectueel eigendom staat niet meer op de website."
      }
    ]
  },
  {
    "id": "intern--b-maak-de-voorwaarden-onderdeel-van-de-b",
    "part": "intern",
    "title": "B. Maak de voorwaarden onderdeel van de boeking",
    "blocks": [
      {
        "t": "li",
        "text": "Gedaan: de prijsopgave noemt de versie en linkt naar de voorwaarden. Na akkoord krijgt de klant meteen een bevestiging per e-mail."
      },
      {
        "t": "li",
        "text": "Gedaan: bij akkoord bewaren we datum, tijd, versie, de keuzes en een kopie van de prijsopgave."
      },
      {
        "t": "li",
        "text": "Gedaan: de licentie staat in de offertebouwer onder Rechten."
      },
      {
        "t": "li",
        "text": "Gedaan: portfolio en vroeg beginnen zijn losse keuzes, niet aangevinkt, naast het akkoord op de voorwaarden. Marketing vragen we niet, want die sturen we niet."
      },
      {
        "t": "li",
        "text": "Gedaan: /herroepen heeft twee stappen en een bevestiging per e-mail. De link staat in de footer en bij een offerte van een particulier."
      },
      {
        "t": "li",
        "text": "Gedaan: de knop heet Akkoord met betalingsverplichting."
      },
      {
        "t": "li",
        "text": "Gedaan: er staat geen link naar dat platform op de site."
      },
      {
        "t": "li",
        "text": "Laat doorlopende consumentenabonnementen vóór introductie afzonderlijk toetsen. Gebruik geen algemene uitsluiting van terugbetaling of automatische jaarlijkse verlenging zonder beoordeling."
      },
      {
        "t": "li",
        "text": "Geen bestelproces voor goederen publiceren voordat retouradres, termijn en retourkosten zijn ingevuld."
      },
      {
        "t": "li",
        "text": "Regel onderaan de site: © (jaar) PhotoDeCaffeine Productions, handelend onder de namen PhotoDeCaffeine / PDC Productions. Alle rechten voorbehouden, met inachtneming van de wet."
      }
    ]
  },
  {
    "id": "intern--c-specificatie-van-de-projectlicentie-vo",
    "part": "intern",
    "title": "C. Specificatie van de projectlicentie (voeg toe aan iedere offerte)",
    "blocks": [
      {
        "t": "p",
        "text": "Project/referentie: [ ]"
      },
      {
        "t": "p",
        "text": "Contracterende opdrachtgever en licentiehouder: [ ]"
      },
      {
        "t": "p",
        "text": "Opgeleverde resultaten waarop de licentie ziet: [ ]"
      },
      {
        "t": "p",
        "text": "Doel: [ ]"
      },
      {
        "t": "p",
        "text": "Licentie: [particulier / commercieel / afzonderlijk overeengekomen]"
      },
      {
        "t": "p",
        "text": "Kanalen: [organische social media / website / e-mail / drukwerk / betaalde social media / anders]"
      },
      {
        "t": "p",
        "text": "Gebied: [ ]"
      },
      {
        "t": "p",
        "text": "Duur en ingangsdatum: [ ]"
      },
      {
        "t": "p",
        "text": "Exclusiviteit: [niet-exclusief / duidelijk omschreven exclusiviteit]"
      },
      {
        "t": "p",
        "text": "Overdraagbaar: [nee / ja, aan: ]"
      },
      {
        "t": "p",
        "text": "Toegestane aanpassingen: [ ]"
      },
      {
        "t": "p",
        "text": "Bevoegde dienstverleners: [ ]"
      },
      {
        "t": "p",
        "text": "Beperkingen voor muziek, stock, modellen/performers en andere onderdelen: [ ]"
      },
      {
        "t": "p",
        "text": "Naamsvermelding: [gewaardeerd / verplichte formulering / niet vereist]"
      },
      {
        "t": "p",
        "text": "Ruwe of bewerkbare bestanden: [uitgesloten / gespecificeerd inbegrepen]"
      },
      {
        "t": "p",
        "text": "Vergoeding en moment waarop de licentie ingaat: [ ]"
      },
      {
        "t": "p",
        "text": "Afloop, verlenging en bestaande publicaties: [ ]"
      },
      {
        "t": "p",
        "text": "Toestemming voor portfolio: [afzonderlijke afspraak/referentie; nooit verondersteld]"
      },
      {
        "t": "p",
        "text": "Goedkeuring: [bevoegde persoon, datum en vastlegging]"
      }
    ]
  },
  {
    "id": "intern--d-vrijwillige-toestemming-voor-portfolio",
    "part": "intern",
    "title": "D. Vrijwillige toestemming voor portfolio en portretgebruik (afzonderlijk formulier)",
    "blocks": [
      {
        "t": "p",
        "text": "Project: [ ]"
      },
      {
        "t": "p",
        "text": "Deelnemer: [ ]"
      },
      {
        "t": "p",
        "text": "Juridische bedrijfsnaam PDC: [ ]"
      },
      {
        "t": "p",
        "text": "“Ik geef PDC toestemming om de geselecteerde foto’s of opnamen, aangeduid als [bestanden/selectie], op de volgende plaatsen te publiceren voor de genoemde doeleinden en periode:"
      },
      {
        "t": "p",
        "text": "[ ] Portfolio op de PDC-website: [doel/periode]"
      },
      {
        "t": "p",
        "text": "[ ] Organische socialmedia-accounts van PDC: [accounts/doel/periode]"
      },
      {
        "t": "p",
        "text": "[ ] Gedrukt portfolio van PDC: [verspreiding/periode]"
      },
      {
        "t": "p",
        "text": "[ ] Betaalde advertenties van PDC: [specifieke campagne, kanalen en periode]"
      },
      {
        "t": "p",
        "text": "Gebruik van mijn naam: [geen / voornaam / goedgekeurde volledige naamsvermelding]."
      },
      {
        "t": "p",
        "text": "Andere beperkingen of afgesproken uitsluitingen: [ ]."
      },
      {
        "t": "p",
        "text": "Ik heb de Privacyverklaring ontvangen. Deze toestemming is vrijwillig en verandert de kwaliteit of afgesproken prijs van mijn boeking niet. Voor zover dit gebruik op mijn toestemming berust, kan ik die voor toekomstig gebruik intrekken via [e-mailadres]. PDC legt uit hoe verwijdering wordt behandeld, inclusief al verspreid drukwerk en zelfstandig gedeelde berichten van derden.”"
      },
      {
        "t": "p",
        "text": "Handtekening/datum: [ ]"
      },
      {
        "t": "p",
        "text": "Bevoegdheid van ouder/voogd waar wettelijk vereist: [ ]"
      },
      {
        "t": "p",
        "text": "Wensen of instemming van het kind waar passend: [ ]"
      },
      {
        "t": "p",
        "text": "Dit formulier geeft toestemming voor het omschreven portfoliogebruik. Het is geen onbeperkte, onherroepelijke toestemming voor ieder denkbaar gebruik. Bij betaalde modellen of performers, opnamen in een arbeidsrelatie, gevoelige situaties, kinderen en campagnes kunnen een aangepaste verklaring en extra waarborgen nodig zijn. Gebruik toestemming van een werknemer niet wanneer die niet vrij kan worden gegeven."
      }
    ]
  },
  {
    "id": "intern--e-verzoek-van-een-consument-om-vroeg-te",
    "part": "intern",
    "title": "E. Verzoek van een consument om vroeg te beginnen (vrijwillig en afzonderlijk)",
    "blocks": [
      {
        "t": "p",
        "text": "[ ] “Ik verzoek PDC uitdrukkelijk om vóór het einde van de bedenktijd van 14 dagen met de afgesproken diensten te beginnen. Ik begrijp dat ik bij herroeping tijdens die periode een evenredige vergoeding voor daadwerkelijk geleverde diensten verschuldigd kan zijn, voor zover de wet dat toestaat.”"
      },
      {
        "t": "p",
        "text": "[ ] “Ik begrijp dat mijn herroepingsrecht na volledige uitvoering van de diensten vervalt als aan de wettelijke voorwaarden voor vroege uitvoering en het vervallen van dat recht is voldaan.”"
      },
      {
        "t": "p",
        "text": "Gebruik deze keuzes alleen wanneer ze van toepassing zijn. Leg het verzoek vast, verstrek de verplichte informatie en bevestig dit op een manier waarop de consument het kan bewaren."
      },
      {
        "t": "p",
        "text": "Gebruik voor directe levering van betaalde digitale inhoud zonder fysieke drager een afzonderlijke toepasselijke keuze:"
      },
      {
        "t": "p",
        "text": "[ ] “Ik stem er uitdrukkelijk mee in dat de levering van [specifieke digitale inhoud] vóór het einde van mijn bedenktijd begint. Ik erken dat mijn herroepingsrecht vervalt zodra die levering begint.”"
      },
      {
        "t": "p",
        "text": "Verstrek de wettelijk vereiste bevestiging voordat je je beroept op het vervallen van het recht. Beoordeel een productiedienst en een afzonderlijke aankoop van digitale inhoud op de juiste manier. Kies niet uitsluitend een categorie om annuleringsrechten uit te sluiten."
      }
    ]
  },
  {
    "id": "intern--f-bescherming-die-pdc-achter-de-schermen",
    "part": "intern",
    "title": "F. Bescherming die PDC achter de schermen moet regelen",
    "blocks": [
      {
        "t": "p",
        "text": "Websiteteksten creëren geen rechten waarover PDC niet beschikt. Regel waar relevant het volgende:"
      },
      {
        "t": "li",
        "text": "**Auteursrecht van de oprichters naar PDC.** Volgens de wet ligt het auteursrecht bij de persoon die de foto of film maakt. Wil PDC het auteursrecht hebben, zoals pagina 3 zegt, dan moet iedere oprichter het auteursrecht op het eigen huidige en toekomstige PDC-werk aan PDC overdragen met een ondertekende akte (artikel 2 Auteurswet). Is PDC een vof of eenmanszaak, laat dan door de jurist bepalen hoe dat het beste kan. Zonder deze akte klopt pagina 3 niet."
      },
      {
        "t": "li",
        "text": "Schriftelijke afspraken met crew, editors en freelancers over exploitatierechten, benodigde overdrachten of licenties, geheimhouding, beveiliging en onderaanneming. Gebruik ook hier een ondertekende akte als het auteursrecht naar PDC moet gaan."
      },
      {
        "t": "li",
        "text": "Toestemming en rechten voor muziek, performers, modellen, locaties, kunstwerken, stockmateriaal, lettertypen en klantmateriaal binnen de beoogde kanalen."
      },
      {
        "t": "li",
        "text": "Een informatie- en toestemmingsprocedure voor deelnemers, inclusief aankondigingen bij evenementen, een route voor vragen of bezwaren en passende afspraken voor kinderen."
      },
      {
        "t": "li",
        "text": "Een verwerkersovereenkomst wanneer PDC verwerker is; een verdeling van privacyrollen en passende afspraken wanneer partijen zelfstandig of gezamenlijk verwerkingsverantwoordelijke zijn."
      },
      {
        "t": "li",
        "text": "Werkelijke back-up-, toegangs-, downloadlink- en verwijderprocedures die aansluiten op het gepubliceerde beleid."
      },
      {
        "t": "li",
        "text": "Een rechtenregister dat iedere eindproductie koppelt aan de rechten van makers, de klantlicentie, beperkingen van derden en eventuele portfoliotoestemming."
      },
      {
        "t": "li",
        "text": "Een passende verzekering en een aansprakelijkheidsbepaling die daarop aansluit."
      },
      {
        "t": "li",
        "text": "Projectspecifieke bijlagen voor doorlopende contentabonnementen, betaalde campagnes, producties in het buitenland, coproducties of bijzondere risico’s. Leg bij abonnementen de facturatiecyclus, resultaten, boekingsprocedure, ongebruikte afname, minimumduur, opzegging en eventuele rechtsgeldige verlenging vast."
      }
    ]
  },
  {
    "id": "intern--g-onderzoeksbronnen-intern-geen-onderdee",
    "part": "intern",
    "title": "G. Onderzoeksbronnen (intern, geen onderdeel van de websitetekst)",
    "blocks": [
      {
        "t": "p",
        "text": "De juridische uitgangspunten van de Engelse brontekst zijn op 22 oktober 2026 gecontroleerd aan de hand van de onderstaande officiële bronnen. De commerciële standaardafspraken zijn voorstellen voor PDC en geen wettelijke eisen. Deze Nederlandse versie behoudt die uitgangspunten."
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Algemene voorwaarden: https://business.gov.nl/regulations/general-terms-conditions/"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Algemene voorwaarden opstellen: https://business.gov.nl/running-your-business/legal-matters/drafting-general-terms-and-conditions/"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Auteursrecht in Nederland: https://business.gov.nl/regulations/copyright/"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Consumentenrechten: https://business.gov.nl/running-your-business/legal-matters/consumer-law-your-rights-and-obligations-as-a-seller/"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Online verkopen: https://business.gov.nl/regulations/long-distance-sales-and-purchases/"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Online herroepingsfunctie, verplicht sinds 19 juni 2026: https://business.gov.nl/amendments/online-shops-must-have-cancellation-button/"
      },
      {
        "t": "li",
        "text": "EUR-Lex, Richtlijn consumentenrechten, geconsolideerd op 27 september 2026: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02011L0083-20260927"
      },
      {
        "t": "li",
        "text": "Business.gov.nl, Bewaren van factuurgegevens: https://business.gov.nl/regulations/invoice-requirements/"
      },
      {
        "t": "li",
        "text": "Autoriteit Persoonsgegevens, Privacyrechten: https://www.autoriteitpersoonsgegevens.nl/themas/basis-avg/privacyrechten-avg"
      },
      {
        "t": "li",
        "text": "Autoriteit Persoonsgegevens, Bewaren van persoonsgegevens: https://www.autoriteitpersoonsgegevens.nl/themas/basis-avg/privacy-en-persoonsgegevens/bewaren-van-persoonsgegevens"
      },
      {
        "t": "li",
        "text": "Autoriteit Persoonsgegevens, Cookies: https://www.autoriteitpersoonsgegevens.nl/themas/internet-slimme-apparaten/cookies"
      },
      {
        "t": "li",
        "text": "Auteurswet (artikelen 2, 19, 20 en 25): https://wetten.overheid.nl/BWBR0001886/"
      },
      {
        "t": "li",
        "text": "Supabase, back-ups per abonnement: https://supabase.com/docs/guides/platform/backups"
      },
      {
        "t": "li",
        "text": "Resend, Data Privacy Framework: https://www.resend.com/changelog/data-privacy-framework-certification"
      }
    ]
  },
  {
    "id": "p7--tekst-voor-de-cookiebanner",
    "part": "intern",
    "title": "Tekst voor de cookiebanner",
    "blocks": [
      {
        "t": "p",
        "text": "**Jouw privacy, jouw keuze.**"
      },
      {
        "t": "p",
        "text": "We gebruiken noodzakelijke technieken om deze website te laten werken. Met jouw toestemming gebruiken we ook de optionele technieken uit ons Cookiebeleid. Kies wat bij je past."
      },
      {
        "t": "p",
        "text": "Knoppen: Optionele cookies accepteren · Optionele cookies weigeren · Voorkeuren beheren"
      },
      {
        "t": "p",
        "text": "Voorkeurscategorieën: Noodzakelijk (altijd actief) · Analyse (uit). Marketing gebruiken we niet, dus die staat er niet bij."
      }
    ]
  },
  {
    "id": "intern--h-wat-er-nog-moet-gebeuren",
    "part": "intern",
    "title": "H. Wat er nog moet gebeuren (bijgewerkt op 6 november 2026)",
    "blocks": [
      {
        "t": "p",
        "text": "De belangrijkste punten eerst. De site en de offertes zijn bijgewerkt; dit kan alleen PDC zelf regelen."
      },
      {
        "t": "li",
        "text": "**Akte auteursrecht.** Per, Ryan en Majd dragen het auteursrecht op hun PDC-werk over aan PDC met een ondertekende akte. Zonder akte klopt pagina 3 niet."
      },
      {
        "t": "li",
        "text": "**Jurist.** Laat de teksten toetsen, vooral artikel 19 Auteurswet, de vergoeding bij gebruik buiten de licentie, annuleringskosten voor consumenten, de aansprakelijkheid en de drone-afspraak."
      },
      {
        "t": "li",
        "text": "**KVK.** Controleer naam en adres en vul de rechtsvorm aan. Dokter Lemmensstraat 32 staat nu openbaar op de site. Is dat een woonadres, kijk dan of je dat zo wilt. Mollie wil op de site dezelfde naam en rechtsvorm zien als bij de KvK."
      },
      {
        "t": "li",
        "text": "**Verzekering.** Beroepsaansprakelijkheid en apparatuur. De aansprakelijkheid in de voorwaarden moet daarbij passen."
      },
      {
        "t": "li",
        "text": "**Drone.** Registratie als exploitant, EU-certificaat (A1/A3) en WA-verzekering. Zonder die dingen mag je niet vliegen, ook niet met een afspraak over schade."
      },
      {
        "t": "li",
        "text": "**Verwerkersovereenkomsten.** Regel ze met Supabase, Vercel, Resend, Strato, Notion en Anthropic. En met elke websiteklant van wie contactformulieren via PDC lopen, zoals Aqua Spa Service en Suroh. Mollie hoeft niet: die is zelf verantwoordelijk, net als Revolut."
      },
      {
        "t": "li",
        "text": "**Mollie.** Rond het account af: KvK-nummer, je ID en de eigenaren van het bedrijf. Geef je Revolut-IBAN op voor de uitbetalingen en doe de controlebetaling. Zet iDEAL | Wero, kaart, Bancontact en Apple Pay aan. Zet eerst de test-sleutel in Supabase (Edge Functions, Secrets, naam MOLLIE_API_KEY) en na de goedkeuring de live-sleutel. Pas met de live-sleutel zien klanten de knop Betaal nu."
      },
      {
        "t": "li",
        "text": "**Mollie-kosten.** Mollie houdt de kosten in op de uitbetaling en stuurt elke maand een factuur. Zet die bij de kosten in de boekhouding. Op je Revolut-rekening komt dus iets minder binnen dan het factuurbedrag."
      },
      {
        "t": "li",
        "text": "**Terugbetalen.** Doe het met de knop Terugbetalen bij de factuur in de admin, niet in Mollie zelf. Dan komt er meteen een creditfactuur bij en krijgt de klant een mail."
      },
      {
        "t": "li",
        "text": "**Betalingen bewaren.** Betaalde online betalingen blijven 7 jaar bij de factuur, zoals de fiscale bewaarplicht vraagt. Pogingen die niet zijn afgerond, gaan na 12 maanden vanzelf weg."
      },
      {
        "t": "li",
        "text": "**Back-ups.** Supabase staat op het gratis abonnement en maakt dan geen automatische back-ups. Foto’s in de opslag zitten nooit in die back-ups. De offerte-sjablonen beloofden dagelijkse back-ups; dat is eruit gehaald. Neem het Pro-abonnement of maak zelf back-ups, en zet de belofte daarna terug. Het concept OF-2026-004 voor Suroh belooft nog back-ups: pas dat aan of regel ze voordat je het verstuurt."
      },
      {
        "t": "li",
        "text": "**Licentietarieven.** Artikel 13 op pagina 3 rekent met je licentietarief, maar dat tarief staat nog nergens. Leg het per soort gebruik vast."
      },
      {
        "t": "li",
        "text": "**Portfolio.** Vraag toestemming voor Jitske & Gabriele, Biker Portrait (Timur), Artistic portraits, DVO’60 9, BMW M135i (Marlon, kenteken zichtbaar), BMW 320i Touring (Rick, kenteken zichtbaar), BMW M4 COMP en Ferrari. De links staan klaar in de admin onder Portfolio. Zegt iemand nee, dan gaat het werk vanzelf van de site. In het artikel over de BMW M135i staat ook Marko met naam. Vraag ook hem, of haal de naam weg."
      },
      {
        "t": "li",
        "text": "**Homepage.** De grote foto is een straatbeeld uit Albanië met herkenbare muzikanten en toeristen. Voor reclame is dat een risico (artikel 21 Auteurswet). Kies liever een foto met toestemming. Dat geldt ook voor de portfoliopagina Albanië."
      },
      {
        "t": "li",
        "text": "**Street art.** Muurschilderingen hebben een maker met eigen auteursrecht. Dat kan spelen bij de Madrid- en Italy-collecties."
      },
      {
        "t": "li",
        "text": "**Bestaande klanten.** Arjan (Aqua Spa Service) ging op 11 oktober akkoord op de oude voorwaarden, die voor die opdracht blijven gelden. Nieuw werk krijgt een nieuwe prijsopgave. OF-2026-003 van Suroh is verlopen; het concept OF-2026-004 staat al op de nieuwe afspraken."
      },
      {
        "t": "li",
        "text": "**Kleine boekingen.** DVO’60, Luc, Rick en Marlon hebben geen prijsopgave en dus geen akkoord op de voorwaarden. Maak voortaan ook voor een kleine shoot een prijsopgave. De projectpagina waarschuwt als die ontbreekt."
      },
      {
        "t": "li",
        "text": "**AI.** Pagina 3 belooft dat herkenbaar klantmateriaal niet wordt gebruikt om AI te trainen. Zet training uit in de instellingen van Claude en van andere tools die je gebruikt."
      },
      {
        "t": "li",
        "text": "**Engels.** De voorwaarden zijn alleen in het Nederlands. Maak een vertaling als je Engelstalige klanten krijgt."
      },
      {
        "t": "li",
        "text": "**Foto’s opruimen.** Pagina 5 en 6 zeggen dat ruw materiaal 90 dagen en masterbestanden 12 maanden blijven. De automatische opruiming doet alleen aanvragen, statistieken, gasten en het logboek. Foto’s en bestanden ruim je zelf op; zet dat in de agenda.",
    },
    {
      "t": "li",
      "text": "**Freelancers en register.** Afspraken met crew en freelancers en een rechtenregister, zie F."
      },
      {
        "t": "li",
        "text": "**Word-bestand.** Het Word-bestand staat nog op versie 1.1. Deze versie in de admin is nu de bron."
      }
    ],
    "changed": true
  }
];

export const websitebeleid: ReaderDocument = {
  id: "websitebeleid",
  title: "PhotoDeCaffeine | PDC Productions",
  subtitle: "Websitebeleid & Gebruiksrechten",
  meta: "Originele PDC-teksten • Nederlandse versie 1.3 • Opgesteld op 22 oktober 2026, bijgewerkt op 6 november 2026",
  author: "Majd",
  version: "1.3",
  parts: [...START_PARTS, ...LEGAL_PARTS, ...NOTE_PARTS],
  sections: [...START, ...LEGAL_SECTIONS, ...NOTES],
};
