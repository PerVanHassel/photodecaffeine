import { addWorkdays, todayIso, type QuoteDetails, type QuoteLicense, type QuoteLine, type QuoteTerm, type Service } from "../../components/quote/model";

/**
 * Starting points for a new quote. The working agreements are the ones
 * approved so far in the terms (Websitebeleid & Gebruiksrechten v1.1, with
 * Per's notes of 23 October 2026): valid for 10 working days, 40% on booking,
 * 14 days to pay, 3 revision rounds, feedback within 10 working days,
 * downloads for a quarter on photo and video.
 */

export interface QuoteDraft {
  type: "photo" | "web";
  title: string;
  subtitle: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  projectId: string;
  intro: string;
  oneTime: QuoteLine[];
  monthly: QuoteLine[];
  included: string[];
  terms: QuoteTerm[];
  notes: string;
  validUntil: string;
  vatBasis: "incl" | "excl";
  vatRate: number;
  details: QuoteDetails;
}

export type TemplateId = "web" | "photo" | "video" | "blank";

export const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: "web", label: "Website", hint: "Bouw, onderhoud per maand, eigendom" },
  { id: "photo", label: "Fotografie", hint: "Shoot, bewerkte foto's, licentie" },
  { id: "video", label: "Video", hint: "Opname, montage, revisies, licentie" },
  { id: "blank", label: "Leeg", hint: "Alleen de vaste afspraken" },
];

export const DEFAULT_HOURLY = 35;

export const defaultLicense = (holder = ""): QuoteLicense => ({
  holder,
  use: "business",
  channels: ["Eigen website", "Organische social media", "E-mail en nieuwsbrief"],
  territory: "Wereldwijd",
  duration: "Onbeperkt",
  exclusive: false,
  transferable: false,
  edits: "Verkleinen en bijsnijden mag. Filters, andere kleuren of een nieuwe montage alleen na overleg.",
  credit: "Gewaardeerd, niet verplicht",
  rawFiles: "Niet inbegrepen",
  portfolio: "Alleen als je daar apart toestemming voor geeft",
});

const downloads: QuoteTerm = { label: "Bestanden", text: "Je downloadt alles via je eigen galerij. De link blijft drie maanden beschikbaar. Bewaar zelf een back-up." };

function base(services: Service[]): QuoteDetails {
  return {
    audience: "business",
    services,
    excluded: [],
    extraCosts: [],
    clientDelivers: [],
    planning: "",
    payment: { steps: [{ label: "Aanbetaling", percent: 40, moment: "bij akkoord" }, { label: "Restant", percent: 60, moment: "bij oplevering" }], termDays: 14 },
    extraWork: { hourly: DEFAULT_HOURLY, note: "" },
    openPoints: [],
  };
}

export function fromTemplate(id: TemplateId, defaults: { projectId?: string; clientId?: string } = {}): QuoteDraft {
  const common = {
    clientId: defaults.clientId || "", clientName: "", clientEmail: "", projectId: defaults.projectId || "",
    intro: "", notes: "", terms: [] as QuoteTerm[], validUntil: addWorkdays(todayIso(), 10), vatBasis: "excl" as const, vatRate: 21,
  };

  if (id === "web") {
    return {
      ...common,
      type: "web",
      title: "Website",
      subtitle: "Ontwerp, bouw en beheer",
      oneTime: [{ label: "Website: ontwerp en bouw", amount: 0, note: "" }],
      monthly: [{ label: "Onderhoud", amount: 0, note: "Updates, beveiliging, back-ups en een kleine wijziging per maand" }],
      included: [
        "Ontwerp op maat, geen template",
        "Werkt op telefoon, tablet en computer",
        "Beheeromgeving waarin je zelf teksten en pagina's aanpast",
        "Contactformulier dat binnenkomt op je eigen mail",
        "Basis voor Google: titels, sitemap en snelle laadtijd",
        "Beveiligde verbinding (https) en dagelijkse back-ups",
      ],
      details: {
        ...base(["web"]),
        excluded: ["Teksten schrijven", "Foto en video, die krijgen een eigen prijsopgave"],
        extraCosts: ["Hosting en domein komen er per maand bij. Die belasten we door zonder opslag."],
        clientDelivers: ["Teksten", "Logo en huisstijl", "Toegang tot je domein en hosting"],
        planning: "Reken op ongeveer zes weken vanaf je akkoord op het ontwerp, als teksten en logo op tijd binnen zijn.",
        payment: { steps: [{ label: "Aanbetaling", percent: 40, moment: "bij akkoord" }, { label: "Restant", percent: 60, moment: "bij livegang" }], termDays: 14 },
        revisions: { rounds: 3, untilRight: false, feedbackDays: 10 },
        aftercare: { days: 30, note: "" },
        maintenance: {
          covers: ["Updates van de site en het contactformulier", "Beveiliging van de gegevens van mensen die contact opnemen", "Back-ups, zodat er nooit iets kwijtraakt", "Eén kleine wijziging per maand"],
          smallChange: "Iets in de vormgeving of de volgorde aanpassen, bijvoorbeeld een blok verplaatsen, een kleur bijstellen of een knop toevoegen. Teksten pas je zelf aan in je beheeromgeving.",
          excluded: "Een nieuwe pagina, een nieuwe functie of een nieuw ontwerp. Dat prijzen we vooraf apart.",
          cancel: "Per maand opzegbaar. Stop je ermee, dan kun je de site kopen en meenemen. Je teksten en gegevens zijn altijd van jou.",
        },
        ownership: {
          model: "rent",
          buyout: null,
          note: "",
          rows: [
            { what: "Domeinnaam", owner: "Jij, op jouw naam" },
            { what: "Teksten, foto's en artikelen", owner: "Jij. Je krijgt ze altijd mee." },
            { what: "Ontwerp en broncode", owner: "PDC, zolang je huurt. Koop je de site, dan worden ze van jou." },
            { what: "Accounts (hosting, e-mail)", owner: "Op jouw naam waar dat kan. De rest zetten we over als je de site koopt." },
          ],
        },
      },
    };
  }

  if (id === "photo" || id === "video") {
    const video = id === "video";
    return {
      ...common,
      type: "photo",
      title: video ? "Video" : "Fotoshoot",
      subtitle: video ? "Opname en montage" : "Shoot en nabewerking",
      oneTime: video
        ? [
          { label: "Opnamedag", amount: 0, note: "" },
          { label: "Montage", amount: 0, note: "Hoofdvideo van 60 tot 90 seconden" },
          { label: "Korte versie voor social media", qty: 2, unit: "versies", price: 0, amount: 0, note: "", optional: true },
        ]
        : [
          { label: "Fotoshoot", amount: 0, note: "Halve dag op locatie" },
          { label: "Bewerkte foto's", qty: 15, unit: "foto's", price: 0, amount: 0, note: "Selectie, kleur en retouche" },
          { label: "Extra bewerkte foto's", qty: 10, unit: "foto's", price: 0, amount: 0, note: "", optional: true },
        ],
      monthly: [],
      included: video
        ? ["Voorgesprek over wat je nodig hebt", "Opname op locatie", "Montage met muziek waar je de rechten van hebt", "Export voor je website en social media"]
        : ["Voorgesprek over wat je nodig hebt", "Bewerkte foto's in hoge resolutie", "Eigen online galerij om te bekijken en te downloaden"],
      terms: video
        ? [downloads, { label: "Drone", text: "Dronebeelden alleen als de regels, het weer en de plek het toelaten. Wil je dat we op een riskante plek vliegen, dan spreken we vooraf af wie schade aan de apparatuur betaalt." }]
        : [downloads],
      details: {
        ...base([id]),
        excluded: ["Ruwe bestanden (RAW) en niet-geselecteerde opnamen", "Betaalde advertenties, tenzij hierboven genoemd"],
        extraCosts: ["Reiskosten buiten 30 km, alleen na overleg"],
        clientDelivers: ["Een locatie en de toestemming om daar te fotograferen", "Wie er op de foto mag, en wie niet"],
        planning: video ? "Levering binnen drie weken na de opnamedag." : "Levering binnen tien werkdagen na de shoot.",
        payment: { steps: [{ label: "Aanbetaling", percent: 40, moment: "bij boeking" }, { label: "Restant", percent: 60, moment: "voor de levering van de bestanden" }], termDays: 14 },
        revisions: video ? { rounds: 3, untilRight: false, feedbackDays: 10 } : undefined,
        license: defaultLicense(),
      },
    };
  }

  return {
    ...common,
    type: "web",
    title: "",
    subtitle: "",
    oneTime: [{ label: "", amount: 0, note: "" }],
    monthly: [],
    included: [],
    details: { ...base([]), revisions: { rounds: 3, untilRight: false, feedbackDays: 10 } },
  };
}
