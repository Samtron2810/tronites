import { createContext, useContext, useEffect, useState } from "react";

import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // REGISTER
  const register = async (userData) => {
    const res = await api.post("/auth/register", userData);

    setUser(res.data);
  };

  // LOGIN
  const login = async (userData) => {
    const res = await api.post("/auth/login", userData);

    setUser(res.data);
  };

  // LOGOUT
  const logout = async () => {
    await api.post("/auth/logout");

    setUser(null);
  };

  // UPDATE USER (for profile pic sync)
  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  // GET CURRENT USER
  const getMe = async () => {
    try {
      const res = await api.get("/auth/me");

      setUser(res.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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

export const useAuth = () => useContext(AuthContext);
