import { WorkProcess } from "../components/WorkProcess";
import { Portfolio } from "../components/Portfolio";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { SocialProof } from "../components/SocialProof";
import { Contact } from "../components/Contact";
import { Hero } from "../components/Hero";
import { CustomCTA } from "../components/CustomCTA";

const Divider = () => (
  <div
    style={{
      width: "100%",
      height: "1px",
      backgroundColor: "rgba(255,251,224,0.04)",
    }}
  />
);

export function Home() {
  return (
    <div
      style={{
        backgroundColor: "#080401",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
      }}
    >
      <Hero />
      <Divider />
      <WorkProcess />
      <Divider />
      <Portfolio />
      <Divider />
      <About />
      <Divider />
      <CustomCTA />
      <Divider />
      <Services />
      <Divider />
      <SocialProof />
      <Contact />
    </div>
  );
}
