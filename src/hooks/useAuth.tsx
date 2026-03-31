import { useState, useEffect, createContext, useContext } from "react";
import { apiRequest, setAuthToken } from "@/lib/apiClient";

type AuthUser = {
  id: string;
  email: string;
};

interface AuthContextType {
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<{ user: AuthUser } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ data: { user: AuthUser } }>("/api/auth/me")
      .then((response) => {
        setSession({ user: response.data.user });
      })
      .catch(() => {
        setAuthToken(null);
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await apiRequest<{ data: { token: string; user: AuthUser } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.data.token);
    setSession({ user: response.data.user });
  };

  const signUp = async (email: string, password: string) => {
    const response = await apiRequest<{ data: { token: string; user: AuthUser } }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.data.token);
    setSession({ user: response.data.user });
  };

  const signOut = async () => {
    setAuthToken(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
