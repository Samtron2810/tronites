import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait for auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-orange-400 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
