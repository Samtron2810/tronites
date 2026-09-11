// Tier & benefits data for the /tiers page.
//
// The authoritative per-tier numbers live in utils/tierLimits.js (the
// client mirror of the backend tables). This module only composes those
// tables with the badge metadata from constants/verification.js into
// display-ready data, so the page always reflects what the server
// actually enforces and can never drift from it.

import {
  POST_CHAR_LIMITS,
  PINNED_POST_LIMITS,
  POST_EDIT_WINDOW_MS,
} from "../utils/tierLimits";
import { VERIFICATION_META } from "./verification";

// Display order, lowest value up, so the progression reads
// unverified → individual → creator → business → government → staff.
export const TIER_ORDER = [
  "unverified",
  "individual",
  "creator",
  "business",
  "government",
  "staff",
];

const SHORT_LABELS = {
  unverified: "Unverified",
  individual: "Individual",
  creator: "Creator",
  business: "Business",
  government: "Government",
  staff: "Staff",
};

// Extra per-tier notes shown on the detail cards.
const TIER_NOTES = {
  creator:
    "Requires an active Individual verification badge first — the app walks you up one tier at a time.",
  business:
    "Business badge applications carry a one-time verification fee, paid through the app when you apply.",
};

// One entry per tier: name, full label, badge color and the one-sentence
// claim the badge is asserting (unverified has no badge, so it gets a
// neutral definition of the baseline instead).
export const TIER_INFO = TIER_ORDER.map((id) => {
  const meta = VERIFICATION_META[id];
  return {
    id,
    name: SHORT_LABELS[id],
    label: meta ? meta.label : "Unverified",
    color: meta ? meta.color : "#64748B",
    claim: meta
      ? meta.claim
      : "No verification badge yet — every account starts on the free baseline below.",
    note: TIER_NOTES[id] || null,
  };
});

const editWindowLine = (tier) => {
  const ms = POST_EDIT_WINDOW_MS[tier];
  if (ms === null) return "—";
  if (ms === Infinity) return "Always";
  const mins = ms / 60000;
  if (mins >= 60 && mins % 60 === 0) {
    const hours = mins / 60;
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${mins} min`;
};

// Feature rows — shared by the at-a-glance comparison matrix and the
// per-tier detail cards.
export const TIER_FEATURES = [
  {
    id: "charLimit",
    label: "Post length",
    hint: "Characters per post",
    format: (tier) => POST_CHAR_LIMITS[tier].toLocaleString(),
  },
  {
    id: "schedule",
    label: "Schedule posts",
    hint: "Queue posts to publish later",
    format: (tier) => (tier === "unverified" ? "—" : "Yes"),
  },
  {
    id: "pinLimit",
    label: "Pinned posts",
    hint: "Posts you can pin to your profile",
    format: (tier) => String(PINNED_POST_LIMITS[tier]),
  },
  {
    id: "editWindow",
    label: "Edit window",
    hint: "How long after posting you can edit it",
    format: (tier) => editWindowLine(tier),
  },
  {
    id: "promote",
    label: "Promoted posts",
    hint: "Paid boost to reach more people",
    format: (tier) => (tier === "business" ? "Yes" : "—"),
  },
  {
    id: "analytics",
    label: "Analytics dashboard",
    hint: "Reach and engagement insights",
    format: (tier) => (tier === "creator" ? "Yes" : "—"),
  },
  {
    id: "collabs",
    label: "Open to collabs",
    hint: "Signal you're open to partnerships",
    format: (tier) => (tier === "creator" ? "Yes" : "—"),
  },
];

// Per-tier feature list for a detail card: label, hint, the formatted
// value, and whether this tier actually grants it.
export const tierBenefits = (tier) =>
  TIER_FEATURES.map((f) => {
    const value = f.format(tier);
    return {
      id: f.id,
      label: f.label,
      hint: f.hint,
      value,
      enabled: value === "Yes",
    };
  });