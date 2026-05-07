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
  getOverview: () => api.get("/admin/overview"),
  getUsers: () => api.get("/admin/users"),
  getTeams: () => api.get("/admin/teams"),
  getDepartments: () => api.get("/admin/departments"),
  getAudit: (limit = 100) => api.get(`/admin/audit?limit=${limit}`),
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

export const authApi = {
  getDashboardLayout: () => api.get("/auth/dashboard-layout"),
};

export default api;