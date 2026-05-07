import { useEffect, useState } from "react";
import { authApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";

// Bileşen haritası - Backend'den gelen bilesen_adi ile gerçek React bileşenlerini eşleştirir
import Dashboard from "./agent/Dashboard";
// import AdminOverview from "./admin/Overview"; // Örnek
// import TeamMonitor from "./supervisor/TeamMonitor"; // Örnek

const COMPONENT_MAP = {
  "KPIOverview": Dashboard, // Şimdilik basitleştirmek için Dashboard'u kullanıyoruz
  "QueueWidget": Dashboard,
  "TeamMonitor": Dashboard,
  "ActiveCalls": Dashboard,
  "RecentCalls": Dashboard,
  // İleride parçalanmış küçük bileşenler buraya eklenecek
};

export default function UniversalDashboard() {
  const { user } = useAuth();
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await authApi.getDashboardLayout();
        setLayout(res.data);
      } catch (err) {
        console.error("Layout fetch error:", err);
        setError("Dashboard yerleşimi yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Dashboard hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 text-red-700">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-bold">Hata Oluştu</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {user?.role === "admin" ? "Yönetici Paneli" : user?.role === "supervisor" ? "Süpervizör Paneli" : "Personel Paneli"}
        </h1>
        <p className="text-slate-500 text-sm">Veritabanından yapılandırılmış dinamik dashboard.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layout?.modules.map((mod) => {
          const Component = COMPONENT_MAP[mod.component] || null;
          if (!Component) return null;

          return (
            <div key={mod.id} className="min-h-[200px]">
               {/* Gerçek uygulamada burada modüller tek tek render edilir */}
               {/* Şimdilik sadece hangi modülün geldiğini gösteriyoruz */}
               <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700">{mod.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">Modül</span>
                  </div>
                  <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center border border-dashed border-slate-200">
                     <p className="text-xs text-slate-400 italic">{mod.component} Bileşeni Buraya Gelecek</p>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
      
      {/* Fallback as regular dashboard for now to keep functionality */}
      <div className="mt-8 pt-8 border-t border-slate-200">
         <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest font-bold">Tam Görünüm (Önizleme)</p>
         <Dashboard />
      </div>
    </div>
  );
}
