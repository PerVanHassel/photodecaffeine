import { Helmet } from "react-helmet-async";
import { WorkProcess } from "../components/WorkProcess";
import { Portfolio } from "../components/Portfolio";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { SocialProof } from "../components/SocialProof";
import { Contact } from "../components/Contact";
import { Hero } from "../components/Hero";
import { CustomCTA } from "../components/CustomCTA";
import { useSiteSettings, type SectionKey } from "../lib/siteData";
import { useLanguage } from "../context/LanguageContext";

const Divider = () => (
  <div
    style={{
      width: "100%",
      height: "1px",
      backgroundColor: "rgba(255,251,224,0.04)",
    }}
  />
);

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  workProcess: true,
  portfolio: true,
  about: true,
  services: true,
  socialProof: true,
  customCTA: true,
};

export function Home() {
  const { t } = useLanguage();
  const sections = { ...DEFAULT_SECTIONS, ...useSiteSettings().data?.sections };

  return (
    <div style={{ backgroundColor: "#080401", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <Helmet>
        <title>Automotive fotografie & social media beheer | PhotoDeCaffeine</title>
        <meta name="description" content="Automotive fotografie, videografie en social media beheer door heel Nederland. Voor auto's, motoren en de mensen erachter — zakelijk en particulier. Vraag een offerte aan." />
        <link rel="canonical" href="https://www.photodecaffeine.com/" />
        <meta property="og:title" content="Automotive fotografie & social media beheer | PhotoDeCaffeine" />
        <meta property="og:description" content="Automotive fotografie, videografie en social media beheer door heel Nederland. Voor auto's, motoren en de mensen erachter." />
        <meta property="og:url" content="https://www.photodecaffeine.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Automotive fotografie & social media beheer | PhotoDeCaffeine" />
        <meta name="twitter:description" content="Automotive fotografie, videografie en social media beheer door heel Nederland." />
      </Helmet>
      <Hero />
      {sections.workProcess && <><Divider /><WorkProcess /></>}
      {sections.portfolio && <><Divider /><Portfolio /></>}
      {sections.about && <><Divider /><About /></>}
      {sections.services && <><Divider /><Services /></>}
      {sections.socialProof && <><Divider /><SocialProof /></>}
      {sections.customCTA && <><Divider /><CustomCTA /></>}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "rgba(255,251,224,0.55)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.05em",
            lineHeight: 1.9,
            margin: 0,
          }}
        >
          {t.home.seoStart}{" "}
          <strong style={{ color: "rgba(255,251,224,0.75)" }}>{t.home.seoStrong}</strong>
          {t.home.seoEnd}
        </p>
      </section>
      <Contact />
    </div>
  );
}
