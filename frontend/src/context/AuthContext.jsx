import { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Sayfa yenilendiğinde veya giriş yapıldığında token varsa kullanıcıyı yükle
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      // Token değiştiğinde loading=true yaparak ProtectedRoute'un erken
      // /login'e yönlendirmesini engelle
      setLoading(true);
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch {
        // Token geçersizse temizle
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = async (username, password, selectedRole) => {
    const res = await api.post("/auth/login", {
      username: username.trim(),
      password,
      selected_role: selectedRole,
    });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    // Yönlendirme, /auth/me tamamlandıktan sonra Login.jsx useEffect'i tarafından yapılır
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}