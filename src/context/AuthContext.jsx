import { useCallback, useEffect, useRef, useState } from "react";

import api from "../services/api";
import { AuthContext } from "./authContextObject";

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
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
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

  const setAndCacheUser = useCallback((u) => {
    setUser(u);
    writeCachedUser(u);
  }, []);

  // REGISTER
  const register = async (userData) => {
    const res = await api.post("/auth/register", userData);
    return res.data;
  };

  // LOGIN
  const login = async (userData) => {
    const res = await api.post("/auth/login", userData);
    setAndCacheUser(res.data);
  };

  // LOGOUT — clears both the in-memory state AND the persisted snapshot
  const logout = async () => {
    await api.post("/auth/logout");
    api.clearCache();
    setAndCacheUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
