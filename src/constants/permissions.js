// Phase 5 — the granular permissions, in display order. Shared
// between AdminUsers.jsx (which used to own this list) and
// ConfirmPermissionChangeModal.jsx; lives in its own constants file
// because react-refresh requires component files to export components
// only. Keep in sync with backend/models/User.js PERMISSIONS.
export const PERMISSION_OPTIONS = [
  {
    value: "manage_reports",
    label: "Manage reports",
    hint: "Moderation queue, previews, resolve + takedown, warnings",
  },
  {
    value: "manage_users",
    label: "Manage users",
    hint: "Suspend / adjust suspension / restore access",
  },
  {
    value: "manage_content",
    label: "Manage content",
    hint: "Report resolution, plus granting free post promotions",
  },
  {
    value: "view_audit_log",
    label: "View audit log",
    hint: "Read the moderation audit trail",
  },
  {
    value: "manage_verification",
    label: "Manage verification",
    hint: "Review, approve, and deny verification badge applications",
  },
  {
    value: "manage_roles",
    label: "Manage roles",
    hint: "Admin-only for now — no runtime gate consumes this yet",
    locked: true,
  },
];

// Client-side mirror of backend/models/User.js's DEFAULT_MODERATOR_PERMISSIONS
// and backend/middleware/requirePermission.js's resolution order. Used only
// to gate UI (menu items, buttons) — the server re-checks on every request
// and remains the source of truth.
export const DEFAULT_MODERATOR_PERMISSIONS = [
  "manage_reports",
  "manage_users",
  "manage_content",
];

// Resolution order: admin role is an implicit wildcard; a moderator with an
// explicit (possibly empty, possibly revoked-down) permissions array uses
// exactly that array; a moderator with no explicit array yet falls back to
// the defaults above; anyone else has nothing.
export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const effective = user.permissions?.length
    ? user.permissions
    : user.role === "moderator"
      ? DEFAULT_MODERATOR_PERMISSIONS
      : [];
  return effective.includes(permission);
};
