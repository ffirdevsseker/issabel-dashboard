import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

// Her istekte localStorage'daki token'ı otomatik ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token süresi dolmuş/geçersizse otomatik logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Sadece login sayfasında değilsek yönlendir
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// CDR endpoint'leri
export const cdrApi = {
  getRecent: (limit = 50) => api.get(`/cdr/recent?limit=${limit}`),
  getStats: () => api.get("/cdr/stats"),
};

export const supervisorApi = {
  getBreaks: () => api.get("/supervisor/breaks/"),
  getActiveBreaks: () => api.get("/supervisor/breaks/active"),
  decideBreak: (id, payload) => api.post(`/supervisor/breaks/${id}/decide`, payload),
  getBreakRules: () => api.get("/supervisor/breaks/rules"),
  getShifts: (start, end) => api.get(`/supervisor/shifts/?start=${start}&end=${end}`),
  getTeam: () => api.get("/supervisor/shifts/team"),
  getApprovalSummary: () => api.get("/supervisor/approvals/summary"),
  getGamification: () => api.get("/gamification/leaderboard"),
  getReports: () => api.get("/reports/summary"),
};

export const agentApi = {
  getKbArticles: () => api.get("/kb/articles"),
};

export const adminApi = {
  getOverview:    () => api.get("/admin/overview"),
  getUsers:       () => api.get("/admin/users"),
  getTeams:       () => api.get("/admin/teams"),
  getDepartments: () => api.get("/admin/departments"),
  getAudit:       (limit = 100) => api.get(`/admin/audit?limit=${limit}`),
};

/* ─── Admin · Operasyon Komuta Merkezi ────────────────────────────────────────
   Endpoint prefix: /admin/operations                                            */
export const operationsApi = {
  getSummary:        ()      => api.get("/admin/operations/summary"),
  getSupervisors:    ()      => api.get("/admin/operations/supervisors"),
  getTeamComparison: ()      => api.get("/admin/operations/team-comparison"),
  getCrisisRadar:    (limit) => api.get("/admin/operations/crisis-radar", { params: { limit } }),
  getAuditLogs:      (params)=> api.get("/admin/operations/audit-logs", { params }),
  sendTalimat:       (body)  => api.post("/admin/operations/talimat", body),
  overridePending:   (body)  => api.post("/admin/operations/override-pending", body),
  flagTraining:      (body)  => api.post("/admin/operations/training-flag", body),
};

/* ─── Admin · Personel V3 ─────────────────────────────────────────────────────
   Endpoint prefix: /admin/personnel  (backend personnel.py — V3 Komuta Modeli)
   Master Liste + Konsolide Detay + Override aksiyonları (audit'li).            */
export const personnelApi = {
  // Master sayfa
  getFilters:    ()       => api.get("/admin/personnel/filters"),
  getStats:      ()       => api.get("/admin/personnel/stats"),
  getList:       (params) => api.get("/admin/personnel", { params }),

  // Detay (4 sekme verisi tek istekte)
  getDetails:    (id)     => api.get(`/admin/personnel/${id}/details`),

  // Override aksiyonları (audit log zorunlu)
  endBreakOverride: (body) => api.post("/admin/personnel/override/end-break", body),
  manualXp:         (body) => api.post("/admin/personnel/override/manual-xp", body),
};

export const dashboardApi = {
  getHeaderStats:   () => api.get("/dashboard/header-stats"),
  getSummary:       () => api.get("/dashboard/summary"),
  getQueueStatus:   () => api.get("/dashboard/queue-status"),
  getAgentStatus:   () => api.get("/dashboard/agent-status"),
  getAlarms:        () => api.get("/dashboard/alarms"),
  getMetrics:       () => api.get("/dashboard/system-metrics"),
  getAgents:        () => api.get("/dashboard/agents"),
  getQueueLive:     () => api.get("/dashboard/queue-live"),
  getAiFeed:        () => api.get("/dashboard/ai-feed"),
  getIssues:        () => api.get("/dashboard/issues"),
  getTrafficHourly: () => api.get("/dashboard/traffic-hourly"),
  endBreak:         (userId) => api.post("/dashboard/actions/end-break", { user_id: userId }),
};

export const overviewApi = {
  getCommand:    ()              => api.get("/admin/overview/command"),
  getHourly:     ()              => api.get("/admin/overview/hourly"),
  getMissedCalls: (limit = 20)  => api.get("/admin/overview/missed-calls", { params: { limit } }),
};

export const headerApi = {
  getLive:           ()             => api.get("/admin/header/live"),
  getCriticalAlerts: (limit = 20)   => api.get("/admin/header/critical-alerts", { params: { limit } }),
  search:            (q, limit = 5) => api.get("/admin/header/search", { params: { q, limit } }),
};

/* ─── Admin · Canlı Operasyon War Room ────────────────────────────────────────
   Endpoint prefix: /admin/war-room                                             */
export const warRoomApi = {
  getActiveCalls:  ()               => api.get("/admin/war-room/active-calls"),
  getQueues:       ()               => api.get("/admin/war-room/queues"),
  getStaff:        ()               => api.get("/admin/war-room/staff"),
  callAction:      (callId, body)   => api.post(`/admin/war-room/action/${callId}`, body),
  updateCapacity:  (queueId, cap)   => api.patch(`/admin/war-room/queues/${queueId}/capacity`, { max_kapasite: cap }),
};

/* ─── Staff · Personel Yönetim Merkezi ────────────────────────────────────────
   Endpoint prefix: /staff  (Müşteri Hizmetleri – light theme sayfası)          */
export const staffApi = {
  getMatrix:     ()          => api.get("/staff/matrix"),
  getAttendance: (week)      => api.get("/staff/attendance", { params: { week: week ?? "current" } }),
  updateRole:    (id, body)  => api.put(`/staff/${id}/role`, body),
};

export const authApi = {
  getDashboardLayout: () => api.get("/auth/dashboard-layout"),
};

export default api;