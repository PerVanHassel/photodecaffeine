import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";

export function SocialProof() {
  const { t } = useLanguage();
  const isMobile = useMobile();
  const testimonials = t.socialProof.testimonials;
  const [activeIndex, setActiveIndex] = useState(0);
  const active = testimonials[activeIndex];

  return (
    null
  );
}