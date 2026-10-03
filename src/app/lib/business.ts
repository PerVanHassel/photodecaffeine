// The business as search engines read it (schema.org), on the homepage only.
// PhotoDeCaffeine works on location across the Netherlands; Middenstraat 47
// is only a postal address, so the street is left out and there are no
// opening hours — customers can call any time.
export const BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://www.photodecaffeine.com/#bedrijf",
  name: "PhotoDeCaffeine",
  alternateName: ["Photo De Caffeine", "PDC Productions"],
  description: "Automotive fotografie, videografie en social media beheer door heel Nederland. Voor auto's, motoren en de mensen erachter.",
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
  knowsAbout: ["Automotive fotografie", "Videografie", "Social media beheer"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Diensten",
    itemListElement: [
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
