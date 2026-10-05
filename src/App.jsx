import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/useAuth";
import Navbar from "./components/Navbar";
import PublicNavbar from "./components/PublicNavbar";
import SplashScreen from "./components/SplashScreen";
import InstallPrompt from "./components/InstallPrompt";
import UpdateToast from "./components/UpdateToast";
import { subscribeToPushNavigation } from "./services/pwaUpdate";

// Landing is kept as a static import — it's the page every logged-out
// visitor and every crawler hits first, so lazy-loading it would trade
// the current single up-front bundle for an extra network round-trip on
// the single most common cold load. Home (the authenticated feed) is
// only reached by navigating there after login, so it's lazy instead —
// see the reasoning this comment replaced, which applied to Home when
// it lived at "/".
import Landing from "./pages/Landing";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Explore = lazy(() => import("./pages/Explore"));
const Chat = lazy(() => import("./pages/Chat"));
const FollowersList = lazy(() => import("./pages/FollowersList"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const ChooseUsername = lazy(() => import("./pages/ChooseUsername"));
const ChooseInterests = lazy(() => import("./pages/ChooseInterests"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PublicPostView = lazy(() => import("./pages/PublicPostView"));
const PublicHashtag = lazy(() => import("./pages/PublicHashtag"));
const PublicExplore = lazy(() => import("./pages/PublicExplore"));
const Hashtag = lazy(() => import("./pages/Hashtag"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PostView = lazy(() => import("./pages/PostView"));
const Settings = lazy(() => import("./pages/Settings"));
const SecuritySessions = lazy(() => import("./pages/SecuritySessions"));
const ModerationQueue = lazy(() => import("./pages/ModerationQueue"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const More = lazy(() => import("./pages/More"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const ScheduledPosts = lazy(() => import("./pages/ScheduledPosts"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Tiers = lazy(() => import("./pages/Tiers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaystackReturnHandler = lazy(() => import("./components/PaystackReturnHandler"));
const MyPromotions = lazy(() => import("./pages/MyPromotions"));
const AdminPromotions = lazy(() => import("./pages/AdminPromotions"));
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const CampaignManager = lazy(() => import("./pages/CampaignManager"));
const CreatorEarnings = lazy(() => import("./pages/CreatorEarnings"));
const MediaKit = lazy(() => import("./pages/MediaKit"));

import ProtectedRoute from "./components/ProtectedRoute";

// Lighter-weight than SplashScreen (which is reserved for the initial
// auth-check load) — a lazy route chunk is typically a small download on
// a warm connection, so a full-screen splash flashing in and out on every
// navigation would be more jarring than helpful. This only shows once the
// chunk fetch is slow enough for Suspense to actually fall back to it.
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// "/" is the marketing landing page — only for visitors with no session.
// A logged-in user (including a cold start from the PWA's start_url "/")
// goes straight to the feed. `user` is seeded synchronously from the cached
// snapshot, so there is no flash of the landing page; users who haven't
// picked a username are then routed on by ProtectedRoute.
const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null; // AppContent shows the splash while loading
  if (user) return <Navigate to="/home" replace />;
  return <Landing />;
};

const AppContent = () => {
  const { user, loading, registerNavigateToLogin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLandingPage = pathname === "/";
  const authOnlyPaths = new Set([
    "/login",
    "/signup",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ]);
  const shouldShowPublicNavbar =
    !user && !isLandingPage && !authOnlyPaths.has(pathname);

  // Give AuthContext a handle to useNavigate so logout() and force-logout
  // can push to /login imperatively instead of relying on ProtectedRoute's
  // declarative redirect, which races against the unmounting component tree.
  useEffect(() => {
    registerNavigateToLogin((path) => navigate(path, { replace: true }));
  }, [navigate, registerNavigateToLogin]);

  // Lets a tap on a push notification focus the already-open tab and
  // route it to the right screen (e.g. straight to the post that was
  // liked) instead of only being able to open a blank new tab — see
  // sw.js's notificationclick handler, which posts this message.
  useEffect(() => {
    return subscribeToPushNavigation(navigate);
  }, [navigate]);

  // Show splash screen on fresh app load while the auth check runs
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <>
      {user && user.username && !isLandingPage && <Navbar />}
      {shouldShowPublicNavbar && <PublicNavbar />}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Legal — public so they're readable pre-login (signup, footer
              links) as well as from within the app */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />

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
            path="/choose-interests"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteFallback />}>
                  <ChooseInterests />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteFallback />}>
                  <Home />
                </Suspense>
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
              user ? (
                <ProtectedRoute>
                  <Explore />
                </ProtectedRoute>
              ) : (
                <PublicExplore />
              )
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

          {/* A single post's own detail view, linkable from anywhere
              that only knows the post's id (notifications, etc.).
              Public for anonymous visitors (plan §4.1) via a separate
              read-only page — PostView/PostByIdModal assume a live
              session throughout, so they stay the logged-in path. */}
          <Route
            path="/post/:id"
            element={
              user ? (
                <ProtectedRoute>
                  <PostView />
                </ProtectedRoute>
              ) : (
                <PublicPostView />
              )
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

          {/* Public — canonical username profile URL (SEO plan §4.1).
              Not wrapped in ProtectedRoute: PublicProfile fetches via the
              public API and degrades to login prompts for interactive
              actions on its own. */}
          <Route path="/u/:username" element={<PublicProfile />} />

          <Route
            path="/hashtag/:tag"
            element={
              user ? (
                <ProtectedRoute>
                  <Hashtag />
                </ProtectedRoute>
              ) : (
                <PublicHashtag />
              )
            }
          />

          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <Bookmarks />
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
            path="/settings/sessions"
            element={
              <ProtectedRoute>
                <SecuritySessions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/moderation"
            element={
              <ProtectedRoute requireRole={["moderator", "admin"]}>
                <ModerationQueue />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireRole={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit-log"
            element={
              <ProtectedRoute requireRole={["moderator", "admin"]} requirePermission="view_audit_log">
                <AdminAuditLog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/broadcast"
            element={
              <ProtectedRoute requireRole={["moderator", "admin"]} requirePermission="send_broadcasts">
                <AdminBroadcast />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/promotions"
            element={
              <ProtectedRoute requireRole={["moderator", "admin"]}>
                <AdminPromotions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/more"
            element={
              <ProtectedRoute>
                <More />
              </ProtectedRoute>
            }
          />

          <Route
            path="/creator-dashboard"
            element={
              <ProtectedRoute requireCreator>
                <CreatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scheduled-posts"
            element={
              <ProtectedRoute requireScheduling>
                <ScheduledPosts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/paystack-return"
            element={
              <ProtectedRoute>
                <PaystackReturnHandler />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-promotions"
            element={
              <ProtectedRoute>
                <MyPromotions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignManager />
              </ProtectedRoute>
            }
          />

          <Route
            path="/creator-earnings"
            element={
              <ProtectedRoute>
                <CreatorEarnings />
              </ProtectedRoute>
            }
          />

          {/* Public — brands and viewers can view a creator's media kit */}
          <Route path="/media-kit/:creatorId" element={<MediaKit />} />

          {/* Public — static FAQ content, no auth dependency */}
          <Route path="/help" element={<HelpSupport />} />

          {/* Public — tiers & benefits, readable by anyone deciding whether
              to sign up, not just logged-in users. Explains all badge
              types (not just the visitor's own). */}
          <Route path="/tiers" element={<Tiers />} />

          {/* Catch-all — must stay last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {user && user.username && (
        <>
          <InstallPrompt />
          <UpdateToast />
        </>
      )}
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
