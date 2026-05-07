import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";

export default function SupervisorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0d1b2a 0%, #132334 45%, #0f2336 100%)",
      }}
    >
      {/* Kart */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1.5rem",
          padding: "3rem 3.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 8px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* İkon */}
        <div
          style={{
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.25)",
            borderRadius: "1rem",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck style={{ width: "2.5rem", height: "2.5rem", color: "#34d399" }} />
        </div>

        {/* Başlık */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              color: "#fff",
              fontSize: "1.6rem",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Süpervizör Paneli
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            Hoş geldiniz,{" "}
            <span style={{ color: "#34d399", fontWeight: 600 }}>
              {user?.full_name || user?.username}
            </span>
          </p>
        </div>

        {/* Bilgi */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>
            Bu alan süpervizör rolü için hazırlanmaktadır.
            <br />
            Yakında özellikler eklenecek.
          </p>
        </div>

        {/* Çıkış butonu */}
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "0.75rem",
            color: "#f87171",
            fontSize: "0.875rem",
            fontWeight: 600,
            padding: "0.65rem 1.5rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
          }}
        >
          <LogOut style={{ width: "1rem", height: "1rem" }} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
