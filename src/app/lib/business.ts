// The business as search engines read it (schema.org), on the homepage only.
// PhotoDeCaffeine works on location across the Netherlands; Middenstraat 47
// is only a postal address, so the street is left out and there are no
// opening hours — customers can call any time.
export const BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://www.photodecaffeine.com/#bedrijf",
  name: "PhotoDeCaffeine",
  alternateName: ["Photo De Caffeine", "PDC"],
  description: "Fotografie, videografie en websites op maat uit Roosendaal, door heel Nederland. Voor ondernemers, makers en particulieren.",
  slogan: "Gemaakt als koffie, geschoten als cinema.",
  foundingDate: "2026",
  founder: [
    { "@type": "Person", name: "Per van Hassel" },
    { "@type": "Person", name: "Ryan Chantre" },
    { "@type": "Person", name: "Majd Tawashe" },
  ],
  url: "https://www.photodecaffeine.com/",
  logo: "https://www.photodecaffeine.com/icons/icon-512.png",
  image: "https://uunwhesmymkwmkgqkmxy.supabase.co/storage/v1/object/public/portfolio-images-0951c59e/web/1780794457379-bikersoul-041-2560.jpg",
  telephone: "+31636112514",
  email: "contact@photodecaffeine.com",
  address: { "@type": "PostalAddress", addressLocality: "Roosendaal", addressCountry: "NL" },
  areaServed: { "@type": "Country", name: "Nederland" },
  priceRange: "Vanaf €50",
  vatID: "NL823807071B01",
  identifier: { "@type": "PropertyValue", propertyID: "KvK", value: "94948933" },
  knowsAbout: ["Fotografie", "Videografie", "Webdevelopment", "Automotive fotografie", "Social media beheer"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Diensten",
    itemListElement: [
      {
        "@type": "Offer",
        url: "https://www.photodecaffeine.com/services/fotografie",
        itemOffered: { "@type": "Service", name: "Fotografie", description: "Portretten, evenementen, auto's, sport en concerten." },
      },
      {
        "@type": "Offer",
        url: "https://www.photodecaffeine.com/services/videografie",
        itemOffered: { "@type": "Service", name: "Videografie", description: "Korte films, sfeervideo's en content voor social media." },
      },
      {
        "@type": "Offer",
        url: "https://www.photodecaffeine.com/services/website",
        itemOffered: { "@type": "Service", name: "Websites op maat", description: "Websites op maat, gebouwd met eigen beeldmateriaal." },
      },
      {
        "@type": "Offer",
        url: "https://www.photodecaffeine.com/services/automotive",
        priceSpecification: { "@type": "PriceSpecification", minPrice: 50, priceCurrency: "EUR" },
        itemOffered: { "@type": "Service", name: "Automotive fotografie", description: "Fotografie van auto's en motoren voor showrooms, dealers en particuliere eigenaren." },
      },
      {
        "@type": "Offer",
        url: "https://www.photodecaffeine.com/services/social-media",
        itemOffered: { "@type": "Service", name: "Social media beheer", description: "Content en social media beheer voor autobedrijven, dealers en particuliere eigenaren." },
      },
    ],
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+31636112514",
    email: "contact@photodecaffeine.com",
    contactType: "customer service",
    areaServed: "NL",
    availableLanguage: "nl",
  },
  sameAs: [
    "https://www.instagram.com/photodecaffeine",
    "https://www.linkedin.com/company/photodecaffeine/",
    "https://www.tiktok.com/@photodecaffeiene",
  ],
};
