import { useState } from "react";
import { Link } from "react-router";
import { Instagram, Linkedin, X, MapPin, Mail, Phone } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLanguage } from "../context/LanguageContext";
import { PdcLogo } from "./PdcLogo";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
    </svg>
  );
}

type PolicySection = { heading: string; body: string };

type PolicyDoc = {
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
};

const policies: { privacy: PolicyDoc; terms: PolicyDoc; cookie: PolicyDoc } = {
  cookie: {
    title: "Cookiebeleid",
    lastUpdated: "Laatst bijgewerkt: oktober 2026",
    sections: [
      {
        heading: "1. Wat zijn cookies",
        body: "Cookies zijn kleine tekstbestanden die op uw apparaat worden geplaatst wanneer u een website bezoekt. Ze worden gebruikt om websites te laten werken, de prestaties te verbeteren en informatie aan website-eigenaren te verstrekken.",
      },
      {
        heading: "2. Cookies die wij gebruiken",
        body: "Wij gebruiken uitsluitend strikt noodzakelijke cookies. Dit zijn sessiecookies die nodig zijn om u ingelogd te houden in het klantportaal en de beheeromgeving. Wij gebruiken geen advertentie-, analyse- of trackingcookies.",
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
  privacy: {
    title: "Privacybeleid",
    lastUpdated: "Laatst bijgewerkt: oktober 2026",
    sections: [
      {
        heading: "1. Wie zijn wij",
        body: "Photo De Caffeine (PDC) is een visuele contentstudio, ingeschreven in Nederland onder KvK-nummer 94948933. Adres: Middenstraat 47, Roosendaal. Wij zijn verantwoordelijk voor de verwerking van uw persoonsgegevens zoals beschreven in dit beleid.",
      },
      {
        heading: "2. Gegevens die wij verzamelen",
        body: "Wanneer u een contactformulier op onze website invult, verzamelen wij uw naam, e-mailadres, telefoonnummer, bedrijfsnaam en de inhoud van uw bericht. Wij verzamelen geen gevoelige persoonsgegevens en gebruiken geen advertentiecookies.",
      },
      {
        heading: "3. Hoe wij uw gegevens gebruiken",
        body: "Wij gebruiken uw gegevens uitsluitend om uw aanvraag te beantwoorden en, waar nodig, om onze klantrelatie te beheren. Wij verkopen, delen of verhuren uw gegevens niet aan derden.",
      },
      {
        heading: "4. Bewaartermijn",
        body: "Contactaanvragen bewaren wij maximaal 2 jaar na ontvangst. Gegevens van klantprojecten bewaren wij 7 jaar, vanwege de wettelijke bewaarplicht voor de administratie.",
      },
      {
        heading: "5. Uw rechten (AVG)",
        body: "U heeft recht op inzage, correctie en verwijdering van uw persoonsgegevens. Stuur uw verzoek naar contact@photodecaffeine.com. Wij reageren binnen 30 dagen.",
      },
      {
        heading: "6. Beveiliging",
        body: "Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen. Onze systemen gebruiken versleutelde verbindingen en opslag met toegangscontrole.",
      },
      {
        heading: "7. Contact",
        body: "Vragen over dit beleid? Mail naar contact@photodecaffeine.com of schrijf naar Middenstraat 47, Roosendaal.",
      },
    ],
  },
  terms: {
    title: "Algemene voorwaarden",
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
};

function PolicyModal({
  open,
  onClose,
  doc,
}: {
  open: boolean;
  onClose: () => void;
  doc: PolicyDoc;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] max-w-2xl max-h-[80vh] bg-[#fffbe0] text-[#3e250a] flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-start justify-between px-8 pt-8 pb-6 border-b border-[#3e250a]/10">
            <div>
              <Dialog.Title className="text-xl font-bold tracking-tight uppercase">
                {doc.title}
              </Dialog.Title>
              <p className="text-xs text-[#3e250a]/70 mt-1 tracking-wide">{doc.lastUpdated}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Sluiten" className="text-[#3e250a]/60 hover:text-[#3e250a] transition-colors mt-0.5">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto overscroll-contain px-8 py-6 space-y-6">
            {doc.sections.map((section) => (
              <div key={section.heading}>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#3e250a] mb-2">
                  {section.heading}
                </h3>
                <p className="text-sm text-[#3e250a]/70 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);

  const socialLinks = [
    {
      href: "https://www.instagram.com/photodecaffeine",
      label: "Instagram",
      icon: <Instagram size={18} strokeWidth={1.5} />,
    },
    {
      href: "https://www.linkedin.com/company/photodecaffeine/",
      label: "LinkedIn",
      icon: <Linkedin size={18} strokeWidth={1.5} />,
    },
    {
      href: "https://www.tiktok.com/@photodecaffeiene",
      label: "TikTok",
      icon: <TikTokIcon className="w-[18px] h-[18px]" />,
    },
  ];

  const navLinks = [
    { to: "/", label: t.nav.work },
    { to: "/portfolio", label: t.nav.portfolio },
    { to: "/about", label: t.nav.about },
    { to: "/#contact", label: t.nav.contact },
  ];

  return (
    <>
      <footer className="bg-[#3e250a] text-[#fffbe0]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-16 md:py-20">
            {/* Brand column */}
            <div className="md:col-span-5 space-y-5">
              <div>
                <PdcLogo
                  artboard
                  label="Photo De Caffeine"
                  width={160}
                  height={64}
                  style={{ display: "block", color: "#fffbe0" }}
                />
              </div>
              <p className="text-sm text-[#fffbe0]/60 leading-relaxed italic max-w-xs">
                {t.footer.tagline}
              </p>
              <div className="flex items-start gap-2 text-xs text-[#fffbe0]/60 pt-1">
                <MapPin size={12} className="mt-0.5 shrink-0 opacity-60" />
                <span>{t.footer.address}</span>
              </div>
              <a
                href={`mailto:${t.footer.email}`}
                className="flex items-center gap-2 text-xs text-[#fffbe0]/60 hover:text-[#fffbe0] transition-colors duration-200"
              >
                <Mail size={12} className="shrink-0" />
                <span>{t.footer.email}</span>
              </a>
              <a
                href="tel:+31636112514"
                className="flex items-center gap-2 text-xs text-[#fffbe0]/60 hover:text-[#fffbe0] transition-colors duration-200"
              >
                <Phone size={12} className="shrink-0" />
                <span>+31 6 36112514</span>
              </a>
              <Link
                to="/#contact"
                className="inline-block text-xs tracking-widest uppercase border border-[#fffbe0]/20 text-[#fffbe0]/60 hover:text-[#fffbe0] hover:border-[#fffbe0]/50 px-4 py-2 transition-colors duration-200 mt-1"
              >
                {t.footer.bookShoot}
              </Link>
            </div>

            {/* Nav column */}
            <div className="md:col-span-3 space-y-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fffbe0]/60">
                {t.footer.nav}
              </p>
              <nav className="flex flex-col gap-2.5">
                {navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#fffbe0]/60 hover:text-[#fffbe0] transition-colors duration-200"
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  to="/portal/login"
                  className="text-[10px] tracking-[0.2em] uppercase text-[#fffbe0]/60 hover:text-[#fffbe0] transition-colors duration-200 pt-2 border-t border-[#fffbe0]/10 mt-1"
                >
                  {t.footer.clientPortal}
                </Link>
              </nav>
            </div>

            {/* Social column */}
            <div className="md:col-span-4 space-y-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fffbe0]/60">
                {t.footer.followUs}
              </p>
              <div className="flex gap-3">
                {socialLinks.map(({ href, label, icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center border border-[#fffbe0]/15 text-[#fffbe0]/50 hover:text-[#fffbe0] hover:border-[#fffbe0]/40 transition-colors duration-200"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#fffbe0]/10 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-[#fffbe0]/60 tracking-wide">
                KvK {t.footer.kvk} &nbsp;·&nbsp; BTW {t.footer.btw}
              </p>
              <p className="text-[11px] text-[#fffbe0]/60 italic">
                {t.footer.madeIn}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] tracking-[0.18em] uppercase font-normal text-[#fffbe0]/60">
              <button
                onClick={() => setPrivacyOpen(true)}
                className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]"
              >
                {t.footer.privacy}
              </button>
              <span className="opacity-40" aria-hidden="true">·</span>
              <button
                onClick={() => setTermsOpen(true)}
                className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]"
              >
                {t.footer.terms}
              </button>
              <span className="opacity-40" aria-hidden="true">·</span>
              <button
                onClick={() => setCookieOpen(true)}
                className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]"
              >
                {t.footer.cookiePolicy}
              </button>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span>{t.footer.copyright(year)}</span>
            </div>
          </div>
        </div>
      </footer>

      <PolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        doc={policies.privacy}
      />
      <PolicyModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        doc={policies.terms}
      />
      <PolicyModal
        open={cookieOpen}
        onClose={() => setCookieOpen(false)}
        doc={policies.cookie}
      />
    </>
  );
}
