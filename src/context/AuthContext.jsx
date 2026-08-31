import { useCallback, useEffect, useState } from "react";

import api from "../services/api";
import { AuthContext } from "./authContextObject";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // REGISTER
  const register = async (userData) => {
    const res = await api.post("/auth/register", userData);

    // register now only sends OTP; do not set user here
    return res.data;
  };

  // LOGIN
  const login = async (userData) => {
    const res = await api.post("/auth/login", userData);

    setUser(res.data);
  };

  // LOGOUT
  const logout = async () => {
    await api.post("/auth/logout");

    api.clearCache();
    setUser(null);
  };

  // UPDATE USER (for profile pic sync)
  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  // GET CURRENT USER
  const getMe = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");

      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens inside the async fn, not synchronously here
    getMe();
  }, [getMe]);

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
