import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSupervisor = false,
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    if (user.role === "supervisor") return <Navigate to="/supervisor" replace />;
    return <Navigate to="/" replace />;
  }

  if (requireSupervisor && !["admin", "supervisor"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Admin/supervisor kendi panellerine, bt personel dashboard'una yönlendirilsin
  if (!requireAdmin && !requireSupervisor) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "supervisor") return <Navigate to="/supervisor" replace />;
    // bt rolü: personel dashboard'unu kullanır (kendi layout'u hazır olana dek)
  }

  return children;
}