import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowIncompleteOnboarding = false }) => {
  const { user, loading } = useAuth();

  // Wait for auth check — AppContent already shows the SplashScreen
  // while loading, so ProtectedRoute should never render during this phase.
  if (loading) {
    return null;
  }

  // Not logged in
  if (!user) {
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
