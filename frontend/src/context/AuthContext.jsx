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
      // Token varsa önce önbellekteki kullanıcıyı göster (spinner'ı gizle),
      // arkaplanda /auth/me ile doğrula — sekmeden dönünce 10sn spinner görmezsin
      const cached = localStorage.getItem("user_cache");
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
        setLoading(false);  // spinner'ı hemen kaldır
      } else {
        setLoading(true);   // ilk girişte spinner göster
      }
      try {
        const res = await api.get("/auth/me", { timeout: 5000 });
        setUser(res.data);
        localStorage.setItem("user_cache", JSON.stringify(res.data));
      } catch {
        // Token geçersizse / ağ hatası: önbelleği ve token'ı temizle
        localStorage.removeItem("token");
        localStorage.removeItem("user_cache");
        setToken(null);
        setUser(null);
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
    localStorage.removeItem("user_cache");
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