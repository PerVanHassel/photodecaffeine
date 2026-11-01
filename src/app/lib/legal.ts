// The texts for clients, each part on its own page (pages/LegalPage.tsx). The admin
// shows the same text with the internal notes around it (studio/documents/websitebeleid.ts).
// Changing what they say? Raise the version in lib/legalVersion.ts as well: a quote
// keeps which version someone agreed to.

import type { ReaderPart, ReaderSection } from "../studio/documents/types";

export const LEGAL_PARTS: ReaderPart[] = [
  {
    "id": "p1",
    "title": "Onze belofte",
    "number": 1,
    "meta": [
      "Op de site: /onze-belofte",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p2",
    "title": "Algemene voorwaarden",
    "number": 2,
    "meta": [
      "Op de site: /algemene-voorwaarden",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p3",
    "title": "Auteursrecht & gebruiksrechten",
    "number": 3,
    "meta": [
      "Op de site: /gebruiksrechten",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p4",
    "title": "Annuleren, verplaatsen & terugbetaling",
    "number": 4,
    "meta": [
      "Op de site: /annuleren-en-terugbetaling",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p5",
    "title": "Oplevering, revisies & bestandsopslag",
    "number": 5,
    "meta": [
      "Op de site: /oplevering-en-revisies",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p6",
    "title": "Privacyverklaring",
    "number": 6,
    "meta": [
      "Op de site: /privacybeleid",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p7",
    "title": "Cookiebeleid",
    "number": 7,
    "meta": [
      "Op de site: /cookiebeleid",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p8",
    "title": "Contact & klachten",
    "number": 8,
    "meta": [
      "Op de site: /contact-en-klachten",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p9",
    "title": "Websitegebruik & auteursrechtvermelding",
    "number": 9,
    "meta": [
      "Op de site: /websitevoorwaarden",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  },
  {
    "id": "p10",
    "title": "Websites: bouw, hosting en onderhoud",
    "number": 10,
    "meta": [
      "Op de site: /voorwaarden-websites",
      "Ingangsdatum: 2 november 2026 · Versie: 1.2"
    ]
  }
];

export const LEGAL_SECTIONS: ReaderSection[] = [
  {
    "id": "p1--creatief-werk-heldere-afspraken-wederzij",
    "part": "p1",
    "title": "Creatief werk. Heldere afspraken. Wederzijds respect.",
    "blocks": [
      {
        "t": "p",
        "text": "Elke PDC-productie begint met een gedeelde visie. Met aandacht en vakmanschap vertalen we die naar fotografie, film, websites en andere visuele content. Daarbij maken we vooraf duidelijk wat we opleveren."
      },
      {
        "t": "p",
        "text": "Voordat de productie begint, leggen we de opdracht, prijs, planning en gebruiksrechten schriftelijk vast. Zo weet je waarin je investeert, hoe je het eindresultaat mag gebruiken en wat er gebeurt als plannen veranderen."
      },
      {
        "t": "p",
        "text": "We respecteren de mensen voor onze camera en de informatie die achter de schermen met ons wordt gedeeld. Persoonlijke momenten en vertrouwelijke projecten verdienen een zorgvuldige behandeling. Toestemming om je project in ons portfolio te tonen staat los van je boeking."
      },
      {
        "t": "p",
        "text": "Ook ons creatieve werk verdient bescherming. Het auteursrecht blijft bij PDC. De overeenkomst geeft je duidelijk omschreven rechten om de definitieve productie te gebruiken. Ruwe opnamen en bewerkbare productiebestanden worden alleen afzonderlijk gedeeld, als we dat hebben afgesproken. Zo is voor iedereen duidelijk wat er geldt."
      },
      {
        "t": "p",
        "text": "Voldoet iets niet aan de afspraken? Laat het ons weten. We luisteren, onderzoeken wat er is gebeurd en werken aan een passende oplossing."
      },
      {
        "t": "p",
        "text": "Vragen over je project of de gebruiksrechten? Neem contact op via contact@photodecaffeine.com."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--1-wie-wij-zijn",
    "part": "p2",
    "title": "1. Wie wij zijn",
    "blocks": [
      {
        "t": "p",
        "text": "PhotoDeCaffeine en PDC Productions zijn handelsnamen van PhotoDeCaffeine Productions, gevestigd aan Dokter Lemmensstraat 32, 4701 LZ Roosendaal, Nederland, ingeschreven bij de Kamer van Koophandel onder nummer 94948933, met btw-identificatienummer NL823807071B01."
      },
      {
        "t": "p",
        "text": "In deze voorwaarden verwijzen “PDC”, “wij”, “we”, “ons” en “onze” naar deze onderneming. Je bereikt ons via contact@photodecaffeine.com of +31 6 36112514."
      },
      {
        "t": "p",
        "text": "Met “je” en “opdrachtgever” bedoelen we de persoon of organisatie die een overeenkomst met PDC sluit. Een consument is een natuurlijke persoon die de overeenkomst hoofdzakelijk sluit voor doeleinden buiten diens bedrijfs- of beroepsactiviteit."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--2-waarop-deze-voorwaarden-van-toepassing",
    "part": "p2",
    "title": "2. Waarop deze voorwaarden van toepassing zijn",
    "blocks": [
      {
        "t": "p",
        "text": "Deze voorwaarden gelden voor fotografie, filmproductie, montage, websites, social media beheer, creatieve productie, contentpakketten en bijbehorende producten of diensten die PDC levert."
      },
      {
        "t": "p",
        "text": "De geaccepteerde offerte of projectovereenkomst beschrijft de specifieke werkzaamheden, op te leveren resultaten, prijs, planning en licentie. Daarbij kunnen een productiebriefing en de bij je boeking verstrekte regelingen over gebruiksrechten, annulering en oplevering horen."
      },
      {
        "t": "p",
        "text": "Bouwen we een website voor je, dan gelden daarnaast de afspraken op de pagina Websites."
      },
      {
        "t": "p",
        "text": "Dwingend recht gaat voor. Met inachtneming daarvan hebben individueel overeengekomen projectafspraken voorrang op deze algemene voorwaarden. Een projectovereenkomst kan dwingendrechtelijke consumentenrechten niet uitsluiten."
      },
      {
        "t": "p",
        "text": "We verstrekken de toepasselijke documenten vóór het sluiten van de overeenkomst op een manier waarop je ze kunt opslaan. Elke prijsopgave noemt de versie van deze voorwaarden die erbij hoort. Een nieuwe versie op de website wijzigt een bestaande boeking niet automatisch."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--3-offertes-en-boekingen",
    "part": "p2",
    "title": "3. Offertes en boekingen",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij anders vermeld, zijn offertes 10 werkdagen geldig. Werkdagen zijn maandag tot en met vrijdag. Een offerte reserveert geen datum, tenzij wij uitdrukkelijk bevestigen dat we die voorlopig vrijhouden."
      },
      {
        "t": "p",
        "text": "Een boeking wordt bindend zodra wij de aanvaarding van je opdracht schriftelijk bevestigen. Onze bevestiging vermeldt de datum, de omvang van de opdracht en de betalingsafspraken. Ga je online akkoord op een prijsopgave, dan krijg je die bevestiging meteen per e-mail, met een link naar wat je hebt geaccepteerd. Als betaling van een voorschot nodig is om productietijd te reserveren, maken we dit vóór de boeking duidelijk."
      },
      {
        "t": "p",
        "text": "In de overeenkomst wordt vastgelegd wie bevoegd is om creatief werk en extra kosten goed te keuren. Een bureau dat voor een andere organisatie boekt, moet duidelijk maken wie de contracterende opdrachtgever en de beoogde licentiehouder zijn."
      },
      {
        "t": "p",
        "text": "Voor wezenlijke wijzigingen van een offerte is een nieuwe schriftelijke afspraak nodig. Kennelijke fouten corrigeren we vóór aanvaarding. Fouten die daarna worden ontdekt, behandelen we volgens het toepasselijke recht."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--4-opdracht-en-creatieve-richting",
    "part": "p2",
    "title": "4. Opdracht en creatieve richting",
    "blocks": [
      {
        "t": "p",
        "text": "We leveren de resultaten die in de overeenkomst zijn beschreven. Aantallen beelden, filmlengtes, bestandsformaten, beeldverhoudingen, talen, ondertiteling, retouche, crew, locaties en publicatieversies zijn alleen inbegrepen voor zover dit is afgesproken."
      },
      {
        "t": "p",
        "text": "Ons portfolio geeft een indruk van onze werkwijze. Iedere productie wordt echter beïnvloed door de betrokken mensen, locatie, belichting en briefing. Referentiebeelden en -films geven richting; ze vormen geen toezegging van een identiek resultaat en geven geen toestemming om werk van een andere maker te reproduceren."
      },
      {
        "t": "p",
        "text": "Waar de briefing creatieve keuzes openlaat, handelt PDC naar professioneel inzicht, passend bij het afgesproken doel en de afgesproken stijl. Creatieve vrijheid ontslaat ons niet van de verplichting om aan overeengekomen specificaties te voldoen."
      },
      {
        "t": "p",
        "text": "We garanderen geen bepaald aantal weergaven, verkopen, boekingen, prijzen of platformresultaten, tenzij een meetbare toezegging uitdrukkelijk in de overeenkomst staat."
      }
    ]
  },
  {
    "id": "p2--5-prijzen-kosten-en-betaling",
    "part": "p2",
    "title": "5. Prijzen, kosten en betaling",
    "blocks": [
      {
        "t": "p",
        "text": "Consumentenprijzen zijn inclusief btw en onvermijdelijke kosten. Zakelijke offertes vermelden duidelijk of btw is inbegrepen of wordt toegevoegd. Reis- en verblijfskosten, vergunningen, modellen of performers, muziek, rekwisieten, locatiekosten, verzending en andere kosten worden vóór het sluiten van de overeenkomst opgenomen of toegelicht."
      },
      {
        "t": "p",
        "text": "Tenzij de offerte anders vermeldt, bedraagt het voorschot bij boeking 40% van de totale projectprijs. Dit voorschot wordt met die prijs verrekend. Het is niet automatisch uitgesloten van terugbetaling; de annuleringsregels en het wettelijke herroepingsrecht bepalen welk bedrag mag worden ingehouden."
      },
      {
        "t": "p",
        "text": "Facturen moeten binnen 10 werkdagen worden betaald, tenzij een andere rechtsgeldige betalingsregeling is afgesproken. Betaalmomenten, waaronder een eventueel restantbedrag vóór vrijgave van de definitieve bestanden, worden vóór de boeking vastgelegd. Voor vooruitbetaling bij consumentenkoop houden we ons aan de wettelijke grenzen."
      },
      {
        "t": "p",
        "text": "Voor meerwerk vragen we eerst akkoord. Bij betalingsachterstand nemen we contact op en verstrekken we de wettelijk vereiste kennisgevingen voordat we wettelijke rente of toegestane incassokosten in rekening brengen of werkzaamheden op evenredige wijze opschorten. Consumenten krijgen de wettelijk vereiste gelegenheid om alsnog zonder incassokosten te betalen."
      },
      {
        "t": "p",
        "text": "We leggen geen willekeurige boetes voor te late betaling op. Je behoudt je wettelijke rechten om een factuur te betwisten, een evenredig betwist bedrag op te schorten of een andere rechtsgeldige oplossing te verlangen."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--6-wijzigingen-en-meerwerk",
    "part": "p2",
    "title": "6. Wijzigingen en meerwerk",
    "blocks": [
      {
        "t": "p",
        "text": "Een wijziging van de briefing, opnamedatum, locatie, op te leveren resultaten of goedgekeurde montage kan gevolgen hebben voor de prijs en planning. We leggen die gevolgen uit en vragen schriftelijk akkoord voordat we doorgaan."
      },
      {
        "t": "p",
        "text": "Extra opnamen, nieuwe concepten, uitgebreide retouche, aanvullende formaten, vertalingen, spoedoplevering en wijzigingen na een goedgekeurde productiefase worden alleen in rekening gebracht als dit is afgesproken."
      },
      {
        "t": "p",
        "text": "Moeten we door een dringende situatie een productiebeslissing nemen en is je contactpersoon niet bereikbaar, dan treffen we redelijke maatregelen om de veiligheid en het afgesproken resultaat te beschermen. Dit geeft ons geen onbeperkte bevoegdheid om extra kosten te maken."
      }
    ]
  },
  {
    "id": "p2--7-voorbereiding-en-medewerking-van-de-op",
    "part": "p2",
    "title": "7. Voorbereiding en medewerking van de opdrachtgever",
    "blocks": [
      {
        "t": "p",
        "text": "Lever juiste briefings, planningen, contactgegevens, merkmateriaal, feitelijke informatie en benodigde goedkeuringen tijdig aan. Wijs waar nodig een contactpersoon aan die vragen kan beantwoorden en deelnemers kan coördineren."
      },
      {
        "t": "p",
        "text": "In de overeenkomst verdelen we de verantwoordelijkheid voor toegang, vergunningen, toestemming voor locaties en eigendommen, informatie aan deelnemers en toestemmingsverklaringen. PDC blijft verantwoordelijk voor wettelijke verplichtingen die op PDC zelf rusten, waaronder de eigen vereiste bevoegdheden en vergunningen."
      },
      {
        "t": "p",
        "text": "Degene die boekt, kan niet automatisch namens iedere gast, medewerker, performer of andere deelnemer toestemming geven. Vóór de opnamen spreken we een passende informatie- en toestemmingsprocedure af."
      },
      {
        "t": "p",
        "text": "Meld beperkingen, vertrouwelijkheid, toegankelijkheidsbehoeften en personen die niet gefotografeerd of gefilmd mogen worden. Verstrek geen onnodige gevoelige persoonsgegevens."
      },
      {
        "t": "p",
        "text": "Vertraging door te laat aangeleverd materiaal, niet-beschikbare deelnemers of ontbrekende goedkeuringen kan een redelijke wijziging van de planning noodzakelijk maken. Eventuele extra kosten moeten worden toegelicht en afgesproken."
      }
    ]
  },
  {
    "id": "p2--8-productieomstandigheden-en-veiligheid",
    "part": "p2",
    "title": "8. Productieomstandigheden en veiligheid",
    "blocks": [
      {
        "t": "p",
        "text": "Productie vereist veilige, rechtmatige toegang en geschikte omstandigheden. We mogen werkzaamheden onderbreken of stoppen bij een ernstig veiligheidsrisico, intimidatie, geweld, onrechtmatig handelen of een wettelijke beperking. Waar mogelijk leggen we eerst uit wat er moet worden opgelost en bieden we gelegenheid daartoe."
      },
      {
        "t": "p",
        "text": "Dronegebruik is afhankelijk van de geldende luchtvaartregels, bevoegdheden van de piloot, locatiebeperkingen, weersomstandigheden en een veilige uitvoering. Een droneopname wordt nooit los van deze voorwaarden gegarandeerd."
      },
      {
        "t": "p",
        "text": "Wil je dat we vliegen op een plek of onder omstandigheden waarin de drone extra risico loopt, terwijl het wel mag en veilig kan? Dan doen we dat alleen als je vooraf schriftelijk afspreekt dat je schade aan de apparatuur vergoedt. In die afspraak staat om welke apparatuur het gaat en tot welk bedrag. Buiten de regels of bij gevaar vliegen we nooit, ook niet met zo’n afspraak."
      },
      {
        "t": "p",
        "text": "Bij live-evenementen spannen we ons redelijkerwijs in om afgesproken prioriteiten vast te leggen. Toegangsbeperkingen, belichting, verstoringen en gelijktijdige gebeurtenissen kunnen beïnvloeden wat kan worden opgenomen. We kunnen niet ieder spontaan moment garanderen, maar blijven verplicht de afgesproken dienst zorgvuldig en vakkundig uit te voeren."
      },
      {
        "t": "p",
        "text": "Overwerk vereist akkoord en wordt uitsluitend berekend tegen het vooraf in de overeenkomst vermelde tarief. Werkuren, pauzes en eventuele maaltijden of overnachtingen voor de crew worden waar nodig afgesproken."
      }
    ],
    "changed": true
  },
  {
    "id": "p2--9-crew-en-onderaannemers",
    "part": "p2",
    "title": "9. Crew en onderaannemers",
    "blocks": [
      {
        "t": "p",
        "text": "We mogen geschikte crewleden, editors en gespecialiseerde leveranciers inschakelen. PDC blijft verantwoordelijk voor de overeengekomen dienstverlening en voor passende afspraken over vertrouwelijkheid en gegevensbescherming."
      },
      {
        "t": "p",
        "text": "Is een specifiek genoemde maker een essentieel onderdeel van je boeking, dan vragen we akkoord voordat we die persoon vervangen. Is geen aanvaardbare vervanger beschikbaar, dan bespreken we verplaatsing, annulering en de oplossingen waarop je recht hebt."
      }
    ]
  },
  {
    "id": "p2--10-oplevering-beoordeling-en-oplossingen",
    "part": "p2",
    "title": "10. Oplevering, beoordeling en oplossingen",
    "blocks": [
      {
        "t": "p",
        "text": "De projectovereenkomst en onze regeling Oplevering & revisies beschrijven de opleverdata, bestandsformaten en inbegrepen feedbackrondes."
      },
      {
        "t": "p",
        "text": "Meld problemen zo snel mogelijk en geef voldoende informatie om ze te onderzoeken. Een feedbacktermijn is een verzoek voor een soepel werkproces. Het verstrijken daarvan betekent niet automatisch dat je rechten vervallen of dat je stilzwijgend akkoord bent."
      },
      {
        "t": "p",
        "text": "Als wij verantwoordelijk zijn voor een afwijking van de overeenkomst, herstellen we die waar nodig zonder extra kosten. Afhankelijk van de omstandigheden en het toepasselijke recht kan een passende oplossing bestaan uit herstel, vervanging, een nieuwe opname, prijsvermindering, ontbinding of terugbetaling."
      }
    ]
  },
  {
    "id": "p2--11-intellectuele-eigendom-en-vertrouweli",
    "part": "p2",
    "title": "11. Intellectuele eigendom en vertrouwelijkheid",
    "blocks": [
      {
        "t": "p",
        "text": "Het auteursrecht op alles wat PDC maakt, blijft bij PDC. De regeling Gebruiksrechten beschrijft het auteursrecht, licenties, toegestane aanpassingen en uitgesloten gebruik. Betaling van productiekosten draagt op zichzelf geen auteursrecht over en geeft geen onbeperkte afkoop van rechten."
      },
      {
        "t": "p",
        "text": "Iedere partij behoudt de rechten op het materiaal dat die zelf aanlevert. Je geeft ons de beperkte gebruiksrechten die nodig zijn om het aangeleverde materiaal voor de opdracht te verwerken. Je bevestigt dat je daartoe bevoegd bent."
      },
      {
        "t": "p",
        "text": "Beide partijen beschermen informatie die als vertrouwelijk is aangeduid of waarvan redelijkerwijs duidelijk is dat deze vertrouwelijk is. Delen is toegestaan voor zover dit nodig is voor de opdracht met ontvangers die passend aan vertrouwelijkheid zijn gebonden, wettelijk verplicht is of de informatie al rechtmatig openbaar is."
      },
      {
        "t": "p",
        "text": "Leg een publicatiedatum, embargo, geheimhoudingsovereenkomst of gevoelig karakter van de productie schriftelijk vast. Portfolioafspraken zetten vertrouwelijkheid niet opzij."
      }
    ]
  },
  {
    "id": "p2--12-annulering-verplaatsing-en-overmacht",
    "part": "p2",
    "title": "12. Annulering, verplaatsing en overmacht",
    "blocks": [
      {
        "t": "p",
        "text": "Onze regeling Annuleren & terugbetaling is van toepassing. Het wettelijke herroepingsrecht van consumenten gaat voor."
      },
      {
        "t": "p",
        "text": "Als omstandigheden buiten de redelijke invloed van een partij de uitvoering verhinderen, meldt die partij dit direct, beperkt zij de gevolgen waar redelijkerwijs mogelijk en bespreekt zij alternatieven. Voorbeelden zijn extreem weer, overheidsbeperkingen of ernstige vervoersproblemen. Een beroep op “overmacht” neemt wettelijke rechten niet automatisch weg."
      },
      {
        "t": "p",
        "text": "Kan uitvoering niet binnen een redelijke termijn plaatsvinden, dan mag iedere partij het getroffen deel van de overeenkomst beëindigen voor zover de wet dat toestaat. Betalingen voor niet-geleverde diensten worden terugbetaald, behoudens bedragen die rechtmatig verschuldigd zijn voor al uitgevoerd werk of op een andere wettelijke grond. Een tegoedbon is vrijwillig en vervangt niet verplicht een verschuldigde terugbetaling."
      }
    ]
  },
  {
    "id": "p2--13-verantwoordelijkheid-en-aansprakelijk",
    "part": "p2",
    "title": "13. Verantwoordelijkheid en aansprakelijkheid",
    "blocks": [
      {
        "t": "p",
        "text": "Wij zijn verantwoordelijk voor een zorgvuldige en vakkundige uitvoering van onze diensten. Geen van beide partijen is aansprakelijk voor schade voor zover deze is veroorzaakt door handelen of nalaten van de andere partij zelf."
      },
      {
        "t": "p",
        "text": "Uitsluitend voor zakelijke opdrachtgevers geldt, voor zover rechtmatig en redelijk, dat de totale aansprakelijkheid van PDC uit een project beperkt is tot de overeengekomen totale projectprijs. Aansprakelijkheid voor indirecte of gevolgschade in de zakelijke sfeer, zoals winstderving, is uitgesloten. Een andere individueel overeengekomen limiet moet in de projectovereenkomst worden vastgelegd."
      },
      {
        "t": "p",
        "text": "Deze zakelijke beperkingen gelden niet bij fraude, opzet, bewuste roekeloosheid van de bedrijfsleiding van PDC, overlijden of lichamelijk letsel door nalatigheid, of aansprakelijkheid die niet rechtsgeldig kan worden beperkt. Dwingendrechtelijke aanspraken op grond van gegevensbeschermingswetgeving blijven onaangetast."
      },
      {
        "t": "p",
        "text": "Voor consumenten gelden de toepasselijke wettelijke regels, zonder de bovenstaande zakelijke aansprakelijkheidslimiet. Een bepaling over bestandsverlies of technische problemen ontslaat PDC niet van verantwoordelijkheid voor een eigen tekortkoming."
      },
      {
        "t": "p",
        "text": "Bij zakelijke opdrachten werken beide partijen mee aan de behandeling van aanspraken van derden die zijn veroorzaakt door materiaal of instructies die een partij zonder toereikende bevoegdheid heeft aangeleverd. Een eventuele vergoeding moet aansluiten bij de daadwerkelijke verantwoordelijkheid en redelijke schade. Geen van beide partijen neemt de verantwoordelijkheid over voor zelfstandige onrechtmatige gedragingen van de ander."
      }
    ]
  },
  {
    "id": "p2--14-beeindiging-wegens-tekortkoming",
    "part": "p2",
    "title": "14. Beëindiging wegens tekortkoming",
    "blocks": [
      {
        "t": "p",
        "text": "Komt een partij wezenlijk tekort in de overeenkomst, dan kan de andere partij dit schriftelijk melden met een omschrijving van de tekortkoming en een redelijke termijn om deze te herstellen, tenzij de wet direct optreden toestaat."
      },
      {
        "t": "p",
        "text": "Opschorting of beëindiging moet evenredig zijn en in overeenstemming met het toepasselijke recht. We maken een afrekening van uitgevoerd werk, ontvangen betalingen, bruikbare resultaten en eventuele terugbetalingen. Een betalingsgeschil over een andere opdracht beëindigt niet automatisch de al verkregen rechten op een volledig betaald project."
      }
    ]
  },
  {
    "id": "p2--15-toepasselijk-recht-en-geschillen",
    "part": "p2",
    "title": "15. Toepasselijk recht en geschillen",
    "blocks": [
      {
        "t": "p",
        "text": "Nederlands recht is van toepassing, met behoud van dwingendrechtelijke bescherming die een consument toekomt op grond van het recht dat op die consument van toepassing is."
      },
      {
        "t": "p",
        "text": "Neem bij een geschil eerst contact met ons op, zodat we een oplossing kunnen proberen te vinden. Mediation is vrijwillig, tenzij rechtsgeldig anders is afgesproken."
      },
      {
        "t": "p",
        "text": "Zakelijke geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement van de statutaire of geregistreerde vestigingsplaats van PDC, tenzij dwingend recht anders bepaalt. Consumenten behouden hun wettelijke rechten ten aanzien van de bevoegde rechter."
      },
      {
        "t": "p",
        "text": "Is een bepaling niet afdwingbaar, dan blijven de overige voorwaarden waar mogelijk gelden. We vervangen een ongeldige bepaling niet door een formulering die dezelfde onrechtmatige beperking opnieuw invoert."
      }
    ]
  },
  {
    "id": "p3--jouw-productie-het-afgesproken-gebruik-o",
    "part": "p3",
    "title": "Jouw productie. Het afgesproken gebruik. Onze creatieve rechten.",
    "blocks": [
      {
        "t": "p",
        "text": "We willen dat je jouw PDC-productie met vertrouwen kunt gebruiken. De licentie bij je boeking legt vast wie het definitieve werk mag gebruiken, waar het mag verschijnen en welke rechten zijn inbegrepen."
      }
    ]
  },
  {
    "id": "p3--1-auteursrecht-en-eigendom",
    "part": "p3",
    "title": "1. Auteursrecht en eigendom",
    "blocks": [
      {
        "t": "p",
        "text": "Het auteursrecht op alle foto’s, films en ander werk dat PDC maakt, ligt bij PDC. Dat blijft zo, ook nadat je hebt betaald. Je krijgt van ons een licentie: toestemming om het werk op de afgesproken manier te gebruiken. PDC beschikt over de rechten die nodig zijn om de overeenkomst na te komen."
      },
      {
        "t": "p",
        "text": "Materiaal van de opdrachtgever en onderdelen van derden blijven eigendom van de betreffende rechthebbenden. Een licentie op de eindproductie geeft geen eigendom van ieder afzonderlijk onderdeel."
      },
      {
        "t": "p",
        "text": "Een overdracht van het auteursrecht, een exclusieve licentie of afkoop van rechten kan alleen met een afzonderlijke schriftelijke overeenkomst die door PDC is ondertekend. Daarin staan de rechten, de werken, het gebied, de duur en de vergoeding. Persoonlijkheidsrechten van de maker blijven onderworpen aan de wettelijke regels."
      }
    ]
  },
  {
    "id": "p3--2-portretten-artikel-19-auteurswet",
    "part": "p3",
    "title": "2. Portretten (artikel 19 Auteurswet)",
    "blocks": [
      {
        "t": "p",
        "text": "Volgens artikel 19 van de Auteurswet mag iemand die een portret van zichzelf heeft laten maken, dat portret in sommige gevallen zelf kopiëren of in een krant of tijdschrift laten plaatsen. Die regel geldt alleen als niets anders is afgesproken."
      },
      {
        "t": "p",
        "text": "Wij spreken iets anders af. Voor portretten en ander werk waarop jij of anderen herkenbaar staan, geldt uitsluitend de licentie uit je boeking. **Gebruik buiten die licentie, ook kopiëren of publiceren op grond van artikel 19 Auteurswet, mag alleen als we dat vooraf duidelijk hebben afgesproken. Die afspraak staat op papier of in een e-mail en is door jou en door PDC bevestigd.**"
      },
      {
        "t": "p",
        "text": "Alles wat de licentie wel toestaat, zoals persoonlijke afdrukken en delen op je eigen socialmedia-accounts, blijft gewoon mogelijk."
      }
    ],
    "changed": true
  },
  {
    "id": "p3--3-wanneer-de-licentie-ingaat",
    "part": "p3",
    "title": "3. Wanneer de licentie ingaat",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij uitdrukkelijk anders afgesproken, gaat je licentie in zodra de verschuldigde vergoeding voor de betreffende resultaten volledig is betaald en de definitieve bestanden zijn vrijgegeven. Tot dat moment mag je het werk niet publiceren of gebruiken."
      },
      {
        "t": "p",
        "text": "Previews, proefbestanden met watermerk en werkversies zijn uitsluitend bedoeld voor besloten beoordeling. Je mag deze niet zonder schriftelijke toestemming publiceren, verspreiden of voor reclame gebruiken."
      },
      {
        "t": "p",
        "text": "Een eenmaal verkregen licentie kan PDC niet willekeurig intrekken. Gebruik je het werk buiten de licentie, dan mogen we daartegen optreden. Waar dat redelijk is, geven we je eerst de gelegenheid om het op te lossen."
      }
    ]
  },
  {
    "id": "p3--4-licentie-voor-particulier-gebruik",
    "part": "p3",
    "title": "4. Licentie voor particulier gebruik",
    "blocks": [
      {
        "t": "p",
        "text": "Bij particuliere opdrachten geeft de standaardlicentie de genoemde opdrachtgever het recht om definitieve bestanden te downloaden, op te slaan en te tonen, persoonlijke afdrukken te maken, het werk privé met familie en vrienden te delen en het te plaatsen op persoonlijke, niet-commerciële socialmedia-accounts."
      },
      {
        "t": "p",
        "text": "Deze licentie geldt wereldwijd, is niet-exclusief en geldt voor onbepaalde tijd, tenzij uitdrukkelijk een andere looptijd is afgesproken. De licentie is persoonlijk: je mag haar niet overdragen of aan anderen doorgeven zonder schriftelijke toestemming van PDC. Verkoop als stockmateriaal, commerciële reclame, doorverkoop van bestanden en het verlenen van licenties aan bedrijven zijn niet inbegrepen."
      },
      {
        "t": "p",
        "text": "Een locatie, leverancier, influencer of publicatie die beelden uit een particuliere opdracht commercieel wil gebruiken, moet daarvoor zelf toestemming van PDC krijgen. Je particuliere boeking geeft die organisaties niet automatisch gebruiksrechten."
      }
    ]
  },
  {
    "id": "p3--5-licentie-voor-zakelijk-gebruik",
    "part": "p3",
    "title": "5. Licentie voor zakelijk gebruik",
    "blocks": [
      {
        "t": "p",
        "text": "Bij zakelijke opdrachten geeft de standaardlicentie de genoemde opdrachtgever het recht om de definitieve bestanden te gebruiken op de eigen website, eigen organische socialmedia-accounts, in e-mailcommunicatie, interne presentaties en eigen gedrukte brochures of informatiemateriaal."
      },
      {
        "t": "p",
        "text": "De standaardlicentie geldt wereldwijd, is niet-exclusief en geldt voor onbepaalde tijd, met inachtneming van duidelijk vermelde beperkingen voor afzonderlijke onderdelen. Een wereldwijde licentie verruimt niet de daadwerkelijke rechten op materiaal van derden. De licentie geldt alleen voor de genoemde opdrachtgever. Overdragen of doorgeven aan een ander bedrijf, ook binnen een groep of bij verkoop van de onderneming, mag alleen met schriftelijke toestemming van PDC."
      },
      {
        "t": "p",
        "text": "Betaalde socialmedia-advertenties, gebooste berichten, televisie- of andere uitzendingen, bioscoopvertoning als reclame, buitenreclame, betaalde plaatsingen, verpakkingen, merchandise, stockdistributie, doorverkoop en gebruik door andere merken moeten uitdrukkelijk in de offerte of in een latere schriftelijke licentie zijn opgenomen."
      },
      {
        "t": "p",
        "text": "Bureaus en dienstverleners mogen bestanden uitsluitend verwerken om namens de opdrachtgever binnen de licentie te publiceren. Zonder toestemming mogen zij het werk niet gebruiken voor zichzelf, hun eigen portfolio of andere klanten."
      }
    ]
  },
  {
    "id": "p3--6-wat-in-de-projectlicentie-hoort-te-sta",
    "part": "p3",
    "title": "6. Wat in de projectlicentie hoort te staan",
    "blocks": [
      {
        "t": "p",
        "text": "De offerte vermeldt de licentiehouder, de definitieve bestanden, het toegestane doel, de kanalen, het gebied, de duur, eventuele exclusiviteit, toegestane aanpassingen, verplichte naamsvermelding en relevante beperkingen van derden."
      },
      {
        "t": "p",
        "text": "Een tijdelijke campagnelicentie vermeldt wanneer betaalde verspreiding moet stoppen en of bestaande organische berichten daarna online mogen blijven. Het later wijzigen van onze standaardtarieven geeft op zichzelf geen recht op een aanvullende gebruiksvergoeding met terugwerkende kracht."
      }
    ]
  },
  {
    "id": "p3--7-bewerking-en-aanpassingen",
    "part": "p3",
    "title": "7. Bewerking en aanpassingen",
    "blocks": [
      {
        "t": "p",
        "text": "Je mag bestanden verkleinen, comprimeren en proportioneel bijsnijden voor toegestane kanalen, zolang het werk daardoor niet wezenlijk verkeerd wordt weergegeven en verplichte naamsvermeldingen behouden blijven. Technische verwerking door een platform is toegestaan."
      },
      {
        "t": "p",
        "text": "Vraag vooraf schriftelijk akkoord voor filters, wezenlijke kleurwijzigingen, vervanging van audio, een nieuwe montage, aanvullende commerciële versies of andere inhoudelijke bewerkingen, tenzij deze al onder de overeenkomst vallen. We beoordelen praktische verzoeken voor toegankelijkheid en formaten op redelijke wijze."
      },
      {
        "t": "p",
        "text": "Je mag het werk niet presenteren als je eigen creatie, eigendomsvermeldingen verwijderen of het misleidend of onrechtmatig gebruiken. Ook mag je geen goedkeuring of aanbeveling suggereren waarvoor geen toestemming is gegeven."
      }
    ]
  },
  {
    "id": "p3--8-ruwe-bestanden-en-productiemateriaal",
    "part": "p3",
    "title": "8. Ruwe bestanden en productiemateriaal",
    "blocks": [
      {
        "t": "p",
        "text": "Camera-originelen, RAW-foto’s, niet-geselecteerde opnamen, ruwe audio, montagetijdlijnen, projectbestanden, werkdocumenten, productiesjablonen en andere bronmaterialen zijn niet inbegrepen, tenzij ze afzonderlijk zijn gespecificeerd."
      },
      {
        "t": "p",
        "text": "Het kopen van ruwe of bewerkbare bestanden draagt op zichzelf geen auteursrecht over. Een afzonderlijke overeenkomst moet de staat van de bestanden, softwarecompatibiliteit, onderdelen van derden, opslag, het voorgenomen gebruik en de verantwoordelijkheid voor latere bewerkingen regelen."
      },
      {
        "t": "p",
        "text": "Niet-gebruikte projectspecifieke concepten blijven beschermd voor zover de wet bescherming biedt. PDC claimt geen exclusief eigendom van algemene ideeën, methoden of stijlen die niet juridisch beschermd kunnen worden."
      }
    ]
  },
  {
    "id": "p3--9-muziek-lettertypen-stock-en-andere-gel",
    "part": "p3",
    "title": "9. Muziek, lettertypen, stock en andere gelicentieerde onderdelen",
    "blocks": [
      {
        "t": "p",
        "text": "Voor muziek, lettertypen, stockbeelden, grafische elementen, rechten van performers en andere onderdelen kunnen afzonderlijke licentievoorwaarden gelden. We maken belangrijke beperkingen voor het beoogde gebruik duidelijk voordat je de productie goedkeurt."
      },
      {
        "t": "p",
        "text": "Een muzieknummer dat op een socialmediaplatform beschikbaar is, is niet automatisch vrijgegeven voor merkadvertenties, andere platforms of onbeperkt commercieel gebruik. We beloven geen rechten waarover we niet beschikken."
      },
      {
        "t": "p",
        "text": "Bij een licentie met einddatum vermeldt de overeenkomst de mogelijkheden voor verlenging of vervanging en de bijbehorende kosten. PDC blijft verantwoordelijk voor beperkingen die niet zijn gemeld of rechten die niet zijn geregeld terwijl PDC dat wel had toegezegd."
      }
    ]
  },
  {
    "id": "p3--10-ai-en-synthetisch-gebruik",
    "part": "p3",
    "title": "10. AI en synthetisch gebruik",
    "blocks": [
      {
        "t": "p",
        "text": "De standaardlicentie omvat geen gebruik van PDC-werk voor het trainen, verfijnen of evalueren van AI-modellen, het aanleggen van datasets, het klonen van stemmen of gelijkenissen, het maken van deepfakes of het genereren van nieuwe synthetische versies voor commerciële exploitatie."
      },
      {
        "t": "p",
        "text": "Voor dergelijk gebruik zijn een afzonderlijke schriftelijke overeenkomst en alle noodzakelijke toestemmingen van betrokken personen en rechthebbenden nodig. Deze beperking verhindert geen normale compressie, indexering door zoekmachines of toegankelijkheidsverwerking die nodig is voor gebruik dat verder binnen de licentie valt."
      },
      {
        "t": "p",
        "text": "PDC gebruikt herkenbaar klantmateriaal niet voor het trainen van AI-modellen en uploadt vertrouwelijk beeldmateriaal niet voor eigen doeleinden naar een generatieve dienst zonder geldige grondslag, passende waarborgen en eventuele vereiste toestemming."
      },
      {
        "t": "p",
        "text": "Voorgenomen generatieve wijzigingen die invloed hebben op identiteit, gesproken tekst, feitelijke betekenis of wezenlijke authenticiteit worden vooraf gemeld en afgesproken."
      }
    ]
  },
  {
    "id": "p3--11-naamsvermelding",
    "part": "p3",
    "title": "11. Naamsvermelding",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij de projectovereenkomst naamsvermelding verplicht stelt, waarderen we een vermelding, maar is die niet verplicht. Voorgestelde vermelding: Fotografie/film: PhotoDeCaffeine | PDC Productions."
      },
      {
        "t": "p",
        "text": "Verwijder geen aanwezige auteursrechtvermelding en vermeld het makerschap niet onjuist. Bij een commerciële licentie kan publicatie zonder naamsvermelding worden afgesproken."
      }
    ]
  },
  {
    "id": "p3--12-portfoliogebruik-en-privacy",
    "part": "p3",
    "title": "12. Portfoliogebruik en privacy",
    "blocks": [
      {
        "t": "p",
        "text": "Auteursrecht geeft niet automatisch toestemming om herkenbare personen te publiceren. Ook privacy, portretrecht, vertrouwelijkheid en eventuele toestemmingsverklaringen moeten worden gerespecteerd."
      },
      {
        "t": "p",
        "text": "Voor herkenbare publicatie van particuliere opdrachten in ons portfolio is afzonderlijke, specifieke toestemming nodig voor de beoogde kanalen. Die vragen we met een apart formulier dat niet vooraf is ingevuld. Weigeren heeft geen invloed op de kwaliteit van onze dienstverlening of de afgesproken prijs."
      },
      {
        "t": "p",
        "text": "Bij zakelijke producties spreken we gebruik als casestudy of portfolio afzonderlijk met de opdrachtgever af en regelen we de vereiste toestemmingen van deelnemers. Een opdrachtgever kan niet zonder bevoegdheid afstand doen van de rechten van een ander."
      },
      {
        "t": "p",
        "text": "Berust publicatie op toestemming, dan kan die voor toekomstig gebruik worden ingetrokken. We stoppen het betreffende gebruik en verwijderen materiaal uit kanalen die wij beheren voor zover dit verplicht is. Intrekking maakt eerder rechtmatig gebruik niet onrechtmatig. We leggen eventuele beperkte praktische of juridische belemmeringen uit."
      }
    ],
    "changed": true
  },
  {
    "id": "p3--13-gebruik-buiten-de-licentie-en-ongeoor",
    "part": "p3",
    "title": "13. Gebruik buiten de licentie en ongeoorloofd gebruik",
    "blocks": [
      {
        "t": "p",
        "text": "Denk je dat PDC-werk zonder toestemming wordt gebruikt? Neem contact op via contact@photodecaffeine.com en stuur de betreffende link, het bestand en relevante informatie mee."
      },
      {
        "t": "p",
        "text": "Gebruikt een zakelijke opdrachtgever het werk buiten de licentie, dan is die een vergoeding verschuldigd van twee keer het licentietarief dat PDC voor dat gebruik zou rekenen. Ontbreekt daarbij een verplichte naamsvermelding, dan komt daar 100% van dat tarief bij. Is de werkelijke schade hoger, dan kan PDC die vergoed vragen."
      },
      {
        "t": "p",
        "text": "Bij consumenten en anderen die het werk zonder toestemming gebruiken, vragen we vergoeding van de schade. Daarbij gaan we uit van het licentietarief dat voor dat gebruik zou gelden. Daarnaast kunnen we vragen het gebruik te stoppen of te corrigeren en de wettelijk toegestane kosten in rekening brengen."
      },
      {
        "t": "p",
        "text": "We beoordelen iedere situatie zorgvuldig en zoeken waar mogelijk eerst samen een oplossing, bijvoorbeeld een correctie, verwijdering of een alsnog afgesloten licentie."
      }
    ],
    "changed": true
  },
  {
    "id": "p4--als-plannen-veranderen",
    "part": "p4",
    "title": "Als plannen veranderen",
    "blocks": [
      {
        "t": "p",
        "text": "Laat het zo snel mogelijk weten als je een boeking wilt wijzigen of annuleren. Mail naar contact@photodecaffeine.com met je naam, projectnummer en gewenste wijziging. We bevestigen de ontvangst en leggen uit wat de financiële gevolgen zijn."
      }
    ],
    "changed": true
  },
  {
    "id": "p4--1-wettelijk-herroepingsrecht-voor-consum",
    "part": "p4",
    "title": "1. Wettelijk herroepingsrecht voor consumenten",
    "blocks": [
      {
        "t": "p",
        "text": "Consumenten die een daarvoor in aanmerking komende dienstenovereenkomst online, telefonisch of buiten onze bedrijfsruimte sluiten, hebben normaal gesproken 14 dagen na het sluiten van de overeenkomst om zonder opgave van reden te herroepen."
      },
      {
        "t": "p",
        "text": "Herroepen kan met een ondubbelzinnige verklaring, bijvoorbeeld per e-mail of met het onderstaande formulier. Je kunt ook onze online herroepingsfunctie gebruiken: www.photodecaffeine.com/herroepen. Het gebruik van ons formulier is niet verplicht."
      },
      {
        "t": "p",
        "text": "Bedragen waarop je recht hebt, betalen we uiterlijk 14 dagen na ontvangst van je herroepingsverklaring terug via hetzelfde betaalmiddel, tenzij anders afgesproken. We rekenen geen kosten voor deze terugbetaling."
      },
      {
        "t": "p",
        "text": "Vraag je uitdrukkelijk om tijdens de bedenktijd met de dienstverlening te beginnen en herroep je daarna, dan kan alleen een evenredige vergoeding voor daadwerkelijk geleverde diensten verschuldigd zijn als aan de wettelijke voorwaarden is voldaan en de vereiste informatie vooraf is verstrekt."
      },
      {
        "t": "p",
        "text": "Bij volledig uitgevoerde diensten vervalt het herroepingsrecht alleen als aan de toepasselijke voorwaarden is voldaan. Daaronder vallen je voorafgaande uitdrukkelijke verzoek of toestemming om tijdens de bedenktijd te beginnen en je erkenning dat het herroepingsrecht na volledige uitvoering vervalt."
      },
      {
        "t": "p",
        "text": "Voor directe levering van betaalde digitale inhoud zonder fysieke drager gelden afzonderlijke wettelijke eisen. Daaronder vallen voorafgaande uitdrukkelijke toestemming voor de levering, erkenning dat het herroepingsrecht bij aanvang van de levering vervalt en de vereiste bevestiging."
      },
      {
        "t": "p",
        "text": "We nemen niet aan dat een persoonlijke productie of een boeking op een specifieke datum automatisch het herroepingsrecht uitsluit. Een eventuele wettelijke uitzondering moet voor de daadwerkelijke overeenkomst worden beoordeeld en vóór boeking worden uitgelegd."
      },
      {
        "t": "p",
        "text": "Deze wettelijke rechten gaan voor op gewone annuleringskosten. Voor zakelijke boekingen geldt normaal gesproken geen herroepingsrecht voor consumenten."
      }
    ],
    "changed": true
  },
  {
    "id": "p4--2-annuleren-buiten-het-wettelijke-herroe",
    "part": "p4",
    "title": "2. Annuleren buiten het wettelijke herroepingsrecht",
    "blocks": [
      {
        "t": "p",
        "text": "Annuleert een consument een dienstenovereenkomst buiten het wettelijke herroepingsrecht, dan brengen we uitsluitend het bedrag in rekening dat rechtmatig verschuldigd is. Afhankelijk van de omstandigheden kan dit bestaan uit een redelijke vergoeding voor uitgevoerd werk, onvermijdelijke verplichtingen en eventuele verdere redelijke vergoeding die de wet toestaat. Daarbij houden we rekening met bespaarde kosten, de reden van annulering en vervangende opdrachten."
      },
      {
        "t": "p",
        "text": "Bij zakelijke boekingen kan PDC uitgevoerd werk, goedgekeurde niet-annuleerbare verplichtingen en redelijke, aantoonbare nettoverliezen door gereserveerde capaciteit in rekening brengen als die capaciteit redelijkerwijs niet opnieuw kon worden geboekt. We nemen redelijke maatregelen om dat verlies te beperken."
      },
      {
        "t": "p",
        "text": "We brengen dezelfde schade niet dubbel in rekening. Het bedrag is niet hoger dan de overeengekomen projectprijs, exclusief afzonderlijk goedgekeurd meerwerk. Voorschotten worden verrekend met het verschuldigde bedrag. Het restant wordt terugbetaald."
      },
      {
        "t": "p",
        "text": "Deze kosten worden niet toegepast alsof je vrijwillig van de opdracht afziet wanneer je een wettelijk recht uitoefent wegens een tekortkoming van PDC."
      }
    ]
  },
  {
    "id": "p4--3-verplaatsen",
    "part": "p4",
    "title": "3. Verplaatsen",
    "blocks": [
      {
        "t": "p",
        "text": "We proberen een nieuwe datum mogelijk te maken. Beschikbaarheid is niet gegarandeerd."
      },
      {
        "t": "p",
        "text": "Een nieuwe datum kan gevolgen hebben voor verplichtingen aan derden, reiskosten of de beschikbaarheid van crew. We leggen eventuele prijswijzigingen uit en vragen akkoord voordat we de verplaatsing bevestigen. Eerder betaalde bedragen worden verrekend met de aangepaste overeenkomst, na verwerking van correct overeengekomen en rechtmatige kosten."
      },
      {
        "t": "p",
        "text": "Kunnen we geen geschikte nieuwe datum afspreken, dan gelden de annuleringsregels en eventuele wettelijke aanspraken."
      }
    ]
  },
  {
    "id": "p4--4-weer-ziekte-en-verstoring",
    "part": "p4",
    "title": "4. Weer, ziekte en verstoring",
    "blocks": [
      {
        "t": "p",
        "text": "Maken omstandigheden de productie onveilig of wezenlijk onuitvoerbaar, dan bespreken we een andere locatie, een aangepaste planning of verplaatsing."
      },
      {
        "t": "p",
        "text": "Kan PDC niet leveren, dan bieden we waar mogelijk een geschikt alternatief. Je hoeft niet akkoord te gaan met een wezenlijke wijziging van een essentieel onderdeel van de overeenkomst. Een terugbetaling, schadevergoeding of andere oplossing wordt bepaald door de overeenkomst en het toepasselijke recht."
      }
    ]
  },
  {
    "id": "p4--5-fysieke-producten-en-digitale-bestande",
    "part": "p4",
    "title": "5. Fysieke producten en digitale bestanden",
    "blocks": [
      {
        "t": "p",
        "text": "Voor gepersonaliseerde fysieke producten kan een wettelijke uitzondering op het herroepingsrecht gelden als aan de voorwaarden is voldaan en dit vóór aankoop is meegedeeld. Voor niet-gepersonaliseerde goederen kan een afzonderlijke wettelijke bedenktijd gelden die aansluit op de ontvangst."
      },
      {
        "t": "p",
        "text": "Waar een retourrecht geldt, verstrekt PDC vóór aankoop het vereiste retouradres, de termijn en informatie over retourkosten."
      },
      {
        "t": "p",
        "text": "Een uitzondering op herroeping bij het veranderen van gedachten doet geen afbreuk aan rechten bij beschadigde, gebrekkige of verkeerd geleverde goederen of digitale inhoud."
      }
    ],
    "changed": true
  },
  {
    "id": "p4--optioneel-herroepingsformulier",
    "part": "p4",
    "title": "Optioneel herroepingsformulier",
    "blocks": [
      {
        "t": "p",
        "text": "Aan: PhotoDeCaffeine Productions, Dokter Lemmensstraat 32, 4701 LZ Roosendaal, contact@photodecaffeine.com"
      },
      {
        "t": "p",
        "text": "Ik/Wij deel/delen hierbij mee dat ik/wij onze overeenkomst betreffende de volgende goederen/diensten herroep/herroepen:"
      },
      {
        "t": "p",
        "text": "[omschrijving en boekings- of bestelnummer]"
      },
      {
        "t": "p",
        "text": "Besteld op / ontvangen op: [datum]"
      },
      {
        "t": "p",
        "text": "Naam consument(en): [naam/namen]"
      },
      {
        "t": "p",
        "text": "Adres consument(en): [adres]"
      },
      {
        "t": "p",
        "text": "Datum: [datum]"
      },
      {
        "t": "p",
        "text": "Handtekening(en): [alleen bij indiening op papier]"
      },
      {
        "t": "p",
        "text": "Doorhalen of weglaten wat niet van toepassing is. Je mag ook op een andere duidelijke manier laten weten dat je wilt herroepen."
      }
    ],
    "changed": true
  },
  {
    "id": "p5--1-oplevering",
    "part": "p5",
    "title": "1. Oplevering",
    "blocks": [
      {
        "t": "p",
        "text": "De projectovereenkomst vermeldt de planning en wat je ontvangt, waaronder bestandsformaten, resolutie, filmlengtes en versies."
      },
      {
        "t": "p",
        "text": "We maken onderscheid tussen verwachte opleverdata en essentiële vaste deadlines. Ontstaat vertraging, dan lichten we de oorzaak toe en stellen we een aangepaste planning voor. Je wettelijke rechten, waaronder rechten bij te late levering, blijven gelden."
      },
      {
        "t": "p",
        "text": "Previews voor social media, highlightfilms, volledige films, albums en drukwerk kunnen verschillende opleverdata hebben. Ruwe opnamen en bewerkbare bestanden worden alleen geleverd als dit uitdrukkelijk is afgesproken."
      }
    ]
  },
  {
    "id": "p5--2-selectie-en-afwerking",
    "part": "p5",
    "title": "2. Selectie en afwerking",
    "blocks": [
      {
        "t": "p",
        "text": "PDC selecteert materiaal op technische kwaliteit, verhaal en aansluiting op de briefing. Dubbele beelden, testopnamen, onbedoelde opnamen en onbruikbaar materiaal worden normaal gesproken niet geleverd."
      },
      {
        "t": "p",
        "text": "De standaardafwerking omvat de bewerking die in de offerte staat. Uitgebreide veranderingen aan lichaamsvormen, complexe verwijdering van objecten, beeldcombinaties, restauratie of gedetailleerde beautyretouche vereisen een specifieke afspraak."
      },
      {
        "t": "p",
        "text": "We veranderen iemands uiterlijk niet wezenlijk en maken geen misleidende voorstelling als die wijziging buiten de overeengekomen briefing en toestemmingen valt."
      }
    ]
  },
  {
    "id": "p5--3-feedback-en-revisies",
    "part": "p5",
    "title": "3. Feedback en revisies",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij anders afgesproken, zijn bij film-, ontwerp- en websiteresultaten drie gebundelde revisierondes inbegrepen. Een ronde bestaat uit één verzamelde set feedback van de bevoegde contactpersoon van de opdrachtgever."
      },
      {
        "t": "p",
        "text": "Stuur feedback waar mogelijk binnen 10 werkdagen. Laat het weten als je meer tijd nodig hebt. Stilte betekent niet automatisch dat je het werk goedkeurt of afstand doet van een klacht."
      },
      {
        "t": "p",
        "text": "Bij fotografie zijn de in de briefing omschreven selectie en afwerking inbegrepen. Daarop zijn niet automatisch drie revisierondes zoals bij film van toepassing. Een beoordeling van de selectie of aanvullende retouche wordt afzonderlijk vastgelegd."
      },
      {
        "t": "p",
        "text": "Correcties die nodig zijn omdat we niet aan de overeenkomst voldoen, gaan niet ten koste van een betaalde revisieronde. Een nieuw concept, nieuwe opname, nieuw script of wijziging van eerder goedgekeurde keuzes kan een aanvullende offerte vereisen."
      }
    ],
    "changed": true
  },
  {
    "id": "p5--4-goedkeuring-en-vrijgave",
    "part": "p5",
    "title": "4. Goedkeuring en vrijgave",
    "blocks": [
      {
        "t": "p",
        "text": "Met schriftelijke goedkeuring bevestig je de betreffende creatieve fase. Je verliest daarmee geen rechten bij verborgen gebreken of andere afwijkingen van de overeenkomst."
      },
      {
        "t": "p",
        "text": "Beoordelingsversies kunnen een watermerk hebben of op lagere resolutie worden geleverd. Definitieve bestanden worden volgens de afgesproken betalingsregeling vrijgegeven."
      },
      {
        "t": "p",
        "text": "Een platform kan bestanden na het uploaden comprimeren of anders verwerken. We leveren de overeengekomen export en bespreken bekende compatibiliteitseisen vóór oplevering."
      }
    ]
  },
  {
    "id": "p5--5-downloadlinks-en-archivering",
    "part": "p5",
    "title": "5. Downloadlinks en archivering",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij anders afgesproken, blijven downloadlinks voor foto en video een kwartaal (drie maanden) na oplevering beschikbaar. Bij websites is er geen downloadlink: de oplevering is dat de website live staat. Download de bestanden en bewaar zelf een back-up. Het verlopen van een link beëindigt op zichzelf je licentie niet en neemt onze verplichtingen niet weg."
      },
      {
        "t": "p",
        "text": "Met inachtneming van onze Privacyverklaring en eventuele projectafspraken bewaren we ruw productiemateriaal normaal gesproken 90 dagen na definitieve oplevering en definitieve masterbestanden 12 maanden. Daarna kunnen bestanden worden verwijderd. Vraag vóór afloop van die termijnen om langere opslag als je die nodig hebt."
      },
      {
        "t": "p",
        "text": "Archivering is geen onbeperkte opslagdienst. Herstel na de bewaartermijn is afhankelijk van de beschikbaarheid. Eventuele kosten voor een aanvullende opvraag- of herstelservice moeten vooraf worden afgesproken."
      },
      {
        "t": "p",
        "text": "Deze termijnen geven geen toestemming om bestanden te verwijderen die nog nodig zijn om de overeenkomst uit te voeren, een bekend gebrek te behandelen, aan de wet te voldoen of een naar behoren vastgelegde bewaarplicht voor een geschil na te leven."
      }
    ],
    "changed": true
  },
  {
    "id": "p5--6-beveiliging-en-verlies",
    "part": "p5",
    "title": "6. Beveiliging en verlies",
    "blocks": [
      {
        "t": "p",
        "text": "We treffen redelijke maatregelen om productie- en opleverbestanden te beschermen, maar kunnen niet garanderen dat verlies onmogelijk is."
      },
      {
        "t": "p",
        "text": "Gaat materiaal verloren, raakt het beschadigd of wordt het ongeoorloofd gedeeld, dan onderzoeken we dit, informeren we betrokkenen waar passend en nemen we redelijke herstelmaatregelen. Je contractuele en wettelijke rechten blijven gelden. We verplichten je niet tot een ongeschikte nieuwe opname in plaats van een andere oplossing waarop je wettelijk recht hebt."
      }
    ]
  },
  {
    "id": "p6--1-wie-verantwoordelijk-is",
    "part": "p6",
    "title": "1. Wie verantwoordelijk is",
    "blocks": [
      {
        "t": "p",
        "text": "PhotoDeCaffeine Productions, handelend onder de namen PhotoDeCaffeine en PDC Productions, is verantwoordelijk voor de persoonsgegevens die de onderneming voor eigen doeleinden verwerkt."
      },
      {
        "t": "p",
        "text": "Adres: Dokter Lemmensstraat 32, 4701 LZ Roosendaal, Nederland"
      },
      {
        "t": "p",
        "text": "Contact voor privacyvragen: contact@photodecaffeine.com"
      },
      {
        "t": "p",
        "text": "Telefoon: +31 6 36112514"
      },
      {
        "t": "p",
        "text": "KVK: 94948933"
      },
      {
        "t": "p",
        "text": "Bij sommige opdrachten verwerkt PDC gegevens uitsluitend volgens gedocumenteerde instructies van een opdrachtgever. Als PDC daarbij verwerker is, sluiten we een passende verwerkersovereenkomst. Bouwen of beheren we een website voor je, dan verwerken we de gegevens die via jouw website binnenkomen alleen voor jou. De privacyrol hangt af van wat iedere partij daadwerkelijk doet, niet alleen van het etiket in een contract."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--2-welke-gegevens-we-verwerken-en-waarom",
    "part": "p6",
    "title": "2. Welke gegevens we verwerken en waarom",
    "blocks": [
      {
        "t": "p",
        "text": "We ontvangen gegevens rechtstreeks van jou, via een opdrachtgever of bevoegde vertegenwoordiger, tijdens de productie en via de websitediensten die in ons cookiebeleid staan."
      },
      {
        "t": "table",
        "rows": [
          [
            "Activiteit",
            "Betrokken gegevens",
            "Doel en grondslag"
          ],
          [
            "Aanvragen en offertes",
            "Naam, contactgegevens, voorgenomen project en correspondentie",
            "Beantwoorden van je aanvraag en stappen zetten op jouw verzoek vóór een overeenkomst; waar passend een gerechtvaardigd belang bij het beantwoorden van algemene zakelijke vragen"
          ],
          [
            "Boekingen en productie",
            "Contactgegevens, planningen, aflevergegevens en noodzakelijke projectinstructies",
            "Uitvoering van een overeenkomst met jou; voor andere deelnemers een afzonderlijk beoordeelde grondslag, zoals toestemming of een gerechtvaardigd belang"
          ],
          [
            "Fotografie en opnamen",
            "Beeld, stem, optreden en relevante context",
            "Maken en opleveren van de afgesproken productie op een grondslag die past bij de betrokken persoon en omstandigheden"
          ],
          [
            "Facturatie en administratie",
            "Factuurgegevens, betalingskenmerken en betaalstatus",
            "Uitvoering van de overeenkomst en wettelijke administratieverplichtingen"
          ],
          [
            "Publicatie en portfolio",
            "Geselecteerde beelden, opnamen, goedgekeurde projectbeschrijvingen en namen",
            "De specifieke toestemming en wettelijke grondslag die voor die publicatie zijn toegelicht"
          ],
          [
            "Beveiliging en geschillen",
            "Beperkte toegangslogs, correspondentie en bewijs dat relevant is voor een kwestie",
            "Gerechtvaardigde belangen bij beveiliging, voorkomen van misbruik en het instellen, uitoefenen of onderbouwen van rechtsvorderingen"
          ],
          [
            "Klantportaal en galerij",
            "Inloggegevens, berichten, projecten, facturen en de foto’s van je opdracht",
            "Uitvoering van de overeenkomst"
          ],
          [
            "Groepsgalerij",
            "Naam, e-mailadres, bezoeken, hartjes en downloads van gasten",
            "Gerechtvaardigd belang: bijhouden wie de foto’s bekijkt. Vraag je om een mail bij nieuwe foto’s, dan gebruiken we je e-mailadres ook daarvoor. In elke mail staat een link om je af te melden. Niet voor reclame"
          ],
          [
            "Toestemming voor foto’s van kinderen",
            "Naam en eventueel rugnummer van het kind, de keuze, naam en e-mailadres van de ouder, en bij een beperking een foto of beschrijving om het kind te herkennen",
            "Toestemming van de ouder of voogd, en gerechtvaardigd belang bij het naleven van die keuze"
          ],
          [
            "Toestemming voor portfolio",
            "Naam, e-mailadres, de gekozen plaatsen en wat we hebben afgesproken over je naam",
            "Jouw toestemming, per werk"
          ],
          [
            "Bezoekersstatistieken",
            "Zonder toestemming: geopende pagina, de link of site waar je vandaan kwam en het soort apparaat, zonder nummer en zonder IP-adres. Met toestemming ook: een willekeurig bezoekersnummer in je browser, hoe ver je scrolt, waar je klikt, welke formulieren je begint, je schermgrootte, taal en tijdzone. Stuur je dan een aanvraag, dan koppelen we die aan je bezoek",
            "Zonder toestemming: gerechtvaardigd belang, met geringe gevolgen voor je privacy. De rest alleen met jouw toestemming, die je altijd kunt intrekken"
          ]
        ]
      },
      {
        "t": "p",
        "text": "We sturen geen nieuwsbrief of reclame per e-mail. Verandert dat, dan vragen we eerst je toestemming of gebruiken we de wettelijke uitzondering voor bestaande klanten."
      },
      {
        "t": "p",
        "text": "Bij een beroep op gerechtvaardigde belangen wegen we de gevolgen voor de rechten van betrokkenen af en treffen we passende waarborgen. Je mag bezwaar maken tegen deze verwerking."
      },
      {
        "t": "p",
        "text": "De uitvoering van een overeenkomst wordt niet automatisch gebruikt als grondslag voor iedere gast, medewerker of omstander alleen omdat iemand anders de productie heeft geboekt."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--3-gevoelige-gegevens-en-kinderen",
    "part": "p6",
    "title": "3. Gevoelige gegevens en kinderen",
    "blocks": [
      {
        "t": "p",
        "text": "We vragen om geen gevoelige informatie te verstrekken tenzij dat noodzakelijk is. Opnamen kunnen onbedoeld gevoelige informatie tonen. Voordat we bijzondere persoonsgegevens verwerken, beoordelen we of extra bescherming of een specifieke wettelijke uitzondering nodig is."
      },
      {
        "t": "p",
        "text": "We gebruiken gewone portretfotografie binnen onze standaarddienstverlening niet om mensen via gezichtsherkenning te identificeren of biometrische identificatiesjablonen te maken."
      },
      {
        "t": "p",
        "text": "Bij een shoot met kinderen vragen we ouders per kind om toestemming, via een formulier. Mag een kind niet of beperkt in beeld, dan vragen we ook een foto of beschrijving, zodat we het kind kunnen herkennen. Alleen de studio ziet die foto, en we verwijderen hem zodra de foto’s zijn geleverd. Een ouder kan de keuze altijd wijzigen of intrekken via de link in de bevestigingsmail. In de galerij kan een ouder aanwijzen op welke foto’s het eigen kind staat. Dat zien alleen die ouder en de studio. Foto’s van kinderen zetten we niet op onze website zonder aparte toestemming. Bij projecten met kinderen zorgen we voor informatie die past bij hun leeftijd en voor de toestemmingen die de wet vereist. Bij promotionele publicatie op basis van toestemming stellen we vast wie die rechtsgeldig kan geven en houden we waar passend rekening met de eigen wensen van het kind."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--4-wie-gegevens-ontvangt",
    "part": "p6",
    "title": "4. Wie gegevens ontvangt",
    "blocks": [
      {
        "t": "p",
        "text": "Alleen personen die de gegevens voor het genoemde doel nodig hebben, krijgen toegang. Ontvangers kunnen zijn: de opdrachtgever en bevoegde productiemedewerkers; aanbieders van hosting, e-mail en cloudopslag; montage- en opleverleveranciers; betaal- en administratiepartijen; professionele adviseurs; en instanties wanneer verstrekking wettelijk verplicht is."
      },
      {
        "t": "p",
        "text": "Dit zijn de belangrijkste dienstverleners die we nu gebruiken:"
      },
      {
        "t": "table",
        "rows": [
          [
            "Aanbieder",
            "Waarvoor",
            "Rol",
            "Waar"
          ],
          [
            "Vercel",
            "Hosting van de website",
            "Verwerker",
            "Wereldwijd netwerk, bedrijf uit de VS"
          ],
          [
            "Supabase",
            "Database, opslag van foto’s en inloggen",
            "Verwerker",
            "Servers in Parijs, bedrijf uit de VS"
          ],
          [
            "Resend",
            "E-mail versturen vanaf de site en het portaal",
            "Verwerker",
            "Bedrijf uit de VS"
          ],
          [
            "Strato",
            "De mailbox contact@photodecaffeine.com",
            "Verwerker",
            "Duitsland"
          ],
          [
            "Adobe",
            "Lettertypen op sommige portfoliopagina’s",
            "Verwerker",
            "Bedrijf uit de VS"
          ],
          [
            "Notion",
            "Interne planning en projectnotities",
            "Verwerker",
            "Bedrijf uit de VS"
          ],
          [
            "Anthropic",
            "De AI-assistent Claude, bij het bouwen van de site en bij administratief werk",
            "Verwerker",
            "Bedrijf uit de VS"
          ],
          [
            "Google",
            "De reviews van ons Google-bedrijfsprofiel",
            "Zelfstandig verantwoordelijk",
            "Bedrijf uit de VS"
          ],
          [
            "Revolut Bank",
            "Onze zakelijke rekening en betalingen",
            "Zelfstandig verantwoordelijk",
            "Litouwen"
          ]
        ]
      },
      {
        "t": "p",
        "text": "Met verwerkers maken we passende afspraken. Zelfstandige verwerkingsverantwoordelijken, zoals een betaalprovider die onder eigen wettelijke verplichtingen handelt, hebben eigen verantwoordelijkheden en privacyinformatie."
      },
      {
        "t": "p",
        "text": "We verkopen geen persoonsgegevens aan datahandelaren. Publicatie op socialmediaplatforms of in openbare galerijen vindt alleen plaats voor een specifiek, rechtmatig doel. Openbare berichten kunnen door anderen worden gekopieerd of gedeeld."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--5-doorgifte-buiten-de-eer",
    "part": "p6",
    "title": "5. Doorgifte buiten de EER",
    "blocks": [
      {
        "t": "p",
        "text": "Een deel van onze dienstverleners komt uit de Verenigde Staten: Vercel, Supabase, Resend, Adobe, Notion, Anthropic en Google. Daardoor kunnen gegevens daar terechtkomen of van daaruit worden bekeken. Onze database en de foto’s van klanten staan wel in de EU, in Parijs."
      },
      {
        "t": "p",
        "text": "Bij doorgifte buiten de EER gebruiken we een geldig juridisch mechanisme, zoals een toepasselijk adequaatheidsbesluit of passende contractuele waarborgen met noodzakelijke aanvullende maatregelen. Via ons privacycontact kun je informatie vragen over die waarborgen en over het verkrijgen van een kopie."
      },
      {
        "t": "p",
        "text": "We nemen niet aan dat een opslaglocatie binnen de EU alle internationale toegang uitsluit."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--6-hoelang-we-gegevens-bewaren",
    "part": "p6",
    "title": "6. Hoelang we gegevens bewaren",
    "blocks": [
      {
        "t": "p",
        "text": "Hieronder staat ons normale bewaarschema. Een projectafspraak, rechtsgeldig verwijderverzoek, wettelijke verplichting of gedocumenteerd geschil kan een andere termijn noodzakelijk maken. We bewaren alleen wat voor het betreffende doel nodig is."
      },
      {
        "t": "table",
        "rows": [
          [
            "Categorie",
            "Normale bewaartermijn"
          ],
          [
            "Aanvragen die geen boeking worden",
            "12 maanden na het laatste inhoudelijke contact"
          ],
          [
            "Ruw productiemateriaal",
            "90 dagen na definitieve oplevering, tenzij een langere termijn nodig is voor de opdracht of een gedocumenteerde rechtmatige reden"
          ],
          [
            "Definitieve masterbestanden",
            "12 maanden na definitieve oplevering, tenzij langere archivering is afgesproken"
          ],
          [
            "Downloadlinks voor oplevering",
            "Foto en video: een kwartaal na oplevering, tenzij anders afgesproken. Websites: geen downloadlink"
          ],
          [
            "Overeenkomsten, essentiële boekingscorrespondentie en rechtenregistratie",
            "Normaal 5 jaar na het einde van de overeenkomst, met beoordeling van toepasselijke verjaringstermijnen en doorlopende licenties"
          ],
          [
            "Fiscale basisadministratie en factuurgegevens",
            "7 jaar, of een andere termijn die voor de betreffende gegevens wettelijk vereist is"
          ],
          [
            "Portfoliopublicaties en toestemmingsregistratie",
            "Publicatie tot het einde van de afgesproken periode of het vervallen van de grondslag; evenredig bewijs van toestemming zolang dat nodig is om lopend gebruik te verantwoorden of claims te behandelen"
          ],
          [
            "Bezoekersstatistieken",
            "14 maanden"
          ],
          [
            "Gasten van een groepsgalerij",
            "12 maanden na hun laatste bezoek, of eerder als de studio de gast verwijdert"
          ],
          [
            "Foto om een kind te herkennen",
            "Tot de foto’s van die shoot zijn geleverd"
          ],
          [
            "Logboek van de admin",
            "12 maanden. Technische logs van onze dienstverleners worden meestal binnen enkele dagen gewist"
          ]
        ]
      },
      {
        "t": "p",
        "text": "Een auteursrechtlicentie kan blijven bestaan nadat PDC de archiefkopie heeft verwijderd. Het behouden van auteursrecht rechtvaardigt op zichzelf niet het onbeperkt bewaren van herkenbare opnamen."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--7-beveiliging",
    "part": "p6",
    "title": "7. Beveiliging",
    "blocks": [
      {
        "t": "p",
        "text": "We treffen maatregelen die passen bij de informatie en het risico, waaronder toegang alleen na inloggen met rechten per medewerker, versleutelde verbindingen (https), foto’s van klanten in afgeschermde opslag met tijdelijke links, en een controle van nieuwe wachtwoorden op bekende datalekken."
      },
      {
        "t": "p",
        "text": "Geen systeem biedt absolute veiligheid. Bij een datalek beoordelen we de situatie en nemen we de wettelijk vereiste meldings- en herstelmaatregelen."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--8-jouw-rechten",
    "part": "p6",
    "title": "8. Jouw rechten",
    "blocks": [
      {
        "t": "p",
        "text": "Afhankelijk van de grondslag en omstandigheden kun je verzoeken om inzage, correctie, verwijdering, beperking of overdracht van je gegevens. Je kunt bezwaar maken tegen verwerking op basis van gerechtvaardigde belangen en tegen direct marketing."
      },
      {
        "t": "p",
        "text": "Waar verwerking op toestemming berust, kun je die toestemming altijd intrekken. Dit maakt de verwerking van vóór de intrekking niet alsnog onrechtmatig."
      },
      {
        "t": "p",
        "text": "Stuur je verzoek naar contact@photodecaffeine.com. We mogen evenredige informatie vragen om je identiteit te controleren, maar vragen niet standaard om een volledige kopie van je identiteitsbewijs."
      },
      {
        "t": "p",
        "text": "We reageren normaal gesproken binnen één maand. Is een wettelijke verlenging nodig, dan laten we dit binnen die maand weten en leggen we uit waarom. Een rechtmatige afwijzing of beperking lichten we toe, inclusief de mogelijkheden om daartegen op te komen."
      },
      {
        "t": "p",
        "text": "Je kunt een klacht indienen bij de Nederlandse Autoriteit Persoonsgegevens via https://www.autoriteitpersoonsgegevens.nl/ of bij de bevoegde toezichthouder in het land waar je woont of werkt. Je mag eerst contact met ons opnemen, maar dat is niet verplicht."
      }
    ],
    "changed": true
  },
  {
    "id": "p6--9-verplichte-gegevens-en-geautomatiseerd",
    "part": "p6",
    "title": "9. Verplichte gegevens en geautomatiseerde besluitvorming",
    "blocks": [
      {
        "t": "p",
        "text": "Sommige boekings-, factuur- en aflevergegevens zijn nodig om de overeenkomst te sluiten of uit te voeren of aan de wet te voldoen. We leggen uit welke gegevens verplicht zijn en wat het gevolg is als je ze niet verstrekt. Vrijwillige toestemming voor marketing of portfoliogebruik is geen voorwaarde om te boeken."
      },
      {
        "t": "p",
        "text": "Binnen onze standaardproductiediensten nemen we geen uitsluitend geautomatiseerde besluiten die rechtsgevolgen hebben of je op vergelijkbare wijze wezenlijk treffen."
      }
    ]
  },
  {
    "id": "p6--10-wijzigingen",
    "part": "p6",
    "title": "10. Wijzigingen",
    "blocks": [
      {
        "t": "p",
        "text": "We passen deze verklaring aan als onze werkwijze of wettelijke verplichtingen veranderen. De ingangsdatum staat bovenaan. Waar nodig informeren we betrokkenen rechtstreeks of vragen we nieuwe toestemming voordat nieuw gebruik begint."
      }
    ]
  },
  {
    "id": "p7--1-wat-cookies-doen",
    "part": "p7",
    "title": "1. Wat cookies doen",
    "blocks": [
      {
        "t": "p",
        "text": "Cookies en vergelijkbare technieken slaan informatie op je apparaat op of lezen die uit. Ze kunnen de website laten functioneren, voorkeuren onthouden, bezoek meten of advertenties ondersteunen."
      },
      {
        "t": "p",
        "text": "Hieronder beschrijven we de technieken die daadwerkelijk worden gebruikt. Waar toestemming nodig is, vragen we die voordat we de betreffende techniek activeren. Op 2 november 2026 hebben we de website hierop gecontroleerd. We plaatsen geen cookies van derden en geen advertentiepixels, en we gebruiken geen Google Analytics."
      }
    ],
    "changed": true
  },
  {
    "id": "p7--2-categorieen",
    "part": "p7",
    "title": "2. Categorieën",
    "blocks": [
      {
        "t": "p",
        "text": "**Noodzakelijke technieken:** Ondersteunen functies zoals beveiliging, formulieren en het onthouden van cookievoorkeuren. Voor zover zij onder de wettelijke uitzondering vallen, is geen toestemming nodig."
      },
      {
        "t": "p",
        "text": "**Beperkte telling (geen toestemming nodig):** We tellen welke pagina’s worden geopend, via welke link of site je binnenkwam en op wat voor soort apparaat. Daarvoor slaan we niets op je apparaat op en bewaren we geen IP-adres of bezoekersnummer."
      },
      {
        "t": "p",
        "text": "**Analyse (alleen met toestemming, staat standaard uit):** Een willekeurig nummer in je browser herkent een tweede bezoek. We zien dan ook hoe ver je scrolt, waar je klikt en welke formulieren je begint, en we koppelen een aanvraag aan je bezoek. Deze gegevens staan in onze eigen database en gaan niet naar andere bedrijven om te gebruiken."
      },
      {
        "t": "p",
        "text": "**Marketing:** gebruiken we niet."
      }
    ],
    "changed": true
  },
  {
    "id": "p7--3-gebruikte-technieken",
    "part": "p7",
    "title": "3. Gebruikte technieken",
    "blocks": [
      {
        "t": "table",
        "rows": [
          [
            "Aanbieder en techniek",
            "Namen van cookies of opslag",
            "Doel en categorie",
            "Betrokken informatie",
            "Bewaar- of geldigheidsduur",
            "Toegang door derden of internationale doorgifte"
          ],
          [
            "PDC, lokale opslag",
            "pdc-cookie-keuze",
            "Je cookiekeuze onthouden. Noodzakelijk",
            "Je keuze en de datum",
            "12 maanden",
            "Geen"
          ],
          [
            "PDC, lokale opslag",
            "pdc-visit",
            "Een tweede bezoek herkennen. Analyse, alleen met toestemming",
            "Willekeurig nummer, het huidige bezoek en waar je vandaan kwam",
            "Tot je je toestemming intrekt of de opslag wist",
            "Staat bij onze verwerker Supabase, in de EU"
          ],
          [
            "Supabase, lokale opslag",
            "sb-uunwhesmymkwmkgqkmxy-auth-token",
            "Ingelogd blijven in het klantportaal. Noodzakelijk",
            "Je inlogsessie",
            "Tot je uitlogt",
            "Supabase, in de EU"
          ],
          [
            "PDC, lokale opslag",
            "pdc-galerij:<code>",
            "Terugkomen in een groepsgalerij zonder alles opnieuw in te vullen. Noodzakelijk",
            "Je gastsleutel",
            "Tot je de opslag wist",
            "Geen"
          ],
          [
            "PDC, lokale opslag",
            "pdc-lang",
            "Je taalkeuze in het portaal. Noodzakelijk",
            "Nederlands of Engels",
            "Tot je de opslag wist",
            "Geen"
          ],
          [
            "PDC, sessieopslag",
            "pdc-reloaded-at",
            "Herstellen na een update van de site. Noodzakelijk",
            "Een tijdstip",
            "Tot je het tabblad sluit",
            "Geen"
          ],
          [
            "Adobe Fonts",
            "Geen cookies",
            "Lettertype op sommige portfoliopagina’s",
            "Je IP-adres en de pagina gaan naar Adobe om het lettertype op te halen",
            "Bij Adobe",
            "Adobe, bedrijf uit de VS"
          ]
        ]
      },
      {
        "t": "p",
        "text": "De overige lettertypen staan op onze eigen server, dus daarvoor gaat er niets naar Google of een andere aanbieder."
      }
    ],
    "changed": true
  },
  {
    "id": "p7--4-jouw-keuzes",
    "part": "p7",
    "title": "4. Jouw keuzes",
    "blocks": [
      {
        "t": "p",
        "text": "Waar we optionele technieken gebruiken, kun je alles accepteren, optionele technieken weigeren of per categorie kiezen. Optionele categorieën staan standaard uit. Verder browsen betekent geen toestemming."
      },
      {
        "t": "p",
        "text": "Via de knop Cookie-instellingen onderaan elke pagina kun je je keuze aanpassen of toestemming intrekken. Intrekken is even eenvoudig als toestemming geven. Noodzakelijke functies blijven beschikbaar zonder akkoord voor niet-gerelateerde tracking."
      },
      {
        "t": "p",
        "text": "Staat er op een pagina een video van YouTube of Vimeo, dan laadt die pas als je erop klikt. Vooraf zeggen we welke aanbieder dan gegevens ontvangt."
      },
      {
        "t": "p",
        "text": "Je kunt opgeslagen cookies ook via je browser verwijderen. Daarna moet je mogelijk opnieuw je voorkeuren instellen."
      }
    ],
    "changed": true
  },
  {
    "id": "p7--5-meer-informatie",
    "part": "p7",
    "title": "5. Meer informatie",
    "blocks": [
      {
        "t": "p",
        "text": "Onze Privacyverklaring beschrijft de verantwoordelijke onderneming, doelen, grondslagen, ontvangers en jouw rechten. Voor vragen kun je mailen naar contact@photodecaffeine.com."
      }
    ],
    "changed": true
  },
  {
    "id": "p8--samen-naar-een-oplossing",
    "part": "p8",
    "title": "Samen naar een oplossing",
    "blocks": [
      {
        "t": "p",
        "text": "Heb je een klacht over een boeking, productie, oplevering of het gebruik van je werk? Neem contact op via contact@photodecaffeine.com."
      },
      {
        "t": "p",
        "text": "Vermeld je naam, projectnummer, een omschrijving van het probleem en de gewenste oplossing. Voeg waar nuttig het betreffende bestand of een link toe. We bevestigen de ontvangst binnen vijf werkdagen en streven naar een inhoudelijke reactie binnen 14 kalenderdagen. Hebben we meer tijd nodig, dan leggen we uit waarom en geven we aan wanneer je een reactie kunt verwachten."
      },
      {
        "t": "p",
        "text": "Deze reactietermijnen stellen een wettelijk recht of een wettelijke termijn niet uit. Je verliest geen wettelijke rechten omdat je niet binnen een korte interne beoordelingstermijn hebt geklaagd."
      },
      {
        "t": "p",
        "text": "Is je klacht gegrond, dan stellen we een passende oplossing voor volgens de overeenkomst en het toepasselijke recht. Voor privacyverzoeken gelden de termijnen uit onze Privacyverklaring."
      },
      {
        "t": "p",
        "text": "**Onderneming:** PhotoDeCaffeine Productions"
      },
      {
        "t": "p",
        "text": "**Handelsnamen:** PhotoDeCaffeine / PDC Productions"
      },
      {
        "t": "p",
        "text": "**Adres:** Dokter Lemmensstraat 32, 4701 LZ Roosendaal"
      },
      {
        "t": "p",
        "text": "**E-mail:** contact@photodecaffeine.com"
      },
      {
        "t": "p",
        "text": "**Telefoon:** +31 6 36112514"
      },
      {
        "t": "p",
        "text": "**KVK:** 94948933"
      },
      {
        "t": "p",
        "text": "**Btw-id:** NL823807071B01"
      },
      {
        "t": "p",
        "text": "**Geschillenregeling:** PDC is niet aangesloten bij een geschillencommissie. Komen we er samen niet uit, dan kun je naar de bevoegde rechter."
      }
    ],
    "changed": true
  },
  {
    "id": "p9--gebruik-van-deze-website",
    "part": "p9",
    "title": "Gebruik van deze website",
    "blocks": [
      {
        "t": "p",
        "text": "Op deze website presenteren we de diensten en het creatieve werk van PDC. Een aanvraag via de website vormt op zichzelf geen productieboeking. Projectverplichtingen ontstaan via het boekingsproces uit onze Algemene voorwaarden."
      },
      {
        "t": "p",
        "text": "We besteden redelijke zorg aan de informatie op de website. Zie je een fout, neem dan contact op via contact@photodecaffeine.com. Deze vermelding sluit verantwoordelijkheid voor misleidende informatie niet uit en beperkt geen rechten uit een overeenkomst."
      },
      {
        "t": "p",
        "text": "Tenzij anders vermeld, zijn teksten, foto’s, films, grafische elementen en branding op de website eigendom van PDC of door PDC in licentie gebruikt. Je mag de website bekijken, ernaar linken en openbare links delen. Voor het downloaden, reproduceren of opnieuw publiceren van creatieve bestanden voor andere doeleinden is toestemming nodig, tenzij de wet dat gebruik toestaat."
      },
      {
        "t": "p",
        "text": "Omzeil geen toegangsbeveiliging, verzamel geen beelden uit afgeschermde galerijen via scraping, verwijder geen watermerken en verstoor de website niet. Wettelijke uitzonderingen en rechten blijven gelden."
      },
      {
        "t": "p",
        "text": "Externe links verwijzen naar diensten van anderen. Voor die diensten gelden hun eigen voorwaarden en privacyinformatie."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--wat-hier-staat",
    "part": "p10",
    "title": "Wat hier staat",
    "blocks": [
      {
        "t": "p",
        "text": "Bouwen we een website voor je, dan gelden naast de Algemene voorwaarden de afspraken op deze pagina. De prijsopgave noemt wat we precies maken, wat het kost en of je de website huurt of koopt. Wat in de prijsopgave staat, gaat voor."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--1-huren-of-kopen",
    "part": "p10",
    "title": "1. Huren of kopen",
    "blocks": [
      {
        "t": "p",
        "text": "**Huren:** je betaalt de bouw eenmalig en daarna een bedrag per maand. Wij houden de website veilig, snel en up-to-date. Ontwerp en broncode blijven van PDC zolang je huurt. Wil je de website later toch kopen, dan kan dat voor de afkoopprijs uit de prijsopgave."
      },
      {
        "t": "p",
        "text": "**Kopen:** na de laatste betaling krijg je de broncode, het ontwerp en alle accounts op je naam. Je mag de website dan onbeperkt gebruiken, aanpassen en laten aanpassen. Onderdelen van anderen, zoals lettertypen, plug-ins of stockfoto’s, blijven onder hun eigen licentie vallen."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--2-wat-van-jou-blijft",
    "part": "p10",
    "title": "2. Wat altijd van jou blijft",
    "blocks": [
      {
        "t": "p",
        "text": "Je domeinnaam, je teksten, het materiaal dat je zelf aanlevert en de gegevens van de mensen die via je website contact opnemen. Die krijg je altijd mee. Foto’s en video’s die PDC voor je maakt, vallen onder de regeling Gebruiksrechten."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--3-hosting-en-domein",
    "part": "p10",
    "title": "3. Hosting en domein",
    "blocks": [
      {
        "t": "p",
        "text": "De prijsopgave zegt wie hosting en domein betaalt. Belasten wij die door, dan doen we dat zonder opslag. Accounts zetten we waar dat kan op jouw naam."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--4-onderhoud",
    "part": "p10",
    "title": "4. Onderhoud",
    "blocks": [
      {
        "t": "p",
        "text": "Onderhoud bestaat uit wat in de prijsopgave staat, meestal updates, beveiliging en een kleine wijziging per maand. Een kleine wijziging is iets in de vormgeving of de volgorde, zoals een blok verplaatsen of een knop toevoegen. Een nieuwe pagina, een nieuwe functie of een nieuw ontwerp valt er niet onder. Dat prijzen we vooraf apart."
      },
      {
        "t": "p",
        "text": "Onderhoud is per maand opzegbaar, tenzij de prijsopgave iets anders zegt. Stop je met huren en koop je de website niet, dan gaat hij offline aan het einde van de laatste betaalde maand."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--5-ontwerp-feedback-en-oplevering",
    "part": "p10",
    "title": "5. Ontwerp, feedback en oplevering",
    "blocks": [
      {
        "t": "p",
        "text": "Tenzij anders afgesproken, zijn drie revisierondes inbegrepen, na goedkeuring van het eerste ontwerp. Stuur je feedback graag binnen 10 werkdagen. Stilte betekent niet dat je het werk goedkeurt."
      },
      {
        "t": "p",
        "text": "Bij websites is er geen downloadlink: de oplevering is dat de website live staat. Je zorgt zelf dat je het recht hebt om de teksten, logo’s en andere bestanden te gebruiken die je aanlevert."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--6-nazorg-en-meerwerk",
    "part": "p10",
    "title": "6. Nazorg en meerwerk",
    "blocks": [
      {
        "t": "p",
        "text": "Werkt iets na de oplevering niet zoals afgesproken, dan herstellen we dat zonder kosten. De prijsopgave noemt hoe lang we daarnaast gratis helpen met vragen. Voor meerwerk vragen we eerst je akkoord, tegen het uurtarief uit de prijsopgave."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--7-bereikbaarheid",
    "part": "p10",
    "title": "7. Bereikbaarheid",
    "blocks": [
      {
        "t": "p",
        "text": "We doen ons best om je website bereikbaar en veilig te houden. Een website kan soms even niet werken, bijvoorbeeld door een storing bij een hostingbedrijf. We beloven daarom geen 100% bereikbaarheid. Je wettelijke rechten blijven gelden."
      }
    ],
    "changed": true
  },
  {
    "id": "p10--8-persoonsgegevens-op-je-website",
    "part": "p10",
    "title": "8. Persoonsgegevens op je website",
    "blocks": [
      {
        "t": "p",
        "text": "Komen er via je website persoonsgegevens binnen, bijvoorbeeld via een contactformulier, dan ben jij daarvoor verantwoordelijk en verwerkt PDC ze alleen voor jou. We sluiten daarvoor een verwerkersovereenkomst. Je zorgt zelf voor de privacyverklaring en de cookietekst op je website. We helpen je daarbij als dat is afgesproken."
      }
    ],
    "changed": true
  }
];
