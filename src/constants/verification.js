// Verification badges — CLAIM model, not status. Each type answers one
// specific, falsifiable question; see TRONITES_VERIFICATION_BADGES.md.
// Keep in sync with backend/models/User.js VERIFICATION_TYPES.
//
// Ordered by display priority when a user holds multiple badges (highest
// authority wins the inline slot; full set shows in the detail sheet):
// staff always shows regardless of rank, then gov > business > creator >
// individual.
export const VERIFICATION_TYPES = [
  "staff",
  "government",
  "business",
  "creator",
  "individual",
];

// value = hex from the spec's contact sheet (badges/contact-sheet.svg).
// claim = the one sentence the badge is asserting — used verbatim in the
// detail sheet so the badge always explains itself, never just decorates.
export const VERIFICATION_META = {
  individual: {
    label: "Verified individual",
    color: "#1D9BF0",
    ariaLabel: "Verified individual account",
    claim: "Tronites confirmed this is a real, uniquely identified person.",
  },
  business: {
    label: "Verified business",
    color: "#E8B931",
    ariaLabel: "Verified business account",
    claim: "Tronites confirmed this is the official account of a registered entity.",
  },
  government: {
    label: "Verified government",
    color: "#8B9DB0",
    ariaLabel: "Verified government account",
    claim: "Tronites confirmed this is an official government or public-institution account.",
  },
  creator: {
    label: "Verified creator",
    color: "#9B59D0",
    ariaLabel: "Verified creator account",
    claim: "Tronites confirmed this account belongs to a notable creator or public figure.",
  },
  staff: {
    label: "Tronites staff",
    color: "#0FB89B",
    ariaLabel: "Tronites staff account",
    claim: "This account belongs to Tronites staff and may contact you officially.",
  },
};

// Pick the single highest-authority badge to show inline next to a name,
// per VERIFICATION_TYPES priority order above.
export const pickPrimaryVerification = (verifications) => {
  if (!Array.isArray(verifications) || verifications.length === 0) return null;
  for (const type of VERIFICATION_TYPES) {
    const match = verifications.find((v) => v.type === type);
    if (match) return match;
  }
  return null;
};
