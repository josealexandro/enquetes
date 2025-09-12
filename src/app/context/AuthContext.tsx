"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: { uid: string; email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a logged-in user (e.g., from localStorage or a token)
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Simulate Firebase login
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (email === "test@example.com" && password === "password") {
      const mockUser = { uid: "mock-uid-123", email };
      setUser(mockUser);
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
    } else {
      throw new Error("Email ou senha incorretos.");
    }
    setLoading(false);
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    // Simulate Firebase signup
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (email === "new@example.com" && password === "newpassword") {
      const mockUser = { uid: "mock-uid-new", email };
      setUser(mockUser);
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
    } else {
      throw new Error("Erro ao cadastrar. Tente novamente.");
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    // Simulate Firebase logout
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUser(null);
    localStorage.removeItem("currentUser");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
