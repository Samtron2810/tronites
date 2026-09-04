import { Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

const ProtectedRoute = ({ children, allowIncompleteOnboarding = false }) => {
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

  return children;
};

export default ProtectedRoute;
