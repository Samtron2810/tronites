// Recipient groups for the admin email broadcast page. Keep in sync with
// backend/utils/broadcastGroups.js. "Tier" groups match a user's highest
// ACTIVE verification badge (same precedence as utils/tierLimits.js).
export const AUDIENCE_SECTIONS = [
  {
    title: "Everyone",
    items: [{ value: "all", label: "All users" }],
  },
  {
    title: "Verification",
    items: [
      { value: "verified", label: "Verified" },
      { value: "unverified", label: "Unverified" },
    ],
  },
  {
    title: "Tier · highest active badge",
    items: [
      { value: "individual", label: "Individual" },
      { value: "creator", label: "Creators" },
      { value: "business", label: "Business" },
      { value: "government", label: "Government" },
      { value: "staff", label: "Staff" },
    ],
  },
  {
    title: "Role",
    items: [
      { value: "users", label: "Regular users" },
      { value: "moderators", label: "Moderators" },
      { value: "admins", label: "Admins" },
    ],
  },
];

export const GROUP_LABELS = Object.fromEntries(
  AUDIENCE_SECTIONS.flatMap((s) => s.items.map((i) => [i.value, i.label])),
);

export const ACTIVE_CAMPAIGN_STATUSES = ["preparing", "queued", "sending", "paused"];
