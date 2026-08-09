import { Helmet } from "react-helmet-async";
import { WorkProcess } from "../components/WorkProcess";
import { Portfolio } from "../components/Portfolio";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { SocialProof } from "../components/SocialProof";
import { Contact } from "../components/Contact";
import { Hero } from "../components/Hero";
import { CustomCTA } from "../components/CustomCTA";
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const Divider = () => (
  <div
    style={{
      width: "100%",
      height: "1px",
      backgroundColor: "rgba(255,251,224,0.04)",
    }}
  />
);

type Sections = {
  workProcess: boolean;
  portfolio: boolean;
  about: boolean;
  services: boolean;
  socialProof: boolean;
  customCTA: boolean;
};

const DEFAULT_SECTIONS: Sections = {
  workProcess: true,
  portfolio: true,
  about: true,
  services: true,
  socialProof: true,
  customCTA: true,
};

export function Home() {
  const [sections, setSections] = useState<Sections>(DEFAULT_SECTIONS);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.state]);

  useEffect(() => {
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/settings`,
      { cache: "no-store", headers: { Authorization: `Bearer ${publicAnonKey}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.sections) {
          setSections({ ...DEFAULT_SECTIONS, ...data.settings.sections });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ backgroundColor: "#080401", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <Helmet>
        <title>Automotive Fotografie & Social Media Beheer | PhotoDeCaffeine</title>
        <meta name="description" content="Automotive fotografie, videografie en social media beheer door heel Nederland. Voor auto's, motoren en de mensen erachter — zakelijk en particulier. Vraag een offerte aan." />
        <link rel="canonical" href="https://www.photodecaffeine.com/" />
        <meta property="og:title" content="Automotive Fotografie & Social Media Beheer | PhotoDeCaffeine" />
        <meta property="og:description" content="Automotive fotografie, videografie en social media beheer door heel Nederland. Voor auto's, motoren en de mensen erachter." />
        <meta property="og:url" content="https://www.photodecaffeine.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Automotive Fotografie & Social Media Beheer | PhotoDeCaffeine" />
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
        <h2
          style={{
            color: "rgba(255,251,224,0.55)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.05em",
            lineHeight: 1.9,
            margin: 0,
          }}
        >
          PhotoDeCaffeine is gespecialiseerd in{" "}
          <strong style={{ color: "rgba(255,251,224,0.75)" }}>automotive fotografie en social media beheer</strong>
          . Van auto's en motoren tot de mensen erachter — we fotograferen en filmen voor showrooms,
          autodealers, autobedrijven en privé-eigenaren door heel Nederland. Elke shoot is op maat —
          scherpe beelden die je auto, motor of merk laten opvallen.
        </h2>
      </section>
      <Contact />
    </div>
  );
}
