import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const response = await api.get("/api/auth/me");
        const nextUser = response.data.user;
        setUser(nextUser);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } catch (_err) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadUser();
  }, []);

  const signup = async ({ name, email, password, role }) => {
    const response = await api.post("/api/auth/signup", { name, email, password, role });
    return response.data;
  };

  const login = async ({ email, password }) => {
    const response = await api.post("/api/auth/login", { email, password });
    const token = response.data.access_token;
    const nextUser = response.data.user;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      signup,
      login,
      logout,
    }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
