import { useState } from "react";
import { Calendar, BarChart3, MessageSquare } from "lucide-react";
import WeeklyCalendar from "./shifts/WeeklyCalendar";
import MonthlyPlanning from "./shifts/MonthlyPlanning";
import RequestsTab from "./shifts/RequestsTab";
import useShiftsStore from "./shifts/useShiftsStore";

const TABS = [
  { id: "takvim",   label: "Haftalık Takvim", icon: Calendar },
  { id: "planlama", label: "Aylık Planlama",  icon: BarChart3 },
  { id: "talepler", label: "Talepler",        icon: MessageSquare },
];

const TODAY = new Date().toLocaleDateString("tr-TR", {
  day: "numeric", month: "long", year: "numeric",
});

export default function SupervisorShifts() {
  const [activeTab, setActiveTab] = useState("takvim");
  const store = useShiftsStore();

  // pendingCount → gerçek API verisi
  const pendingCount = store.pendingRequests.length;

  // draftCount → weekShifts içindeki draft=true kayıtları
  const draftCount = Object.values(store.weekShifts).filter(
    (v) => v?.durum === "taslak" || v?._draft === true
  ).length;

  return (
    <div style={{
      padding: "20px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      fontFamily: "Inter, -apple-system, sans-serif",
      boxSizing: "border-box",
    }}>
      {/* Global animations */}
      <style>{`
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        @keyframes slideRight {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(3px); opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Global error banner */}
      {store.error && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
          padding: "10px 16px", fontSize: 13, color: "#991B1B", fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          ⚠ {store.error}
          <button
            onClick={() => store.setCurrentWeekStart && store.loadWeek(store.currentWeekStart)}
            style={{ border: "none", background: "none", color: "#991B1B", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
          >
            Yenile
          </button>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Vardiya Yönetimi</h1>
          {activeTab === "takvim" && (
            <span style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              {TODAY}
            </span>
          )}
          {activeTab === "talepler" && pendingCount > 0 && (
            <span style={{ background: "#DC2626", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              {pendingCount} Bekleyen
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 4, gap: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: isActive ? "#EFF6FF" : "transparent",
                  color: isActive ? "#2563EB" : "#64748B",
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", transition: "all 0.2s",
                  position: "relative",
                }}
              >
                <Icon size={14} />
                {tab.label}
                {tab.id === "talepler" && pendingCount > 0 && (
                  <span style={{ background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "0px 5px", minWidth: 16, textAlign: "center" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "takvim" && (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <WeeklyCalendar store={store} draftCount={draftCount} />
          </div>
        )}
        {activeTab === "planlama" && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <MonthlyPlanning store={store} />
          </div>
        )}
        {activeTab === "talepler" && (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <RequestsTab
              pendingRequests={store.pendingRequests}
              loadingRequests={store.loadingRequests}
              submitOpinion={store.submitOpinion}
              loadPendingRequests={store.loadPendingRequests}
            />
          </div>
        )}
      </div>
    </div>
  );
}
