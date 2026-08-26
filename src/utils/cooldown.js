// Shared "time remaining" formatters for cooldown-gated actions
// (username/name changes, post edits, etc). Two granularities because
// the existing username/name cooldowns are measured in days and only
// ever need day-level precision, while a 1-hour post-edit cooldown
// would always round up to "1 day" with that formatter — misleading
// for something that clears in minutes.

// Day-granularity — used by username/name change cooldowns (30d/3d
// windows), where reporting anything finer than "N days" adds no
// useful precision for the user.
export const formatRemainingDays = (nextAllowedAt) => {
  const ms = new Date(nextAllowedAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return "1 day";
  return `${days} days`;
};

// Minute/hour-granularity — used by the post-edit cooldown (1hr window),
// where "1 day" would be wrong and unhelpful.
export const formatRemainingShort = (nextAllowedAt) => {
  const ms = new Date(nextAllowedAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
};

// Derives "can I do this yet" purely from a timestamp + duration (ms) —
// no server round-trip needed just to check eligibility client-side.
export const cooldownRemainingMs = (changedAt, cooldownMs) => {
  if (!changedAt) return null;
  const nextAllowedAt = new Date(
    new Date(changedAt).getTime() + cooldownMs,
  );
  return nextAllowedAt.getTime() > Date.now() ? nextAllowedAt : null;
};
