// Client-side mirror of backend/utils/tierLimits.js — same precedence,
// same tables. The backend remains the source of truth; these helpers
// only gate UI (menu items, counters, toggles) so we never surface an
// action the server is guaranteed to reject.
export const getActiveTier = (user) => {
  const verifications = user?.verifications;
  if (!Array.isArray(verifications)) return "unverified";
  const now = new Date();
  const has = (type) =>
    verifications.some(
      (v) => v?.type === type && (!v.expiresAt || new Date(v.expiresAt) > now),
    );
  for (const tier of [
    "staff",
    "government",
    "business",
    "creator",
    "individual",
  ]) {
    if (has(tier)) return tier;
  }
  return "unverified";
};

export const isVerified = (user) => getActiveTier(user) !== "unverified";

export const POST_CHAR_LIMITS = {
  unverified: 280,
  individual: 500,
  creator: 1000,
  business: 1000,
  government: 1000,
  staff: 5000, // capped at the shared MAX_POST_TEXT ceiling
};

export const MAX_POST_TEXT = 5000;

export const getCharLimit = (user) =>
  POST_CHAR_LIMITS[getActiveTier(user)] ?? POST_CHAR_LIMITS.unverified;

export const canSchedule = (user) => getActiveTier(user) !== "unverified";

export const PINNED_POST_LIMITS = {
  unverified: 0,
  individual: 1,
  creator: 3,
  business: 3,
  government: 3,
  staff: 5,
};

export const getPinnedLimit = (user) =>
  PINNED_POST_LIMITS[getActiveTier(user)] ?? 0;

export const canPromote = (user) => {
  const tier = getActiveTier(user);
  return tier === "business" || tier === "creator";
};

// Flat cooldown between successive edits, any tier (mirrors backend).
export const POST_EDIT_COOLDOWN_MS = 5 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

// null = editing unavailable (unverified); Infinity = no window (staff).
export const POST_EDIT_WINDOW_MS = {
  unverified: null,
  individual: 15 * MINUTE_MS,
  creator: 30 * MINUTE_MS,
  business: 30 * MINUTE_MS,
  government: 60 * MINUTE_MS,
  staff: Infinity,
};

export const canEditPost = (user) => getActiveTier(user) !== "unverified";

// ── Creator monetization ─────────────────────────────────────────────────────
export const canAccessAnalytics = (user) => {
  const tier = getActiveTier(user);
  return tier === "creator" || tier === "business" || tier === "staff";
};

export const canCreateSubscriptionPlan = (user) =>
  getActiveTier(user) === "creator";
export const canPostSubscribersOnly = (user) =>
  getActiveTier(user) === "creator";

export const getEditWindowMs = (user) =>
  POST_EDIT_WINDOW_MS[getActiveTier(user)] ?? null;
