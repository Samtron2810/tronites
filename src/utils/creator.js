// Client-side mirror of backend middleware/requireCreator.js - a user counts
// as a creator only while they hold an ACTIVE (unexpired) "creator" verification
// badge. Single source of truth for all client creator gating (route guard +
// More-page tiles) so the two can never drift apart from each other (or from the
// server, which enforces the same rule anyway).
export const isCreator = (user) =>
  Array.isArray(user?.verifications) &&
  user.verifications.some(
    (v) =>
      v.type === "creator" &&
      (!v.expiresAt || new Date(v.expiresAt) > new Date()),
  );