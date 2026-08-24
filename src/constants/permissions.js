// Phase 5 — the five granular permissions, in display order. Shared
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
    hint: "Rides along with report resolution today",
  },
  {
    value: "view_audit_log",
    label: "View audit log",
    hint: "Read the moderation audit trail",
  },
  {
    value: "manage_roles",
    label: "Manage roles",
    hint: "Admin-only for now — no runtime gate consumes this yet",
    locked: true,
  },
];
