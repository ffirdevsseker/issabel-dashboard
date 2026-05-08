import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Dashboard from "@/pages/agent/Dashboard";
import Calls from "@/pages/agent/Calls";
import Settings from "@/pages/agent/Settings";
import ActiveCalls from "@/pages/agent/ActiveCalls";
import Performance from "@/pages/agent/Performance";
import KnowledgeBase from "@/pages/agent/KnowledgeBase";
import OperationalTools from "@/pages/agent/OperationalTools";
import Layout from "@/pages/agent/Layout";
import AdminLayout from "@/pages/admin/Layout";
import AdminOverview from "@/pages/admin/Overview";
import PersonnelPage from "@/pages/admin/Personnel";
import PersonnelDetailPage from "@/pages/admin/PersonnelDetail";


import SupervisorLayout from "@/pages/supervisor/Layout";
import SupervisorOverview from "@/pages/supervisor/Overview";
import TeamMonitor from "@/pages/supervisor/TeamMonitor";
import SupervisorShifts from "@/pages/supervisor/Shifts";
import SupervisorBreaks from "@/pages/supervisor/Breaks";
import SupervisorApprovals from "@/pages/supervisor/Approvals";
import SupervisorGamification from "@/pages/supervisor/Gamification";
import SupervisorReports from "@/pages/supervisor/Reports";
import SupervisorSettings from "@/pages/supervisor/Settings";

import UniversalDashboard from "@/pages/UniversalDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <CallProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* ── AGENT / PERSONEL rotaları (agent Layout içinde) ── */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<UniversalDashboard />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/active-calls" element={<ActiveCalls />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/operational" element={<OperationalTools />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* ── SUPERVIZOR rotası ── */}
          <Route
            path="/supervisor"
            element={
              <ProtectedRoute requireSupervisor>
                <SupervisorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SupervisorOverview />} />
            <Route path="team" element={<TeamMonitor />} />
            <Route path="shifts" element={<SupervisorShifts />} />
            <Route path="breaks" element={<SupervisorBreaks />} />
            <Route path="approvals" element={<SupervisorApprovals />} />
            <Route path="gamification" element={<SupervisorGamification />} />
            <Route path="reports" element={<SupervisorReports />} />
            <Route path="settings" element={<SupervisorSettings />} />
          </Route>

          {/* ── ADMIN rotaları (kendi layout'u) ── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index                element={<AdminOverview />} />
            <Route path="personnel"     element={<PersonnelPage />} />
            <Route path="personnel/:id" element={<PersonnelDetailPage />} />
          </Route>
        </Routes>
      </CallProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}