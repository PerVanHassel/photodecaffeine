import { useState } from "react";
import { Link } from "react-router";
import { Instagram, Linkedin, X, MapPin, Mail, Phone } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLanguage } from "../context/LanguageContext";
import pdcLogo from "@/imports/PDClogo2.0-12-1.png";

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

const policyContent: Record<"en" | "nl", { privacy: PolicyDoc; terms: PolicyDoc; cookie: PolicyDoc }> = {
  en: {
    cookie: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: June 2026",
      sections: [
        {
          heading: "1. What Are Cookies",
          body: "Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work, improve performance, and provide information to site owners.",
        },
        {
          heading: "2. Cookies We Use",
          body: "We use strictly necessary cookies only. These are session cookies required to keep you logged in to the Client Portal and Admin Portal. We do not use advertising, analytics, or tracking cookies.",
        },
        {
          heading: "3. Third-Party Cookies",
          body: "We do not embed third-party scripts (e.g. Google Analytics, Meta Pixel) that set cookies. If this changes, this policy will be updated and a consent banner will be displayed.",
        },
        {
          heading: "4. Managing Cookies",
          body: "You can delete or block cookies at any time via your browser settings. Note that disabling session cookies will prevent you from logging into the Client or Admin Portal.",
        },
        {
          heading: "5. Contact",
          body: "Questions about our use of cookies? Email us at hello@photodecaffeine.com.",
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: June 2026",
      sections: [
        {
          heading: "1. Who We Are",
          body: "Photo De Caffeine (PDC) is a visual content studio registered in the Netherlands. KvK: 94948933. Address: Middenstraat 47, Roosendaal. We are responsible for processing your personal data as described in this policy.",
        },
        {
          heading: "2. Data We Collect",
          body: "When you submit a contact form on our website, we collect your name, email address, company name, and the content of your message. We do not collect sensitive personal data, track you across sites, or use advertising cookies.",
        },
        {
          heading: "3. How We Use Your Data",
          body: "We use your data solely to respond to your inquiry and, where relevant, to manage our client relationship. We do not sell, share, or rent your data to third parties.",
        },
        {
          heading: "4. Data Retention",
          body: "We retain contact inquiries for a maximum of 2 years from receipt. Client project data is retained for 7 years to comply with Dutch accounting regulations.",
        },
        {
          heading: "5. Your Rights (AVG / GDPR)",
          body: "You have the right to access, correct, or delete your personal data. To exercise these rights, email us at hello@photodecaffeine.com. We will respond within 30 days.",
        },
        {
          heading: "6. Security",
          body: "We take reasonable technical and organisational measures to protect your personal data. Our systems use encrypted connections and access-controlled storage.",
        },
        {
          heading: "7. Contact",
          body: "Questions about this policy? Reach us at hello@photodecaffeine.com or Middenstraat 47, Roosendaal, Netherlands.",
        },
      ],
    },
    terms: {
      title: "Terms & Conditions",
      lastUpdated: "Last updated: June 2026",
      sections: [
        {
          heading: "1. Applicability",
          body: "These terms apply to all offers, agreements, and deliveries by Photo De Caffeine (PDC), KvK 94948933, Middenstraat 47, Roosendaal.",
        },
        {
          heading: "2. Quotations & Agreements",
          body: "All quotations are valid for 30 days. An agreement is established upon written confirmation (email) by both parties. Any changes must be confirmed in writing.",
        },
        {
          heading: "3. Payment",
          body: "A 50% deposit is required before the shoot date. The remaining balance is due within 14 days of final file delivery. Overdue invoices accrue statutory interest under Dutch law.",
        },
        {
          heading: "4. Intellectual Property",
          body: "PDC retains full copyright of all images until payment is received in full. Upon full payment, the client receives a non-exclusive usage licence as specified in the quotation. PDC retains the right to use images for portfolio and promotional purposes unless agreed otherwise in writing.",
        },
        {
          heading: "5. Delivery",
          body: "Final files are delivered via a secure download link within the timeframe specified in the project agreement. Standard delivery is within 14 working days after the shoot.",
        },
        {
          heading: "6. Cancellation",
          body: "Cancellations within 7 days of the shoot date forfeit the deposit. Cancellations with more than 14 days notice will receive a full deposit refund.",
        },
        {
          heading: "7. Liability",
          body: "PDC's liability is limited to the invoice value of the relevant project. PDC is not liable for indirect or consequential damages.",
        },
        {
          heading: "8. Governing Law",
          body: "These terms are governed by Dutch law. Disputes shall be submitted to the competent court in Breda, Netherlands.",
        },
      ],
    },
  },
  nl: {
    cookie: {
      title: "Cookiebeleid",
      lastUpdated: "Laatst bijgewerkt: juni 2026",
      sections: [
        {
          heading: "1. Wat zijn cookies",
          body: "Cookies zijn kleine tekstbestanden die op uw apparaat worden geplaatst wanneer u een website bezoekt. Ze worden gebruikt om websites te laten werken, de prestaties te verbeteren en informatie aan site-eigenaren te verstrekken.",
        },
        {
          heading: "2. Cookies die wij gebruiken",
          body: "Wij gebruiken uitsluitend strikt noodzakelijke cookies. Dit zijn sessiecookies die nodig zijn om u ingelogd te houden op het Clientportaal en Adminportaal. Wij maken geen gebruik van advertentie-, analyse- of trackingcookies.",
        },
        {
          heading: "3. Cookies van derden",
          body: "Wij embedden geen scripts van derden (bijv. Google Analytics, Meta Pixel) die cookies plaatsen. Als dit verandert, wordt dit beleid bijgewerkt en wordt er een toestemmingsbanner getoond.",
        },
        {
          heading: "4. Cookies beheren",
          body: "U kunt cookies op elk moment verwijderen of blokkeren via uw browserinstellingen. Let op: het uitschakelen van sessiecookies voorkomt dat u kunt inloggen op het Client- of Adminportaal.",
        },
        {
          heading: "5. Contact",
          body: "Vragen over ons cookiegebruik? Stuur een e-mail naar hello@photodecaffeine.com.",
        },
      ],
    },
    privacy: {
      title: "Privacybeleid",
      lastUpdated: "Laatst bijgewerkt: juni 2026",
      sections: [
        {
          heading: "1. Wie zijn wij",
          body: "Photo De Caffeine (PDC) is een visuele contentstudio geregistreerd in Nederland. KvK: 94948933. Adres: Middenstraat 47, Roosendaal. Wij zijn verantwoordelijk voor de verwerking van uw persoonsgegevens zoals beschreven in dit beleid.",
        },
        {
          heading: "2. Gegevens die wij verzamelen",
          body: "Wanneer u een contactformulier op onze website invult, verzamelen wij uw naam, e-mailadres, bedrijfsnaam en de inhoud van uw bericht. Wij verzamelen geen gevoelige persoonsgegevens en maken geen gebruik van advertentiecookies.",
        },
        {
          heading: "3. Hoe wij uw gegevens gebruiken",
          body: "Wij gebruiken uw gegevens uitsluitend om uw aanvraag te beantwoorden en, waar relevant, om onze klantrelatie te beheren. Wij verkopen, delen of verhuren uw gegevens niet aan derden.",
        },
        {
          heading: "4. Bewaartermijn",
          body: "Contactaanvragen bewaren wij maximaal 2 jaar na ontvangst. Klantprojectgegevens bewaren wij 7 jaar ter naleving van de Nederlandse boekhoudregelgeving.",
        },
        {
          heading: "5. Uw rechten (AVG / GDPR)",
          body: "U heeft het recht op inzage, correctie of verwijdering van uw persoonsgegevens. Stuur uw verzoek naar hello@photodecaffeine.com. Wij reageren binnen 30 dagen.",
        },
        {
          heading: "6. Beveiliging",
          body: "Wij nemen redelijke technische en organisatorische maatregelen om uw persoonsgegevens te beschermen. Onze systemen maken gebruik van versleutelde verbindingen en toegangsgecontroleerde opslag.",
        },
        {
          heading: "7. Contact",
          body: "Vragen over dit beleid? Neem contact op via hello@photodecaffeine.com of Middenstraat 47, Roosendaal, Nederland.",
        },
      ],
    },
    terms: {
      title: "Algemene Voorwaarden",
      lastUpdated: "Laatst bijgewerkt: juni 2026",
      sections: [
        {
          heading: "1. Toepasselijkheid",
          body: "Deze voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en leveringen van Photo De Caffeine (PDC), KvK 94948933, Middenstraat 47, Roosendaal.",
        },
        {
          heading: "2. Offertes & Overeenkomsten",
          body: "Alle offertes zijn 30 dagen geldig. Een overeenkomst komt tot stand na schriftelijke bevestiging (e-mail) door beide partijen. Wijzigingen dienen schriftelijk te worden bevestigd.",
        },
        {
          heading: "3. Betaling",
          body: "Een aanbetaling van 50% is vereist vóór de shootdatum. Het resterende saldo dient binnen 14 dagen na de definitieve bestandslevering te worden voldaan. Achterstallige facturen worden verhoogd met de wettelijke rente.",
        },
        {
          heading: "4. Intellectueel Eigendom",
          body: "PDC behoudt het volledige auteursrecht op alle beelden totdat de volledige betaling is ontvangen. Na volledige betaling ontvangt de opdrachtgever een niet-exclusieve gebruikslicentie zoals gespecificeerd in de offerte. PDC behoudt het recht om beelden te gebruiken voor portfolio- en promotionele doeleinden, tenzij schriftelijk anders overeengekomen.",
        },
        {
          heading: "5. Levering",
          body: "Definitieve bestanden worden geleverd via een beveiligde downloadlink binnen de in de projectovereenkomst gespecificeerde termijn. Standaard levering is binnen 14 werkdagen na de shoot.",
        },
        {
          heading: "6. Annulering",
          body: "Annuleringen binnen 7 dagen voor de shootdatum vervallen de aanbetaling. Bij annulering meer dan 14 dagen van tevoren wordt de aanbetaling volledig terugbetaald.",
        },
        {
          heading: "7. Aansprakelijkheid",
          body: "De aansprakelijkheid van PDC is beperkt tot de factuurwaarde van het betreffende project. PDC is niet aansprakelijk voor indirecte of gevolgschade.",
        },
        {
          heading: "8. Toepasselijk Recht",
          body: "Deze voorwaarden worden beheerst door Nederlands recht. Geschillen worden voorgelegd aan de bevoegde rechter in Breda, Nederland.",
        },
      ],
    },
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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] bg-[#fffbe0] text-[#3e250a] flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-start justify-between px-8 pt-8 pb-6 border-b border-[#3e250a]/10">
            <div>
              <Dialog.Title className="text-xl font-bold tracking-tight uppercase">
                {doc.title}
              </Dialog.Title>
              <p className="text-xs text-[#3e250a]/50 mt-1 tracking-wide">{doc.lastUpdated}</p>
            </div>
            <Dialog.Close asChild>
              <button className="text-[#3e250a]/40 hover:text-[#3e250a] transition-colors mt-0.5">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-8 py-6 space-y-6">
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
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);

  const policy = policyContent[language];

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
                <img
                  src={pdcLogo}
                  alt="Photo De Caffeine"
                  style={{ height: "64px", width: "auto", display: "block", objectFit: "contain" }}
                />
              </div>
              <p className="text-sm text-[#fffbe0]/60 leading-relaxed italic max-w-xs">
                {t.footer.tagline}
              </p>
              <div className="flex items-start gap-2 text-xs text-[#fffbe0]/40 pt-1">
                <MapPin size={12} className="mt-0.5 shrink-0 opacity-60" />
                <span>{t.footer.address}</span>
              </div>
              <a
                href={`mailto:${t.footer.email}`}
                className="flex items-center gap-2 text-xs text-[#fffbe0]/40 hover:text-[#fffbe0]/70 transition-colors duration-200"
              >
                <Mail size={12} className="shrink-0" />
                <span>{t.footer.email}</span>
              </a>
              <a
                href="tel:+31636112514"
                className="flex items-center gap-2 text-xs text-[#fffbe0]/40 hover:text-[#fffbe0]/70 transition-colors duration-200"
              >
                <Phone size={12} className="shrink-0" />
                <span>+31 6 36112514</span>
              </a>
              <Link
                to="/#contact"
                className="inline-block text-xs tracking-widest uppercase border border-[#fffbe0]/20 text-[#fffbe0]/60 hover:text-[#fffbe0] hover:border-[#fffbe0]/50 px-4 py-2 transition-all duration-200 mt-1"
              >
                {t.footer.bookShoot}
              </Link>
            </div>

            {/* Nav column */}
            <div className="md:col-span-3 space-y-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fffbe0]/30">
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
                  className="text-[10px] tracking-[0.2em] uppercase text-[#fffbe0]/30 hover:text-[#fffbe0]/60 transition-colors duration-200 pt-2 border-t border-[#fffbe0]/10 mt-1"
                >
                  {t.footer.clientPortal}
                </Link>
              </nav>
            </div>

            {/* Social column */}
            <div className="md:col-span-4 space-y-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fffbe0]/30">
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
                    className="w-9 h-9 flex items-center justify-center border border-[#fffbe0]/15 text-[#fffbe0]/50 hover:text-[#fffbe0] hover:border-[#fffbe0]/40 transition-all duration-200"
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
              <p className="text-[11px] text-[#fffbe0]/30 tracking-wide">
                KvK {t.footer.kvk} &nbsp;·&nbsp; BTW {t.footer.btw}
              </p>
              <p className="text-[11px] text-[#fffbe0]/20 italic">
                {t.footer.madeIn}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] tracking-[0.18em] uppercase font-normal text-[#fffbe0]/30">
              <button
                onClick={() => setPrivacyOpen(true)}
                className="hover:text-[#fffbe0]/60 transition-colors duration-200 text-[9px]"
              >
                {t.footer.privacy}
              </button>
              <span className="opacity-40">·</span>
              <button
                onClick={() => setTermsOpen(true)}
                className="hover:text-[#fffbe0]/60 transition-colors duration-200 text-[9px]"
              >
                {t.footer.terms}
              </button>
              <span className="opacity-40">·</span>
              <button
                onClick={() => setCookieOpen(true)}
                className="hover:text-[#fffbe0]/60 transition-colors duration-200 text-[9px]"
              >
                {t.footer.cookiePolicy}
              </button>
              <span className="opacity-40">·</span>
              <span>{t.footer.copyright(year)}</span>
            </div>
          </div>
        </div>
      </footer>

      <PolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        doc={policy.privacy}
      />
      <PolicyModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        doc={policy.terms}
      />
      <PolicyModal
        open={cookieOpen}
        onClose={() => setCookieOpen(false)}
        doc={policy.cookie}
      />
    </>
  );
}
