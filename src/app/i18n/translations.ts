export type Language = "en" | "nl";

export const translations = {
  en: {
    nav: {
      work: "Work",
      services: "Services",
      contact: "Contact",
      portfolio: "Portfolio",
      about: "About",
      bookShoot: "Book a Shoot",
    },
    hero: {
      label: "Visual Content Studio — Est. 2025",
      headline1: "Where",
      headline2: "Your",
      headline3: "Story",
      headline4: "Begins.",
      tagline: "Crafted like Coffee, Shot Like Cinema.",
      subtagline:
        "Premium visual storytelling for brands that refuse to blend in.",
      viewPortfolio: "View Portfolio",
      bookShoot: "Book a Shoot",
      recentlyShown: "Recently Shown",
      scrollIndicator: "Scroll",
    },
    workProcess: {
      label: "The Process",
      titleLine1: "How We",
      titleLine2: "Work.",
      subtitle:
        "Three deliberate steps. Zero compromise. From the first conversation to the final file.",
      steps: [
        {
          number: "01",
          title: "Discovery",
          subtitle: "Understanding Your Brand",
          description:
            "Every project starts with a deep-dive conversation. We study your brand's visual language, your audience, and the story you're trying to tell — before a single lens cap comes off.",
          detail: "Creative Brief · Moodboard · Site Survey",
        },
        {
          number: "02",
          title: "Production",
          subtitle: "The Shoot Day",
          description:
            "Precision lighting. Intentional composition. Every frame is crafted with the same care as a specialty coffee extraction — controlled, deliberate, and deeply considered.",
          detail: "Studio / Location · Art Direction · Styling",
        },
        {
          number: "03",
          title: "Delivery",
          subtitle: "Polished & Ready",
          description:
            "Color-graded to filmic perfection, retouched with restraint, and delivered in every format your team needs — ready to deploy across digital and print.",
          detail: "Retouching · Color Grade · File Delivery",
        },
      ],
    },
    portfolio: {
      label: "Selected Work",
      titleLine1: "OUR",
      titleLine2: "Portfolio.",
      hoverReveal: "Hover to reveal",
      viewFull: "View Full Portfolio →",
    },
    about: {
      label: "The Founders",
      titleLine1: "Built On",
      titleLine2: "Obsession",
      titleLine3: "& Espresso.",
      body1:
        "PhotoDeCaffeine was born from a simple frustration: most brand photography looked the same. Overlit. Soulless. Forgettable. Three creatives Per, Majd, and Ryan came together with a shared vision: to create visual work that actually means something.",
      body2:
        "Today, PDC works exclusively with brands that have something real to say — from independent roasters to luxury hospitality to consumer goods. Every shoot is built from a cinematic foundation: intentional light, precise composition, and a commitment to images that outlast the trends.",
      pullQuote:
        "\"Crafted like Coffee, Shot Like Cinema — that's not just a tagline. It's how we approach every single frame.\"",
      pullQuoteCite: "— The PDC Founders",
      credentials: [
        {
          label: "Based In",
          value:
            "Roosendaal, The Netherlands & Lisbon, Portugal",
        },
        { label: "Founded", value: "2025" },
        { label: "Speciality", value: "Storytelling" },
        { label: "Availability", value: "Global Travel" },
      ],
      owners: [
        {
          name: "Per van Hassel",
          role: "Co-Founder & Creative Director / Strategy",
        },
        {
          name: "Majd Tawashe",
          role: "Co-Founder & Head Of Office Portugal",
        },
        {
          name: "Ryan Chantre",
          role: "Co-Founder & Creative Lead",
        },
      ],
      learnMore: "Learn More About PDC →",
    },
    services: {
      label: "What We Offer",
      titleLine1: "Services &",
      titleLine2: "Packages.",
      subtitle:
        "Three tiers. Every one built for brands that know quality isn't optional.",
      whatsIncluded: "What's Included",
      notIncluded: "Not Included",
      idealFor: "Ideal For",
      bookPackage: "Book This Package",
      featured: "Most Popular",
      customNote:
        "Need something custom? Every project is different. Let's talk.",
      talkToUs: "Talk to Us →",
      packages: [
        {
          id: "espresso",
          name: "Espresso",
          label: "Single Origin",
          price: "€890",
          per: "per day",
          summary:
            "Focused. Intense. For brands that know what they need.",
          includes: [
            "1 shoot day (up to 6 hrs)",
            "Up to 20 final images",
            "One set / location",
            "Basic prop styling",
            "Colour grade & retouch",
            "Web + print file delivery",
          ],
          notIncluded: [
            "On-set art director",
            "Campaign strategy",
            "Rush delivery",
          ],
          ideal: "Product launches, single campaigns",
        },
        {
          id: "reserve",
          name: "Reserve",
          label: "Studio Signature",
          price: "€2,400",
          per: "per project",
          summary:
            "The full PDC experience — cinematic, art-directed, unforgettable.",
          includes: [
            "2 shoot days",
            "Up to 60 final images",
            "Multiple sets / locations",
            "Full prop & scene styling",
            "Cinematic colour grade",
            "On-set art direction by Per",
            "Campaign strategy session",
            "Web, print & social delivery",
          ],
          notIncluded: [],
          ideal: "Brand campaigns, hospitality, editorial",
        },
        {
          id: "blend",
          name: "Blend",
          label: "Ongoing Retainer",
          price: "€1,200",
          per: "per month",
          summary:
            "Consistent visual identity across every channel, every month.",
          includes: [
            "1 shoot day per month",
            "30 final images monthly",
            "Priority scheduling",
            "Dedicated brand style guide",
            "Same-week turnaround",
            "Unlimited revision rounds",
          ],
          notIncluded: ["On-location travel included"],
          ideal: "Growing brands, content programmes",
        },
      ],
    },
    socialProof: {
      label: "Client Words",
      testimonialsLabel: "Testimonials",
      testimonials: [
        {
          id: 1,
          quote:
            "PDC didn't just shoot our products — they redefined how our brand looks to the world. Every frame carries a weight that our previous photography never had. We've had clients tell us our website looks like a magazine now.",
          name: "Mia Thornton",
          company: "Verlot Goods",
          role: "Founder & Creative Director",
        },
        {
          id: 2,
          quote:
            "Per has an instinct for light that I've rarely encountered. He walked into our roastery, absorbed the space, and three hours later we had images that told our entire story. No briefs. No revisions. Just pure craft.",
          name: "Jonas Kellner",
          company: "Dusk Roasters",
          role: "Head of Brand",
        },
        {
          id: 3,
          quote:
            "Working with PDC is unlike any photographer I've ever hired. It's collaborative, deliberate, and the results are always cinematic in a way that feels authentic — not performed. Worth every single euro.",
          name: "Isabelle Marceau",
          company: "Brûlée House",
          role: "Marketing Director",
        },
      ],
      brands: "Trusted by brands across Europe",
    },
    contact: {
      readyLabel: "Ready to Shoot?",
      readyTitle1: "Let's Create",
      readyTitle2: "Something Worth",
      readyTitle3: "Remembering.",
      formTitle: "Start a Project",
      formSubtitle:
        "Tell us about your brand. We'll respond within 24 hours.",
      namePlaceholder: "Your Name",
      emailPlaceholder: "Your Email",
      phonePlaceholder: "Your Phone",
      brandPlaceholder: "Your Brand / Company",
      messagePlaceholder: "Tell us about your project...",
      packageLabel: "Package Interest",
      packageDefault: "Select a package (optional)",
      sendButton: "Send Message →",
      successTitle: "Message Received.",
      successBody:
        "We'll review your brief and get back to you within one business day. Thank you for considering PDC.",
      infoTitle: "Studio Details",
      location: "Roosendaal, The Netherlands",
      availability: "Available Worldwide",
      responseTime: "Response within 24h",
      followLabel: "Follow the Work",
    },
    footer: {
      tagline: "Crafted like Coffee, Shot Like Cinema.",
      nav: "Navigation",
      followUs: "Follow the Work",
      address: "Middenstraat 47 · Roosendaal",
      email: "contact@photodecaffeine.com",
      bookShoot: "Book a Shoot →",
      clientPortal: "Client Login",
      kvk: "94948933",
      btw: "NL823807071B01",
      privacy: "Privacy Policy",
      terms: "Terms & Conditions",
      cookiePolicy: "Cookie Policy",
      madeIn: "Handmade in Roosendaal.",
      copyright: (year: number) =>
        `© ${year} PhotoDeCaffeine. All rights reserved.`,
    },
    automotivePage: {
      backLabel: "Services",
      sectionLabel: "Services",
      subtitle: "Cinematic imagery that captures the power, precision and personality of every machine.",
      packageLabel: "The package",
      perVehicle: "per vehicle",
      includedLabel: "What's included",
      included: [
        "1 vehicle — car, bike, truck or other",
        "1 hour on location",
        "15 edited high-resolution photos",
        "Delivered within 5 business days",
        "Personal & commercial use license",
      ],
      bookLabel: "Book this package",
      bookTitle: "Leave your details",
      bookSubtitle: "Fill in your name and how we can reach you — we'll get back to you within 24 hours to confirm and plan the shoot.",
      namePlaceholder: "Your name",
      emailLabel: "Email address",
      phoneLabel: "Phone number",
      phonePlaceholder: "+31 6 ...",
      phoneHint: "Email or phone — at least one required",
      submitButton: "Book for €50",
      submitting: "Sending…",
      successTitle: "We've got your details",
      successBody: "We'll contact you within 24 hours to plan the shoot. Talk soon.",
      errorGeneric: "Something went wrong. Please try again or contact us directly.",
      errorContact: "Please provide at least an email address or phone number.",
      customLabel: "Need something more?",
      customTitle: "Custom",
      customTitleDim: "packages",
      customBody: "Multiple vehicles, video, full-day shoots, or something else entirely — reach out and we'll put something together.",
      customButton: "Get in touch",
      readyLabel: "Ready to shoot?",
    },
    portfolioPage: {
      backToHome: "← Back to Home",
      label: "PhotoDeCaffeine",
      titleLine1: "Selected",
      titleLine2: "Work.",
      subtitle:
        "Every frame is intentional. Every client, chosen.\nThis is the work that defines us.",
      showingOf: (shown: number, total: number) =>
        `Showing ${shown} of ${total} projects`,
      bookShoot: "Book a Shoot →",
      noWork: "No work in this category yet.",
      categories: {
        All: "All",
        "Brand Identity": "Brand Identity",
        Product: "Product",
        Editorial: "Editorial",
        Campaign: "Campaign",
        Fashion: "Fashion",
        "F&B": "F&B",
      },
    },
    aboutPage: {
      backToHome: "← Back to Home",
      label: "About PDC",
      titleLine1: "We Don't",
      titleLine2: "Just",
      titleLine3: "Shoot.",
      subtitle:
        "We build visual worlds for brands that demand more than competent photography. This is who we are.",
      studioLabel: "The Studio",
      studioTitle1: "A Studio Built on",
      studioTitle2: "Conviction.",
      studioBody1:
        "Photo De Caffeine began with a simple act of rebellion: refusing to make forgettable photographs. We believe every brand has a visual story worth telling — and most photographers never bother to find it.",
      studioBody2:
        "We work slowly, deeply, and with full commitment to every frame. Our studio is built on the philosophy that great visual work requires the same obsessive craft as a specialty coffee — sourced with intention, developed with precision, served with care.",
      studioStat1: {
        value: "120+",
        label: "Brands Worked With",
      },
      studioStat2: { value: "5k+", label: "Assets Delivered" },
      studioStat3: { value: "3", label: "Years Active" },
      teamLabel: "Who We Are",
      teamTitle1: "Three People.",
      teamTitle2: "One Standard.",
      teamSubtitle:
        "Each of us brings something different to the frame. Together, we cover every axis of a great shoot.",
      valuesLabel: "What Drives Us",
      valuesTitle1: "Our",
      valuesTitle2: "Values.",
      values: [
        {
          num: "01",
          title: "Cinematic First",
          body: "Every frame is built like a film still — intentional shadow, deliberate composition, purpose-built light. We don't shoot fast; we shoot right.",
        },
        {
          num: "02",
          title: "Brand Depth",
          body: "We spend time understanding what a brand smells like before we ever touch a camera. Identity-led photography that goes beyond product.",
        },
        {
          num: "03",
          title: "Obsessive Craft",
          body: "From the bean to the lens. We apply the same precision a specialty roaster applies to their extraction curve — nothing is left to chance.",
        },
        {
          num: "04",
          title: "Long-Term Vision",
          body: "We don't want to shoot one campaign. We want to become the visual language of the brands we work with — consistent, evolving, owned.",
        },
      ],
      timelineLabel: "The Journey",
      timelineTitle1: "How We",
      timelineTitle2: "Got Here.",
      timeline: [
        {
          year: "2019",
          event:
            "First film camera. First roll of Kodak Portra 400.",
        },
        {
          year: "2021",
          event:
            "Transitioned to brand & commercial photography.",
        },
        {
          year: "2023",
          event:
            "PDC founded. First client: a specialty roaster from Rotterdam.",
        },
        {
          year: "2024",
          event:
            "Expanded into hospitality & luxury consumer goods.",
        },
        {
          year: "2026",
          event:
            "120+ brands. 5,000+ assets. Still obsessing over the light.",
        },
      ],
      ctaLabel: "Ready to Work With Us?",
      ctaTitle1: "Let's Build",
      ctaTitle2: "Something",
      ctaTitle3: "Cinematic.",
      ctaSubtitle:
        "Tell us about your brand and what you're trying to say. We'll handle the light.",
      ctaButton: "Start a Project →",
      ctaPortfolio: "View Portfolio",
      darkroomProcess: "The Process",
      darkroomQuote: "\"Every frame starts in the mind\nlong before the shutter fires.\"",
    },
  },

  nl: {
    nav: {
      work: "Werk",
      services: "Diensten",
      contact: "Contact",
      portfolio: "Portfolio",
      about: "Over ons",
      bookShoot: "Boek een Shoot",
    },
    hero: {
      label: "Visuele Content Studio — Opg. 2025",
      headline1: "Waar",
      headline2: "Jouw",
      headline3: "Verhaal",
      headline4: "Begint.",
      tagline: "Gemaakt als Koffie, Geschoten als Cinema.",
      subtagline:
        "Premium visueel verhalen voor iedereen die wil opvallen.",
      viewPortfolio: "Bekijk Portfolio",
      bookShoot: "Boek een Shoot",
      recentlyShown: "Recent Getoond",
      scrollIndicator: "Scroll",
    },
    workProcess: {
      label: "Het Proces",
      titleLine1: "Hoe Wij",
      titleLine2: "Werken.",
      subtitle:
        "Drie bewuste stappen. Geen compromis. Van het eerste gesprek tot het laatste bestand.",
      steps: [
        {
          number: "01",
          title: "Ontdekking",
          subtitle: "Jouw Merk Begrijpen",
          description:
            "Elk project begint met een diepgaand gesprek. We bestuderen de visuele taal van jouw merk, jouw doelgroep en het verhaal dat je wilt vertellen — voordat er ook maar één lensdop af gaat.",
          detail:
            "Creatieve Briefing · Moodboard · Locatieverkenning",
        },
        {
          number: "02",
          title: "Productie",
          subtitle: "De Shootdag",
          description:
            "Precieze belichting. Intentionele compositie. Elk frame wordt gemaakt met dezelfde zorg als een speciality koffie-extractie — gecontroleerd, weloverwogen en diepgaand doordacht.",
          detail: "Studio / Locatie · Art Directie · Styling",
        },
        {
          number: "03",
          title: "Levering",
          subtitle: "Gepolijst & Klaar",
          description:
            "Cinematisch kleurgegradueerd, met terughoudendheid geretoucheerd en geleverd in elk formaat dat jouw team nodig heeft — klaar voor gebruik op digitaal en in print.",
          detail:
            "Retouchering · Kleurcorrectie · Bestandslevering",
        },
      ],
    },
    portfolio: {
      label: "Geselecteerd Werk",
      titleLine1: "ONS",
      titleLine2: "Portfolio.",
      hoverReveal: "Hover om te onthullen",
      viewFull: "Bekijk Volledig Portfolio →",
    },
    about: {
      label: "De Oprichters",
      titleLine1: "Gebouwd Op",
      titleLine2: "Obsessie",
      titleLine3: "& Espresso.",
      body1:
        "Photo De Caffeine is ontstaan uit een eenvoudige frustratie: de meeste merkfotografie zag er hetzelfde uit. Overbelicht. Zielloos. Vergeetbaar. Drie creatievelingen — Per, Majd en Ryan — kwamen samen met een gedeelde visie: visueel werk creëren dat echt iets betekent.",
      body2:
        "Vandaag werkt PDC exclusief met merken die iets echts te zeggen hebben — van onafhankelijke roasters tot luxe horeca tot consumentengoederen. Elke shoot is gebouwd op een cinematische basis: intentioneel licht, precieze compositie en een toewijding aan beelden die trends overleven.",
      pullQuote:
        '"Gemaakt als Koffie, Geschoten als Cinema — dat is niet zomaar een slogan. Het is hoe we elk enkel frame benaderen."',
      pullQuoteCite: "— De PDC Oprichters",
      credentials: [
        {
          label: "Gevestigd In",
          value: "Roosendaal, Nederland",
        },
        { label: "Opgericht", value: "2023" },
        { label: "Specialiteit", value: "Merkverhalen" },
        { label: "Beschikbaarheid", value: "Wereldwijd" },
      ],
      owners: [
        {
          name: "Per van Hassel",
          role: "Medeoprichter & Creative Director / Strategy",
        },
        {
          name: "Majd Tawashe",
          role: "Medeoprichter e& Kantoorhoofd in Portugal",
        },
        {
          name: "Ryan Chantre",
          role: "Medeoprichter en Creatief Verantwoordelijke",
        },
      ],
      learnMore: "Meer Over PDC →",
    },
    services: {
      label: "Wat We Aanbieden",
      titleLine1: "Diensten &",
      titleLine2: "Pakketten.",
      subtitle:
        "Drie niveaus. Elk gebouwd voor merken die weten dat kwaliteit geen optie is.",
      whatsIncluded: "Inbegrepen",
      notIncluded: "Niet Inbegrepen",
      idealFor: "Ideaal Voor",
      bookPackage: "Boek Dit Pakket",
      featured: "Meest Populair",
      customNote:
        "Iets op maat nodig? Elk project is anders. Laten we praten.",
      talkToUs: "Neem Contact Op →",
      packages: [
        {
          id: "espresso",
          name: "Espresso",
          label: "Single Origin",
          price: "€890",
          per: "per dag",
          summary:
            "Gefocust. Intens. Voor merken die weten wat ze nodig hebben.",
          includes: [
            "1 shootdag (tot 6 uur)",
            "Tot 20 definitieve beelden",
            "Één set / locatie",
            "Basis prop styling",
            "Kleurcorrectie & retouche",
            "Web + print bestandslevering",
          ],
          notIncluded: [
            "On-set art director",
            "Campaignestrategie",
            "Spoedbezorging",
          ],
          ideal: "Productlanceringen, enkele campagnes",
        },
        {
          id: "reserve",
          name: "Reserve",
          label: "Studio Handtekening",
          price: "€2.400",
          per: "per project",
          summary:
            "De volledige PDC-ervaring — cinematisch, art-directed, onvergetelijk.",
          includes: [
            "2 shootdagen",
            "Tot 60 definitieve beelden",
            "Meerdere sets / locaties",
            "Volledige prop & scène styling",
            "Cinematische kleurcorrectie",
            "On-set art directie door Per",
            "Campaignestrategie sessie",
            "Web, print & social levering",
          ],
          notIncluded: [],
          ideal: "Merkcampagnes, horeca, editorial",
        },
        {
          id: "blend",
          name: "Blend",
          label: "Doorlopend Retainer",
          price: "€1.200",
          per: "per maand",
          summary:
            "Consistente visuele identiteit over elk kanaal, elke maand.",
          includes: [
            "1 shootdag per maand",
            "30 definitieve beelden maandelijks",
            "Prioriteitsplanning",
            "Toegewijd merkstijlgids",
            "Levering binnen een week",
            "Onbeperkte revisierondes",
          ],
          notIncluded: ["Reiskosten op locatie inbegrepen"],
          ideal: "Groeiende merken, contentprogramma's",
        },
      ],
    },
    socialProof: {
      label: "Klantwoorden",
      testimonialsLabel: "Getuigenissen",
      testimonials: [
        {
          id: 1,
          quote:
            "PDC heeft niet alleen onze producten gefotografeerd — ze hebben opnieuw gedefinieerd hoe ons merk er voor de wereld uitziet. Elk frame heeft een gewicht dat onze vorige fotografie nooit had. Klanten vertellen ons nu dat onze website eruitziet als een tijdschrift.",
          name: "Mia Thornton",
          company: "Verlot Goods",
          role: "Oprichter & Creatief Directeur",
        },
        {
          id: 2,
          quote:
            "Per heeft een instinct voor licht dat ik zelden ben tegengekomen. Hij liep onze branders binnen, absorbeerde de ruimte, en drie uur later hadden we beelden die ons hele verhaal vertelden. Geen briefings. Geen revisies. Gewoon pure vakmanschap.",
          name: "Jonas Kellner",
          company: "Dusk Roasters",
          role: "Hoofd Brand",
        },
        {
          id: 3,
          quote:
            "Werken met PDC is anders dan met elke andere fotograaf die ik ooit heb ingehuurd. Het is collaboratief, weloverwogen, en de resultaten zijn altijd cinematisch op een manier die authentiek aanvoelt — niet opgevoerd. Elke euro waard.",
          name: "Isabelle Marceau",
          company: "Brûlée House",
          role: "Marketing Directeur",
        },
      ],
      brands: "Vertrouwd door merken door heel Europa",
    },
    contact: {
      readyLabel: "Klaar voor de Shoot?",
      readyTitle1: "Laten We Iets",
      readyTitle2: "Onvergetelijks",
      readyTitle3: "Maken.",
      formTitle: "Start een Project",
      formSubtitle:
        "Vertel ons over jouw merk. We reageren binnen 24 uur.",
      namePlaceholder: "Jouw Naam",
      emailPlaceholder: "Jouw E-mail",
      phonePlaceholder: "Jouw Telefoonnummer",
      brandPlaceholder: "Jouw Merk / Bedrijf",
      messagePlaceholder: "Vertel ons over jouw project...",
      packageLabel: "Pakket Interesse",
      packageDefault: "Selecteer een pakket (optioneel)",
      sendButton: "Stuur Bericht →",
      successTitle: "Bericht Ontvangen.",
      successBody:
        "We bekijken jouw brief en nemen binnen één werkdag contact met je op. Bedankt voor het overwegen van PDC.",
      infoTitle: "Studiogegevens",
      location: "Roosendaal, Nederland",
      availability: "Wereldwijd Beschikbaar",
      responseTime: "Reactie binnen 24u",
      followLabel: "Volg het Werk",
    },
    footer: {
      tagline: "Gemaakt als Koffie, Geschoten als Cinema.",
      nav: "Navigatie",
      followUs: "Volg het Werk",
      address: "Middenstraat 47 · Roosendaal",
      email: "contact@photodecaffeine.com",
      bookShoot: "Boek een Shoot →",
      clientPortal: "Client Login",
      kvk: "94948933",
      btw: "NL823807071B01",
      privacy: "Privacybeleid",
      terms: "Algemene Voorwaarden",
      cookiePolicy: "Cookiebeleid",
      madeIn: "Gemaakt in Roosendaal.",
      copyright: (year: number) =>
        `© ${year} Photo De Caffeine. Alle rechten voorbehouden.`,
    },
    automotivePage: {
      backLabel: "Diensten",
      sectionLabel: "Diensten",
      subtitle: "Cinematische beelden die de kracht, precisie en persoonlijkheid van elk voertuig vastleggen.",
      packageLabel: "Het pakket",
      perVehicle: "per voertuig",
      includedLabel: "Wat is inbegrepen",
      included: [
        "1 voertuig — auto, motor, vrachtwagen of ander",
        "1 uur op locatie",
        "15 bewerkte foto's op hoge resolutie",
        "Geleverd binnen 5 werkdagen",
        "Persoonlijke & commerciële gebruikslicentie",
      ],
      bookLabel: "Boek dit pakket",
      bookTitle: "Laat je gegevens achter",
      bookSubtitle: "Vul je naam in en hoe we je kunnen bereiken — we nemen binnen 24 uur contact op om de shoot te bevestigen en te plannen.",
      namePlaceholder: "Jouw naam",
      emailLabel: "E-mailadres",
      phoneLabel: "Telefoonnummer",
      phonePlaceholder: "+31 6 ...",
      phoneHint: "E-mail of telefoon — minimaal één verplicht",
      submitButton: "Boek voor €50",
      submitting: "Bezig…",
      successTitle: "We hebben je gegevens ontvangen",
      successBody: "We nemen binnen 24 uur contact met je op om de shoot te plannen. Tot snel.",
      errorGeneric: "Er is iets misgegaan. Probeer het opnieuw of neem direct contact op.",
      errorContact: "Vul minimaal een e-mailadres of telefoonnummer in.",
      customLabel: "Meer nodig?",
      customTitle: "Maatwerk",
      customTitleDim: "pakketten",
      customBody: "Meerdere voertuigen, video, dagshoots of iets anders — neem contact op en we stellen samen iets passends samen.",
      customButton: "Neem contact op",
      readyLabel: "Klaar voor de shoot?",
    },
    portfolioPage: {
      backToHome: "← Terug naar Home",
      label: "PhotoDeCaffeine",
      titleLine1: "Geselecteerd",
      titleLine2: "Werk.",
      subtitle:
        "Elk frame is intentioneel. Elke klant, bewust gekozen.\nDit is het werk dat ons definieert.",
      showingOf: (shown: number, total: number) =>
        `${shown} van ${total} projecten`,
      bookShoot: "Boek een Shoot →",
      noWork: "Nog geen werk in deze categorie.",
      categories: {
        All: "Alles",
        "Brand Identity": "Merkidentiteit",
        Product: "Product",
        Editorial: "Editorial",
        Campaign: "Campagne",
        Fashion: "Mode",
        "F&B": "F&B",
      },
    },
    aboutPage: {
      backToHome: "← Terug naar Home",
      label: "Over PDC",
      titleLine1: "Wij Doen",
      titleLine2: "Meer Dan",
      titleLine3: "Schieten.",
      subtitle:
        "We bouwen visuele werelden voor merken die meer vragen dan competente fotografie. Dit is wie we zijn.",
      studioLabel: "De Studio",
      studioTitle1: "Een Studio Gebouwd op",
      studioTitle2: "Overtuiging.",
      studioBody1:
        "Photo De Caffeine begon met een eenvoudige daad van rebellie: weigeren om vergeetbare foto's te maken. We geloven dat elk merk een visueel verhaal heeft dat het waard is om te vertellen — en de meeste fotografen nemen niet de moeite om het te vinden.",
      studioBody2:
        "We werken langzaam, diepgaand en met volledige toewijding aan elk frame. Onze studio is gebouwd op de filosofie dat geweldig visueel werk hetzelfde obsessieve vakmanschap vereist als een speciality koffie — met intentie gesourcet, met precisie ontwikkeld, met zorg geserveerd.",
      studioStat1: {
        value: "120+",
        label: "Merken Mee Gewerkt",
      },
      studioStat2: { value: "5k+", label: "Assets Geleverd" },
      studioStat3: { value: "3", label: "Jaar Actief" },
      teamLabel: "Wie We Zijn",
      teamTitle1: "Drie Mensen.",
      teamTitle2: "Één Standaard.",
      teamSubtitle:
        "Elk van ons brengt iets anders naar het frame. Samen dekken we elke as van een geweldige shoot.",
      valuesLabel: "Wat Ons Drijft",
      valuesTitle1: "Onze",
      valuesTitle2: "Waarden.",
      values: [
        {
          num: "01",
          title: "Cinematisch Eerst",
          body: "Elk frame is opgebouwd als een filmstill — intentionele schaduw, doelbewuste compositie, doelgericht licht. We schieten niet snel; we schieten goed.",
        },
        {
          num: "02",
          title: "Merkdiepte",
          body: "We nemen de tijd om te begrijpen hoe een merk ruikt voordat we ook maar een camera aanraken. Identiteitsgedreven fotografie die verder gaat dan het product.",
        },
        {
          num: "03",
          title: "Obsessief Vakmanschap",
          body: "Van de boon tot de lens. We passen dezelfde precisie toe als een speciality roaster op zijn extractiecurve — niets wordt aan het toeval overgelaten.",
        },
        {
          num: "04",
          title: "Langetermijnvisie",
          body: "We willen niet één campagne schieten. We willen de visuele taal worden van de merken waarmee we werken — consistent, evoluerend, eigendom.",
        },
      ],
      timelineLabel: "De Reis",
      timelineTitle1: "Hoe We",
      timelineTitle2: "Hier Kwamen.",
      timeline: [
        {
          year: "2019",
          event:
            "Eerste filmcamera. Eerste rol Kodak Portra 400.",
        },
        {
          year: "2021",
          event:
            "Overgestapt naar merk- & commerciële fotografie.",
        },
        {
          year: "2023",
          event:
            "PDC opgericht. Eerste klant: een speciality roaster uit Rotterdam.",
        },
        {
          year: "2024",
          event:
            "Uitgebreid naar horeca & luxe consumentengoederen.",
        },
        {
          year: "2026",
          event:
            "120+ merken. 5.000+ assets. Nog steeds obsessief over het licht.",
        },
      ],
      ctaLabel: "Klaar om met ons te werken?",
      ctaTitle1: "Laten We Iets",
      ctaTitle2: "Cinematisch",
      ctaTitle3: "Bouwen.",
      ctaSubtitle:
        "Vertel ons over jouw merk en wat je wilt uitdrukken. Wij verzorgen het licht.",
      ctaButton: "Start een Project →",
      ctaPortfolio: "Bekijk Portfolio",
      darkroomProcess: "Het Proces",
      darkroomQuote: "\"Elk frame begint in de gedachten\nlang voordat de sluiter valt.\"",
    },
  },
} as const;

export type Translations = typeof translations.en;