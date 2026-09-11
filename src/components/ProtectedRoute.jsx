import { Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { isCreator } from "../utils/creator";
import { canSchedule } from "../utils/tierLimits";

const ProtectedRoute = ({
  children,
  allowIncompleteOnboarding = false,
  requireCreator = false,
  requireScheduling = false,
  requireRole,
  requirePermission,
}) => {
  const { user, loading } = useAuth();

  // Wait for auth check — AppContent already shows the SplashScreen
  // while loading, so ProtectedRoute should never render during this phase.
  // When the user was seeded from localStorage cache, loading is false
  // immediately (no blocking), so this branch is only hit on a genuinely
  // unauthenticated cold start or when the SW hasn't served /auth/me yet.
  if (loading) {
    return null;
  }

  // Not logged in AND not just offline.
  // If navigator.onLine is false, the silent background validation may
  // still be running against the SW cache — don't redirect yet. The
  // AuthContext will null out `user` only if the server explicitly returns
  // 401, which can't happen while the device is offline.
  if (!user) {
    // If we're offline and there's no cached user at all, we genuinely
    // have no session — let the redirect happen. If online, a null user
    // with loading=false means the server confirmed no valid session.
    return <Navigate to="/login" />;
  }

  // Logged in but hasn't finished onboarding (no username yet) — force
  // them through /choose-username before anything else, unless this is
  // that route itself.
  if (!user.username && !allowIncompleteOnboarding) {
    return <Navigate to="/choose-username" />;
  }

  // Creator-only pages (dashboard, analytics, etc.) - mirror the
  // backend chain protect → requireCreator. The server is the real gate; this
  // just avoids mounting a page whose every request would 403.
  if (requireCreator && !isCreator(user)) {
    return <Navigate to="/more" replace />;
  }

  // Scheduling pages — any verified tier (individual/creator/business/government/staff).
  // Unverified users can't schedule; this avoids mounting a page whose every request would 403.
  if (requireScheduling && !canSchedule(user)) {
    return <Navigate to="/more" replace />;
  }

  // Role-gated staff pages (moderation queue, admin tools) - mirrors the backend
  // requireModerator/requireAdmin - redirect so we don't mount a page whose
  // every request would 403 (same reasoning as the creator guard above).


  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Permission-gated pages (audit log) - mirrors requirePermission.js resolution:
  // admin role → implicit wildcard; everyone else needs the named permission in
  // their explicit permissions array — same check as AdminAuditLog's canView.




  if (
    requirePermission &&
    user.role !== "admin" &&
    !(user.permissions || []).includes(requirePermission)
  ) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
