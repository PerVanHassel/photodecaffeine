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
      <Hero />
      {sections.workProcess && <><Divider /><WorkProcess /></>}
      {sections.portfolio && <><Divider /><Portfolio /></>}
      {sections.about && <><Divider /><About /></>}
      {sections.services && <><Divider /><Services /></>}
      {sections.socialProof && <><Divider /><SocialProof /></>}
      {sections.customCTA && <><Divider /><CustomCTA /></>}
      <Contact />
    </div>
  );
}
