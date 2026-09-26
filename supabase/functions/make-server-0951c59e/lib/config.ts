// --- Email ---
export const EMAIL_FROM = "PhotoDeCaffeine <noreply@photodecaffeine.com>";
export const EMAIL_ADMIN_NOTIFY = "contact@photodecaffeine.com";
export const SITE_URL = "https://www.photodecaffeine.com";

// The site owner — always has every permission regardless of what's stored in
// the roles table, and can never be demoted, reassigned, or removed by anyone
// (including themselves via the team-management UI). Checked by email rather
// than a DB flag so it can't be tampered with by editing role data.
export const OWNER_EMAIL = "pervanhassel@gmail.com";

// Default roles seeded the first time /admin/roles is requested and none
// exist yet. All fully editable afterwards — this is just a starting point.
export const DEFAULT_ROLES: { name: string; permissions: Record<string, boolean> }[] = [
  {
    name: "CEO",
    permissions: {
      manageAdmins: false,
      manageClients: true,
      manageQuotes: true,
      managePortfolio: true,
      manageInquiries: true,
      manageReminders: true,
      manageAds: true,
      manageSettings: true,
      manageDeclarations: true,
      viewAllDeclarations: false,
    },
  },
  {
    name: "CFO",
    permissions: {
      manageAdmins: false,
      manageClients: true,
      manageQuotes: true,
      managePortfolio: false,
      manageInquiries: true,
      manageReminders: false,
      manageAds: false,
      manageSettings: false,
      manageDeclarations: true,
      viewAllDeclarations: true,
    },
  },
  {
    name: "COO",
    permissions: {
      manageAdmins: false,
      manageClients: true,
      manageQuotes: true,
      managePortfolio: true,
      manageInquiries: true,
      manageReminders: true,
      manageAds: true,
      manageSettings: true,
      manageDeclarations: true,
      viewAllDeclarations: false,
    },
  },
];

// The site records ad clicks through the contact endpoint so the Ads page can
// count them. They are stored as inquiries and filtered back out everywhere
// they are listed; this is the name they carry.
export const AD_VISIT_MARKER = "__ad_visit__";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// How long a client invitation stays good for.
export const INVITE_VALID_DAYS = 30;

// Ruim boven wat een intakegesprek oplevert; een briefing van 6 kB is normaal.
export const BRIEFING_MAX_CHARS = 100_000;
