import { Link } from "react-router";
import { Instagram, Linkedin, MapPin, Mail, Phone } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PdcLogo } from "./PdcLogo";
import { policies } from "../lib/policies";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
    </svg>
  );
}

export function Footer() {
  const { t } = useLanguage();
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
              <Link to={policies.privacy.path} className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]">
                {t.footer.privacy}
              </Link>
              <span className="opacity-40" aria-hidden="true">·</span>
              <Link to={policies.terms.path} className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]">
                {t.footer.terms}
              </Link>
              <span className="opacity-40" aria-hidden="true">·</span>
              <Link to={policies.cookie.path} className="hover:text-[#fffbe0] transition-colors duration-200 text-[9px]">
                {t.footer.cookiePolicy}
              </Link>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span>{t.footer.copyright(year)}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
