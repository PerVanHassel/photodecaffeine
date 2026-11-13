import { Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { BUSINESS_JSON_LD } from "../lib/business";
import { WorkProcess } from "../components/WorkProcess";
import { Portfolio } from "../components/Portfolio";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { SocialProof } from "../components/SocialProof";
import { Contact } from "../components/Contact";
import { Hero } from "../components/Hero";
import { WhatWeDo } from "../components/WhatWeDo";
import { CustomCTA } from "../components/CustomCTA";
import { MatchCampaignBand } from "../components/MatchCampaignBand";
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
        <title>{t.home.metaTitle}</title>
        <meta name="description" content={t.home.metaDescription} />
        <link rel="canonical" href="https://www.photodecaffeine.com/" />
        <meta property="og:title" content={t.home.metaTitle} />
        <meta property="og:description" content={t.home.shareDescription} />
        <meta property="og:url" content="https://www.photodecaffeine.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.home.metaTitle} />
        <meta name="twitter:description" content={t.home.shortDescription} />
        <script type="application/ld+json">{JSON.stringify(BUSINESS_JSON_LD)}</script>
      </Helmet>
      <Hero />
      <Divider />
      <WhatWeDo />
      <MatchCampaignBand />
      {sections.workProcess && <WorkProcess />}
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
          {t.home.seoLinks.map((link, i, all) => (
            <Fragment key={link.to}>
              {i > 0 ? (i === all.length - 1 ? t.home.seoAnd : ", ") : null}
              <Link to={link.to} className="pdc-seo-link">{link.text}</Link>
            </Fragment>
          ))}
          {t.home.seoEnd}
        </p>
      </section>
      <Contact />
    </div>
  );
}
