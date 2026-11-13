import { Link } from "react-router";
import { Instagram, Linkedin, MapPin, Mail, Phone } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PdcLogo } from "./PdcLogo";
import { LanguageSwitch } from "./LanguageSwitch";
import { openCookieSettings } from "../lib/cookieChoice";
import { localPolicies } from "../lib/policies";
import { GOOGLE_MAPS_URL } from "../lib/google";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
    </svg>
  );
}

export function Footer() {
  const { t, language } = useLanguage();
  const year = new Date().getFullYear();

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
      href: "https://www.tiktok.com/@photodecaffeine",
      label: "TikTok",
      icon: <TikTokIcon className="w-[18px] h-[18px]" />,
    },
    {
      href: GOOGLE_MAPS_URL,
      label: "Google",
      icon: <GoogleIcon className="w-[16px] h-[16px]" />,
    },
  ];

  const navLinks = [
    { to: "/#work", label: t.nav.work },
    { to: "/portfolio", label: t.nav.portfolio },
    { to: "/about", label: t.nav.about },
    { to: "/#contact", label: t.nav.contact },
  ];

  return (
    <>
      <footer className="bg-[#3e250a] text-[#fffbe0]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-12 py-16 md:py-20">
            {/* Brand column */}
            <div className="space-y-5">
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
            <div className="space-y-4">
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

            {/* Services column */}
            <div className="space-y-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fffbe0]/60">
                {t.footer.services}
              </p>
              <nav className="flex flex-col gap-2.5" aria-label={t.footer.services}>
                {t.footer.serviceLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#fffbe0]/60 hover:text-[#fffbe0] transition-colors duration-200"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Social column */}
            <div className="space-y-4">
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
            <div className="flex flex-col gap-1 sm:max-w-[40%]">
              <p className="text-[11px] text-[#fffbe0]/60 tracking-wide">
                {t.footer.kvkLabel} {t.footer.kvk} &nbsp;·&nbsp; {t.footer.btwLabel} {t.footer.btw}
              </p>
              <p className="text-[11px] text-[#fffbe0]/60 italic">
                {t.footer.madeIn}
              </p>
              <p className="text-[11px] text-[#fffbe0]/60">{t.footer.copyright(year)}</p>
            </div>
            <div className="pdc-footer-end">
              <nav aria-label={t.footer.legal} className="pdc-footer-legal">
                {Object.values(localPolicies(language)).map((p) => (
                  <Link key={p.path} to={p.path}>{p.short}</Link>
                ))}
                <Link to="/herroepen">{t.footer.withdraw}</Link>
                <button type="button" onClick={openCookieSettings}>{t.footer.cookieSettings}</button>
              </nav>
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
