// Single place for facts that appear across the legal pages.
//
// LEGAL_VERSION must match LEGAL_VERSION in the backend's
// utils/legalVersions.js — the backend stores it on each new account as the
// version that was accepted. Bump both (and LEGAL_LAST_UPDATED) together
// whenever the Terms or Privacy Policy change materially.
export const LEGAL_VERSION = "2026-10-09";
export const LEGAL_LAST_UPDATED = "October 9, 2026";

export const MIN_SIGNUP_AGE = 13;

export const CONTACT = {
  support: "support@tronites.com",
  privacy: "privacy@tronites.com",
};

// FILL THESE IN. Nigerian data-protection law (NDPA 2023) expects the
// controller to be identifiable. Each non-empty field is rendered
// automatically in the Privacy Policy, Terms and Copyright page; empty
// fields are simply omitted, so nothing placeholder-ish ever shows.
export const LEGAL_ENTITY = {
  name: "", // e.g. "Tronites Limited"
  registrationNumber: "", // CAC / RC number
  address: "", // registered office address
  dataProtectionOfficer: "", // DPO name or title, if appointed
};

export const LEGAL_LINKS = [
  { to: "/terms", label: "Terms of Use" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/guidelines", label: "Community Guidelines" },
  { to: "/refunds", label: "Refunds & Cancellations" },
  { to: "/copyright", label: "Copyright & Takedowns" },
];
