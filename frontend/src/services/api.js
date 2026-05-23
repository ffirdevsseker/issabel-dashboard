import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  getStats: (today = false) => api.get(`/cdr/stats${today ? "?today=true" : ""}`),
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
  getKbArticles:   ()              => api.get("/kb/articles"),
  getTodayStats:   ()              => api.get("/agent/stats/today"),
  getPriorities:   ()              => api.get("/agent/priorities"),
  getCallbackList: ()              => api.get("/agent/callbacks"),
  trackCallback:   (id, durum)     => api.post(`/agent/callbacks/${id}/track`, { durum }),
  getDirectory:    ()              => api.get("/agent/directory"),
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

  // Kullanıcı yönetimi
  create:         (data)     => api.post("/admin/personnel", data),
  update:         (id, data) => api.patch(`/admin/personnel/${id}`, data),
  resetPassword:  (id, data) => api.patch(`/admin/personnel/${id}/reset-password`, data),
  lock:           (id, data) => api.patch(`/admin/personnel/${id}/lock`, data),
  softDelete:     (id)       => api.delete(`/admin/personnel/${id}`),

  // Haftalık devam panosu
  getAttendance:  (weekOffset = 0) => api.get("/admin/personnel/attendance", { params: { week_offset: weekOffset } }),
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
  getActiveCalls:   ()               => api.get("/admin/war-room/active-calls"),
  getQueues:        ()               => api.get("/admin/war-room/queues"),
  getStaff:         ()               => api.get("/admin/war-room/staff"),
  callAction:       (callId, body)   => api.post(`/admin/war-room/action/${callId}`, body),
  updateCapacity:   (queueId, cap)   => api.patch(`/admin/war-room/queues/${queueId}/capacity`, { max_kapasite: cap }),
  toggleQueue:      (queueId)        => api.patch(`/admin/war-room/queues/${queueId}/toggle`),
  endBreak:         (userId)         => api.post(`/admin/war-room/actions/end-break/${userId}`),
  sendInstruction:  (aliciId, icerik)=> api.post("/admin/war-room/actions/send-instruction", { alici_id: aliciId, icerik }),
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

/* ─── Admin · Otomasyon Kuralları ─────────────────────────────────────────────
   Endpoint prefix: /admin/rules  (rules.py)                                   */
export const rulesApi = {
  getAll:  ()            => api.get("/admin/rules"),
  create:  (data)        => api.post("/admin/rules", data),
  update:  (id, data)    => api.put(`/admin/rules/${id}`, data),
  toggle:  (id, data)    => api.patch(`/admin/rules/${id}/toggle`, data),
  delete:  (id)          => api.delete(`/admin/rules/${id}`),

  // Sprint 7-C — Kural tetiklenme geçmişi (kural_tetiklenmeleri tablosu)
  getRecentHistory: (limit = 50)        => api.get("/admin/rules/history", { params: { limit } }),
  getHistory:       (id, limit = 20)    => api.get(`/admin/rules/${id}/history`, { params: { limit } }),
};

/* ─── Admin · Sistem Sağlığı & AI İçgörüler ──────────────────────────────────
   Endpoint prefix: /admin/system  (system_health.py)                          */
export const systemHealthApi = {
  getInsights: (signal) => api.get("/admin/system/ai-insights", { signal }),
};

/* ─── Admin · Şikayet Yönetimi ────────────────────────────────────────────────
   Backend kaynakları:
     · /approvals/complaints                (approvals.py — list_complaints)
     · /approvals/complaints/{id}/decide    (karar query param: "onayla"|"reddet") */
export const adminOpsApi = {
  // params: { durum?: "olusturuldu" | "supervisor_inceleme" | "onaylandi" | "reddedildi" }
  getComplaints: (params) => api.get("/supervisor/approvals/complaints", { params }),

  // karar: "onayla" → durum=onaylandi · diğer her şey → reddedildi (backend kontratı)
  decideComplaint: (id, karar, gerekce = "") =>
    api.post(`/supervisor/approvals/complaints/${id}/decide`, null, {
      params: { karar, gerekce },
    }),

  // Geriye uyumluluk — yeni kodda gamificationApi.getLeaderboard tercih edilmeli
  getLeaderboard: () => api.get("/gamification/leaderboard"),
};

/* ─── Admin · Gamification Merkezi ────────────────────────────────────────────
   Backend prefix: /admin/gamification (admin/gamification.py)                    */
export const gamificationApi = {
  // Leaderboard (genel — supervisor da kullanır)
  getLeaderboard: () => api.get("/gamification/leaderboard"),

  // Özet kartlar: toplam_personel, toplam_xp, bu_ay_xp, bu_ay_lider
  getStats:       () => api.get("/admin/gamification/stats"),

  // XP hareket logları
  // params: { personel_id?, kategori?, from_date?, to_date?, page?, limit? }
  getXpLogs:      (params) => api.get("/admin/gamification/xp-logs", { params }),

  // XP Kuralları CRUD
  getXpRules:     ()           => api.get("/admin/gamification/xp-rules"),
  createXpRule:   (body)       => api.post("/admin/gamification/xp-rules", body),
  updateXpRule:   (id, body)   => api.put(`/admin/gamification/xp-rules/${id}`, body),
  toggleXpRule:   (id, aktif)  => api.patch(`/admin/gamification/xp-rules/${id}/toggle`, { aktif }),
  deleteXpRule:   (id)         => api.delete(`/admin/gamification/xp-rules/${id}`),
};

export default api;