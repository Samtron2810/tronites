import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import Navbar from "./components/Navbar";
import SplashScreen from "./components/SplashScreen";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Chat from "./pages/Chat";
import FollowersList from "./pages/FollowersList";
import VerifyOtp from "./pages/VerifyOtp";
import ChooseUsername from "./pages/ChooseUsername";
import UsernameRedirect from "./pages/UsernameRedirect";
import Hashtag from "./pages/Hashtag";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ModerationQueue from "./pages/ModerationQueue";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/ProtectedRoute";

const AppContent = () => {
  const { user, loading } = useAuth();

  // Show splash screen on fresh app load while the auth check runs
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <>
      {user && user.username && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected */}
        <Route
          path="/choose-username"
          element={
            <ProtectedRoute allowIncompleteOnboarding>
              <ChooseUsername />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/connections/:id"
          element={
            <ProtectedRoute>
              <FollowersList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/u/:username"
          element={
            <ProtectedRoute>
              <UsernameRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hashtag/:tag"
          element={
            <ProtectedRoute>
              <Hashtag />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/moderation"
          element={
            <ProtectedRoute>
              <ModerationQueue />
            </ProtectedRoute>
          }
        />

        {/* Catch-all — must stay last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
