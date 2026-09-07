import { useCallback, useEffect, useRef, useState } from "react";

import api from "../services/api";
import { AuthContext } from "./authContextObject";

// Unique key per-browser that links the localStorage snapshot to the
// cookie session. Stored as a plain string; regenerated on every login
// so a leftover cache entry from a previous account is never trusted.
const SESSION_TAG_KEY = "tronites_session_tag";

const generateSessionTag = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// Key used to persist the last-known user snapshot in localStorage.
// This is NOT a security credential — cookies handle auth. It is only
// used so the UI can render the correct shell (avatar, username, etc.)
// instantly on reload/reopen and stay there when the network is down,
// instead of blanking out and redirecting to /login every time the
// short-lived access token has expired and the device is momentarily
// offline or the server is slow.
const USER_CACHE_KEY = "tronites_user_cache";

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate that the cache belongs to the current cookie session.
    // If the session tag is missing or mismatched (e.g. the user logged
    // into a different account on this browser), discard the snapshot so
    // we never render the wrong account's data on reopen.
    const storedTag = localStorage.getItem(SESSION_TAG_KEY);
    if (!storedTag || parsed.__sessionTag !== storedTag) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    if (user) {
      // Attach the current session tag to the snapshot so readCachedUser
      // can detect a stale entry from a previous account on reopen.
      const tag = localStorage.getItem(SESSION_TAG_KEY) || generateSessionTag();
      localStorage.setItem(SESSION_TAG_KEY, tag);
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ ...user, __sessionTag: tag }));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(SESSION_TAG_KEY);
    }
  } catch {
    // quota exceeded or private-browsing restriction — silently ignore
  }
};

// Returns true for errors that definitely mean "no valid session" rather
// than "network is down / server is temporarily unavailable".
// Only a 401 from the server itself is authoritative evidence that the
// refresh token is gone; everything else (network error, timeout, 5xx)
// could be transient, so we keep the cached user in those cases.
const isAuthError = (error) => {
  const status = error?.response?.status;
  return status === 401;
};

export const AuthProvider = ({ children }) => {
  // Seed from cache immediately so the app never flashes the login page
  // on a warm reload when the user is legitimately logged in.
  const [user, setUser] = useState(() => readCachedUser());
  // loading starts true only when there is NO cached user — if we have
  // a snapshot the SplashScreen should not block rendering while we
  // silently validate it in the background.
  const [loading, setLoading] = useState(() => !readCachedUser());

  // Track whether the silent background validation has been attempted
  // at least once so we don't keep re-running it on every render.
  const validatedRef = useRef(false);

  // Callback registered by AppContent (which has useNavigate) so
  // AuthContext can push to /login after logout or force-logout without
  // importing useNavigate itself (requires being inside a Router).
  const navigateToLoginRef = useRef(null);
  const registerNavigateToLogin = useCallback((fn) => {
    navigateToLoginRef.current = fn;
  }, []);

  const setAndCacheUser = useCallback((u) => {
    setUser(u);
    writeCachedUser(u);
  }, []);

  // REGISTER
  const register = async (userData) => {
    const res = await api.post("/auth/register", userData);
    return res.data;
  };

  // LOGIN — generate a fresh session tag before caching so any snapshot
  // from a previously logged-in account is invalidated on next reopen.
  const login = async (userData) => {
    // Clear stale cache + old session tag first so a failed/partial login
    // never leaves a mismatched tag in place.
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(SESSION_TAG_KEY);
    const newTag = generateSessionTag();
    localStorage.setItem(SESSION_TAG_KEY, newTag);
    api.clearCache();
    const res = await api.post("/auth/login", userData);
    setAndCacheUser(res.data);
  };

  // LOGOUT — clears both the in-memory state AND the persisted snapshot,
  // then explicitly navigates to /login so the UI never ends up on a
  // blank shell waiting for ProtectedRoute to declaratively redirect.
  const logout = async () => {
    await api.post("/auth/logout");
    api.clearCache();
    setAndCacheUser(null);
    navigateToLoginRef.current?.("/login");
  };

  // UPDATE USER (profile pic sync, etc.)
  const updateUser = (updates) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updates } : updates;
      writeCachedUser(next);
      return next;
    });
  };

  // GET CURRENT USER — validates the session server-side.
  // Behaviour depends on whether we already have a cached user:
  //   • No cache  → blocking (sets loading=true, shows SplashScreen)
  //   • Has cache → silent (leaves the cached user in place on failure
  //                 unless the server explicitly returns 401)
  const getMe = useCallback(
    async ({ silent = false, skipRefresh = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.get("/auth/me", {
          // On a genuine cold start (no cached user) a 401 here is the
          // server just telling us "not logged in" — nothing to refresh.
          // Setting skipAuthRefresh stops the response interceptor from
          // also firing a pointless POST /auth/refresh (and logging its
          // own 401) for a visitor who never had a session.
          skipAuthRefresh: skipRefresh,
        });
        setAndCacheUser(res.data);
      } catch (err) {
        if (isAuthError(err)) {
          // Server said "no valid session" — clear everything.
          setAndCacheUser(null);
        }
        // For any other error (offline, timeout, 5xx) — if we have a
        // cached user keep them; if not, leave user as null (the app
        // will redirect to /login as expected for a truly unauthenticated
        // cold start).
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [setAndCacheUser],
  );

  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    const cached = readCachedUser();
    if (cached) {
      // We already seeded `user` from cache in useState — validate
      // silently in the background so the UI is already visible.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is inside the async getMe fn, not synchronously in this effect body
      getMe({ silent: true });
    } else {
      // No snapshot at all — must block until we know auth status. There
      // is nothing to refresh here: without a cached session this is a
      // genuine cold start, so don't let the interceptor attempt (and log)
      // a refresh on the expected 401.
      getMe({ silent: false, skipRefresh: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // api.js dispatches this custom event when /auth/refresh returns 403
  // (account banned/suspended mid-session). Clear cached state so the
  // UI lands on the login screen instead of limping in a broken
  // half-authenticated state.
  useEffect(() => {
    const handleForceLogout = () => {
      api.clearCache();
      setAndCacheUser(null);
      navigateToLoginRef.current?.("/login");
    };
    window.addEventListener("auth:forceLogout", handleForceLogout);
    return () => {
      window.removeEventListener("auth:forceLogout", handleForceLogout);
    };
  }, [setAndCacheUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        getMe,
        register,
        login,
        logout,
        updateUser,
        registerNavigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
