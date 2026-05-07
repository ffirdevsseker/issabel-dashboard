import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BellRing, CheckCircle2,
  Clock, Cpu, HardDrive, Phone, PhoneIncoming, PhoneMissed,
  RefreshCw, Search, Star, Users, Wifi, XCircle,
} from "lucide-react";
import { dashboardApi } from "@/services/api";

const POLL_MS = 30_000;

// ─── Küçük yardımcılar ────────────────────────────────────────────────────────

function fmt(n, suffix = "") {
  if (n == null || n === "") return "—";
  return `${n}${suffix}`;
}

function fmtTime(sec) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}d ${s}s` : `${s}s`;
}

// ─── Durum badge ──────────────────────────────────────────────────────────────

const DURUM_MAP = {
  aktif:   { bg: "#dcfce7", text: "#15803d", dot: "#22c55e", label: "Aktif"   },
  mesgul:  { bg: "#fef9c3", text: "#a16207", dot: "#eab308", label: "Meşgul"  },
  mola:    { bg: "#f3e8ff", text: "#7e22ce", dot: "#a855f7", label: "Mola"    },
  offline: { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: "Offline" },
};

function StatusBadge({ durum }) {
  const s = DURUM_MAP[durum] || DURUM_MAP.offline;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.text,
      borderRadius: 999, padding: "2px 9px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: s.dot, flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 80, r = 14 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "skeletonSlide 1.4s ease infinite",
    }} />
  );
}

// ─── İstatistik kartı ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }) {
  const palette = {
    blue:    { bg: "#eff6ff", icon: "#3b82f6", val: "#1e40af" },
    green:   { bg: "#f0fdf4", icon: "#22c55e", val: "#166534" },
    emerald: { bg: "#ecfdf5", icon: "#10b981", val: "#065f46" },
    red:     { bg: "#fef2f2", icon: "#ef4444", val: "#991b1b" },
    amber:   { bg: "#fffbeb", icon: "#f59e0b", val: "#92400e" },
    purple:  { bg: "#faf5ff", icon: "#a855f7", val: "#6b21a8" },
  };
  const c = palette[color] || palette.blue;
  return (
    <div style={{
      background: c.bg, borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.06)",
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(255,255,255,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <Icon size={18} color={c.icon} strokeWidth={2} />
      </div>
      <div style={{ color: c.val, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      <div>
        <div style={{ color: "#374151", fontSize: 12, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Sistem metrikleri bandı ──────────────────────────────────────────────────

function MetricBar({ metrics, loading }) {
  if (loading) return <Skeleton h={48} r={12} />;
  const m = metrics || {};
  const chips = [
    { icon: Wifi,      label: "Aktif Kanal",  value: `${m.aktif_kanal ?? "—"} / ${m.trunk_limiti ?? "—"}` },
    { icon: Cpu,       label: "CPU",           value: `${m.cpu ?? "—"}%` },
    { icon: HardDrive, label: "RAM",           value: `${m.ram ?? "—"}%` },
    {
      icon: m.alarm_aktif ? AlertTriangle : CheckCircle2,
      label: "Alarm",
      value: m.alarm_aktif ? "Aktif" : "Normal",
      red: m.alarm_aktif,
    },
  ];
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap",
      background: "#f8fafc", borderRadius: 12,
      border: "1px solid #e2e8f0", padding: "10px 14px",
    }}>
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: c.red ? "#fef2f2" : "#fff",
            border: `1px solid ${c.red ? "#fca5a5" : "#e2e8f0"}`,
            borderRadius: 8, padding: "5px 12px",
          }}>
            <Icon size={13} color={c.red ? "#ef4444" : "#64748b"} />
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{c.label}:</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: c.red ? "#ef4444" : "#1e293b" }}>
              {c.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kuyruk kartları ─────────────────────────────────────────────────────────

function QueueCards({ queues, loading }) {
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3].map((i) => <Skeleton key={i} h={90} />)}
    </div>
  );
  if (!queues?.length) {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 24 }}>
        Kuyruk verisi yok
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {queues.map((q) => {
        const warn = q.esik_asimi_sayisi > 0;
        return (
          <div key={q.kuyruk_no} style={{
            border: `1.5px solid ${warn ? "#fca5a5" : "#e2e8f0"}`,
            borderRadius: 12,
            background: warn ? "#fef2f2" : "#fff",
            padding: "12px 14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{q.kuyruk_adi}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>#{q.kuyruk_no}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: warn ? "#ef4444" : "#1e293b", lineHeight: 1 }}>
                  {q.bekleyen_sayisi}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>bekleyen</div>
              </div>
            </div>
            <div style={{
              marginTop: 8, height: 4, borderRadius: 99,
              background: "#e2e8f0", overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min(q.doluluk_pct, 100)}%`,
                background: warn ? "#ef4444" : "#10b981",
                borderRadius: 99, transition: "width 0.5s",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Max: {fmtTime(q.max_bekleme_sn)}</span>
              {warn && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#ef4444",
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <AlertTriangle size={10} /> {q.esik_asimi_sayisi} eşik aşımı
                </span>
              )}
              <span style={{ fontSize: 10, color: "#94a3b8" }}>%{q.doluluk_pct}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Alarmlar paneli ─────────────────────────────────────────────────────────

const ALARM_ICON = { mola_asimi: Clock, trunk_limit: Wifi, sip_kopma: XCircle };

function AlarmsPanel({ alarms, loading }) {
  if (loading) return <Skeleton h={120} />;
  const shown = (alarms || []).slice(0, 5);
  if (!shown.length) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "#22c55e", fontSize: 13, fontWeight: 600, padding: "12px 0",
      }}>
        <CheckCircle2 size={16} /> Aktif alarm yok
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {shown.map((a) => {
        const Icon = ALARM_ICON[a.tip] || BellRing;
        const isHigh = a.oncelik >= 3;
        return (
          <div key={a.id} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            background: isHigh ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${isHigh ? "#fca5a5" : "#fde68a"}`,
            borderRadius: 10, padding: "10px 12px",
          }}>
            <Icon size={14} color={isHigh ? "#ef4444" : "#f59e0b"} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{a.baslik}</div>
              <div style={{
                fontSize: 11, color: "#64748b",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{a.mesaj}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Personel tablosu ─────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "ad_soyad",          label: "Ad Soyad"     },
  { key: "dahili_no",         label: "Dahili"        },
  { key: "departman_adi",     label: "Departman"     },
  { key: "anlik_durum",       label: "Durum"         },
  { key: "bugun_toplam_cagri",label: "Çağrı"         },
  { key: "bugun_ort_csat",    label: "CSAT"          },
  { key: "unvan",             label: "Unvan"         },
];

function AgentTable({ agents, loading }) {
  const [search, setSearch] = useState("");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [sortKey, setSortKey] = useState("ad_soyad");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = (agents || [])
    .filter((a) => {
      const q = search.toLowerCase();
      const match = !q || a.ad_soyad?.toLowerCase().includes(q)
        || a.dahili_no?.includes(q)
        || a.departman_adi?.toLowerCase().includes(q);
      const durumMatch = filterDurum === "tumu" || a.anlik_durum === filterDurum;
      return match && durumMatch;
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      return sortAsc
        ? String(av).localeCompare(String(bv), "tr")
        : String(bv).localeCompare(String(av), "tr");
    });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={42} r={8} />)}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={13} style={{
            position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", color: "#94a3b8",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, dahili, departman..."
            style={{
              width: "100%", height: 34, paddingLeft: 30, paddingRight: 10,
              border: "1px solid #e2e8f0", borderRadius: 8,
              fontSize: 12, color: "#374151", background: "#f8fafc",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={filterDurum}
          onChange={(e) => setFilterDurum(e.target.value)}
          style={{
            height: 34, padding: "0 10px", border: "1px solid #e2e8f0",
            borderRadius: 8, fontSize: 12, color: "#374151",
            background: "#f8fafc", cursor: "pointer", outline: "none",
          }}
        >
          <option value="tumu">Tüm Durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="mesgul">Meşgul</option>
          <option value="mola">Mola</option>
          <option value="offline">Offline</option>
        </select>
        <span style={{ fontSize: 11, color: "#94a3b8", alignSelf: "center" }}>
          {filtered.length} personel
        </span>
      </div>

      {/* Tablo */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    padding: "8px 10px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#64748b",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    cursor: "pointer", whiteSpace: "nowrap",
                    borderBottom: "2px solid #e2e8f0",
                    userSelect: "none",
                  }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: 3, opacity: 0.6 }}>
                      {sortAsc ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{
                  textAlign: "center", color: "#94a3b8",
                  fontSize: 13, padding: 24,
                }}>
                  Sonuç bulunamadı
                </td>
              </tr>
            )}
            {filtered.map((a, idx) => (
              <tr
                key={`${a.ad_soyad}-${idx}`}
                style={{
                  background: a.mola_asimi
                    ? "rgba(239,68,68,0.05)"
                    : idx % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <td style={{ padding: "9px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {a.mola_asimi && (
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#ef4444", flexShrink: 0,
                        animation: "pulse 1s ease-in-out infinite",
                      }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {a.ad_soyad}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "9px 10px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                  {a.dahili_no || "—"}
                </td>
                <td style={{ padding: "9px 10px", fontSize: 12, color: "#374151" }}>
                  {a.departman_adi || "—"}
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <StatusBadge durum={a.anlik_durum} />
                  {a.anlik_durum === "mola" && a.mola_tipi && (
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                      {a.mola_tipi} · {a.mola_sure_dk}dk
                    </div>
                  )}
                </td>
                <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 700, color: "#374151", textAlign: "center" }}>
                  {a.bugun_toplam_cagri}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                  {a.bugun_ort_csat > 0 ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 12, fontWeight: 700, color: "#f59e0b",
                    }}>
                      <Star size={11} fill="#f59e0b" color="#f59e0b" />
                      {a.bugun_ort_csat.toFixed(1)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "9px 10px", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                  {a.unvan || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────

export default function AdminOverview() {
  const [summary,  setSummary]  = useState(null);
  const [queues,   setQueues]   = useState([]);
  const [agents,   setAgents]   = useState([]);
  const [alarms,   setAlarms]   = useState([]);
  const [metrics,  setMetrics]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [error,    setError]    = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, q, a, al, m] = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getQueueStatus(),
        dashboardApi.getAgentStatus(),
        dashboardApi.getAlarms(),
        dashboardApi.getMetrics(),
      ]);
      if (s.status  === "fulfilled") setSummary(s.value.data);
      if (q.status  === "fulfilled") setQueues(q.value.data);
      if (a.status  === "fulfilled") setAgents(a.value.data);
      if (al.status === "fulfilled") setAlarms(al.value.data);
      if (m.status  === "fulfilled") setMetrics(m.value.data);
      setLastSync(new Date());
      setError(null);
    } catch {
      setError("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const sm = summary || {};

  const STATS = [
    { icon: Phone,        label: "Toplam Çağrı",      value: fmt(sm.toplam_cagri),          sub: "Bugün",              color: "blue"    },
    { icon: PhoneIncoming,label: "Cevaplanan",         value: fmt(sm.cevaplanan),            sub: "Bugün",              color: "green"   },
    { icon: Activity,     label: "Cevaplama Oranı",   value: sm.cevaplama_orani != null ? `%${sm.cevaplama_orani}` : "—", sub: "Hedef: %80+", color: "emerald" },
    { icon: PhoneMissed,  label: "Kaçan Çağrı",       value: fmt(sm.kacan),                 sub: "Bugün",              color: "red"     },
    { icon: Star,         label: "Ort. CSAT",         value: sm.ort_csat ? `${sm.ort_csat} / 5` : "—", sub: "Müşteri memnuniyeti", color: "amber" },
    { icon: Clock,        label: "Ort. Bekleme",      value: sm.ort_bekleme_sn != null ? fmtTime(sm.ort_bekleme_sn) : "—", sub: "Kuyruk süresi", color: "purple" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>

      {/* Başlık + saat */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Genel Bakış</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Çağrı merkezi anlık durumu · 30sn'de bir güncellenir
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {error && (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
              {error}
            </span>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#f1f5f9", borderRadius: 8, padding: "5px 10px",
          }}>
            <RefreshCw size={12} color="#94a3b8" />
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              {lastSync
                ? `${lastSync.toLocaleTimeString("tr-TR")}`
                : "Yükleniyor..."}
            </span>
          </div>
        </div>
      </div>

      {/* Sistem metrikleri */}
      <MetricBar metrics={metrics} loading={loading} />

      {/* İstatistik kartları */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} h={110} />)}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}>
          {STATS.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Orta bölüm: Personel tablosu + Kuyruk & Alarmlar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: 14,
        alignItems: "start",
      }}
        className="admin-grid-responsive"
      >
        {/* Sol: Personel */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Users size={15} color="#3b82f6" />
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
              Personel Durumu
            </span>
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 700,
              background: "#eff6ff", color: "#3b82f6",
              borderRadius: 999, padding: "2px 8px",
            }}>
              {agents.length} kişi
            </span>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <AgentTable agents={agents} loading={loading} />
          </div>
        </div>

        {/* Sağ: Kuyruk + Alarmlar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Kuyruk durumu */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Activity size={15} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                Kuyruk Durumu
              </span>
            </div>
            <div style={{ padding: "12px" }}>
              <QueueCards queues={queues} loading={loading} />
            </div>
          </div>

          {/* Aktif alarmlar */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <BellRing size={15} color="#f59e0b" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                Aktif Alarmlar
              </span>
              {alarms.length > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 700,
                  background: "#fef2f2", color: "#ef4444",
                  borderRadius: 999, padding: "2px 8px",
                }}>
                  {alarms.length}
                </span>
              )}
            </div>
            <div style={{ padding: "12px" }}>
              <AlarmsPanel alarms={alarms} loading={loading} />
              {alarms.length > 5 && (
                <button style={{
                  width: "100%", marginTop: 8, padding: "7px 0",
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "#f8fafc", fontSize: 12,
                  color: "#64748b", fontWeight: 600, cursor: "not-allowed",
                  opacity: 0.6,
                }}>
                  Tümünü Gör ({alarms.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Animasyon stilleri */}
      <style>{`
        @keyframes skeletonSlide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @media (max-width: 900px) {
          .admin-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
