import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Phone, PhoneMissed, Clock, Target,
  CheckSquare, Coffee, BookOpen, ChevronRight, ChevronUp, ChevronDown,
  Activity, Eye, AlertCircle, FileText, Info, PowerOff, MessageSquare, MoreVertical, UserCheck
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const INTRADAY_DATA = [
  { time: '00:00', aktif: 18, mesgul: 10, mola: 2, cevrimdisi: 1 },
  { time: '04:00', aktif: 20, mesgul: 14, mola: 5, cevrimdisi: 1 },
  { time: '08:00', aktif: 24, mesgul: 16, mola: 8, cevrimdisi: 2 },
  { time: '12:00', aktif: 26, mesgul: 15, mola: 12, cevrimdisi: 2 },
  { time: '16:00', aktif: 25, mesgul: 18, mola: 9, cevrimdisi: 1 },
  { time: '20:00', aktif: 22, mesgul: 14, mola: 4, cevrimdisi: 2 },
  { time: '24:00', aktif: 18, mesgul: 10, mola: 2, cevrimdisi: 1 },
];

const TEAM_MEMBERS = [
  { name: "Ahmet Yılmaz", status: "aktif", duration: "—", avatar: "A" },
  { name: "Ayşe Demir", status: "mesgul", duration: "03:12", avatar: "A" },
  { name: "Mehmet Kaya", status: "mola", duration: "08:45", avatar: "M" },
  { name: "Zeynep Arslan", status: "cevrimdisi", duration: "—", avatar: "Z" },
  { name: "Emre Şahin", status: "mesgul", duration: "01:07", avatar: "E" },
  { name: "Selin Akyüz", status: "aktif", duration: "—", avatar: "S" },
  { name: "Burak Kılıç", status: "mola", duration: "05:20", avatar: "B" },
];

const TEAM_STATS = {
  aktif: { count: 12, percent: 44, color: "#10b981", icon: UserCheck, label: "Aktif" },
  mesgul: { count: 8, percent: 30, color: "#3b82f6", icon: Phone, label: "Meşgul" },
  mola: { count: 4, percent: 15, color: "#f59e0b", icon: Coffee, label: "Mola" },
  cevrimdisi: { count: 3, percent: 11, color: "#64748b", icon: PowerOff, label: "Çevrimdışı" }
};

const TEAM_LIVE = [
  { name: "Ahmet Yıldız",    status: "aktif",       calls: 12, avgDur: "4:32", progress: 82 },
  { name: "Fatma Kaya",      status: "mola",        calls: 8,  avgDur: "5:10", progress: 64 },
  { name: "Mehmet Demir",    status: "aktif",       calls: 15, avgDur: "3:48", progress: 95 },
  { name: "Ayşe Çelik",      status: "cevrimdisi",  calls: 4,  avgDur: "6:22", progress: 38 },
  { name: "Ali Korkmaz",     status: "aktif",       calls: 11, avgDur: "4:05", progress: 76 },
];

const EVENTS = [
  { time: "10:42", type: "call",      text: "Ahmet Yıldız — çağrı tamamladı (4:35)", color: "#10b981" },
  { time: "10:38", type: "break",     text: "Fatma Kaya — mola talebi onaylandı", color: "#f59e0b" },
  { time: "10:35", type: "directive", text: "Admin talimatı: Vardiya güncellemesi", color: "#ef4444" },
  { time: "10:28", type: "call",      text: "Mehmet Demir — çağrı tamamladı (3:52)", color: "#10b981" },
  { time: "10:25", type: "complaint", text: "Ali Korkmaz — şikayet kaydı oluşturuldu", color: "#8b5cf6" },
  { time: "10:18", type: "call",      text: "Ayşe Çelik — çağrı tamamladı (6:10)", color: "#10b981" },
  { time: "10:10", type: "task",      text: "Ekip görevi %75 tamamlandı", color: "#3b82f6" },
  { time: "10:05", type: "break",     text: "Mehmet Demir — mola talebi bekliyor", color: "#f59e0b" },
];

const STATUS_COLORS = {
  aktif: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", text: "#059669", label: "Aktif" },
  mola: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", text: "#d97706", label: "Mola" },
  mesgul: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", text: "#2563eb", label: "Meşgul" },
  cevrimdisi: { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)", text: "#475569", label: "Çevrimdışı" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SupervisorOverview() {
  const navigate = useNavigate();
  const [directivesExpanded, setDirectivesExpanded] = useState(true);

  const kpis = [
    { label: "Toplam Çağrı", sub: "(Bugün)", value: "1.284", stat: "Düne göre", trendIcon: TrendingUp, trendVal: "%12", trendColor: "#10b981", icon: Phone, color: "#3b82f6" },
    { label: "Cevapsız Oran", sub: "(%)", value: "%6,2", stat: "Düne göre", trendIcon: TrendingDown, trendVal: "%1,1", trendColor: "#10b981", icon: PhoneMissed, color: "#a855f7" },
    { label: "Ortalama Görüşme", sub: "Süresi", value: "3dk 45sn", stat: "Düne göre", trendIcon: null, trendVal: "↔ 0:05", trendColor: "#64748b", icon: Clock, color: "#22c55e" },
    { label: "Hedef Gerçekleşme", sub: "Oranı", value: "%92", stat: "Düne göre", trendIcon: TrendingUp, trendVal: "%5", trendColor: "#10b981", icon: Target, color: "#f59e0b" },
  ];

  const pendingCounts = [
    { label: "Mola Talebi", count: 3, to: "/supervisor/breaks", icon: Coffee, color: "#f59e0b" },
    { label: "Şikayet Onayı", count: 2, to: "/supervisor/approvals", icon: CheckSquare, color: "#8b5cf6" },
    { label: "KB Önerisi", count: 1, to: "/supervisor/approvals", icon: BookOpen, color: "#3b82f6" },
  ];

  const donutData = [
    { label: "Aktif", count: 8, color: "#10b981" },
    { label: "Mola", count: 2, color: "#f59e0b" },
    { label: "Meşgul", count: 3, color: "#3b82f6" },
    { label: "Çevrimdışı", count: 1, color: "#94a3b8" },
  ];
  const total = donutData.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Admin Directives Panel ── */}
      <div style={{
        background: directivesExpanded ? "linear-gradient(to right, #fff5f5, #ffffff, #fff5f5)" : "#fff5f5",
        border: directivesExpanded ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: directivesExpanded ? "0 8px 32px rgba(239, 68, 68, 0.12)" : "0 2px 8px rgba(239, 68, 68, 0.05)",
        transition: "all 0.3s ease",
        position: "relative"
      }}>
        {/* Left Red Border Bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#ef4444" }} />

        {/* Toolbar / Header */}
        <div 
          onClick={() => setDirectivesExpanded(e => !e)}
          style={{ 
            padding: directivesExpanded ? "12px 20px" : "14px 20px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            cursor: "pointer",
            borderBottom: directivesExpanded ? "1px dashed rgba(239, 68, 68, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>!</span>
            </div>
            {!directivesExpanded ? (
              <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                3 Okunmamış Aktif Talimat
              </span>
            ) : (
              <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Aktif Talimat
              </span>
            )}
          </div>
          <button style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {directivesExpanded ? <ChevronUp style={{ width: 18, height: 18 }} /> : <ChevronDown style={{ width: 18, height: 18 }} />}
          </button>
        </div>

        {/* Expanded Content */}
        {directivesExpanded && (
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            
            {/* Left Info Stats */}
            <div style={{ flex: "0 0 160px", padding: "0 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <span style={{ color: "#dc2626", fontSize: 56, fontWeight: 900, lineHeight: 1 }}>3</span>
              <span style={{ color: "#1e293b", fontSize: 12, fontWeight: 600, marginTop: 4 }}>okunmamış talimat</span>
            </div>

            {/* Center Table */}
            <div style={{ flex: 1, minWidth: 400, padding: "0 20px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 120px", paddingBottom: 8, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span>Tarih / Saat</span>
                <span>Konu</span>
                <span style={{ textAlign: "center" }}>Öncelik</span>
                <span style={{ textAlign: "right" }}>İşlem</span>
              </div>
              
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.15)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {[
                  { id: 1, date: "16.05.2025 12:30", title: "Sistem Güncellemesi Hakkında", prio: "ACİL",  color: "#ef4444", bg: "#fef2f2" },
                  { id: 2, date: "16.05.2025 11:10", title: "Yeni Script Kullanımı", prio: "NORMAL", color: "#f97316", bg: "#fff7ed" },
                  { id: 3, date: "16.05.2025 10:45", title: "Haftalık Eğitim Duyurusu", prio: "DÜŞÜK", color: "#10b981", bg: "#f0fdf4" },
                ].map((d, i) => (
                  <div key={d.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 120px", alignItems: "center", padding: "10px 12px", borderBottom: i === 2 ? "none" : "1px solid rgba(0,0,0,0.04)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{d.date}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{d.title}</span>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: d.bg, color: d.color, fontSize: 10, fontWeight: 800 }}>{d.prio}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button style={{ background: d.color, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: `0 2px 6px ${d.color}40` }}>
                        Aç ve Uygula
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Action Block (Link) */}
            <div style={{ flex: "0 0 280px", borderLeft: "1px dashed rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "20px 24px", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => navigate("/supervisor/shifts")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText style={{ width: 22, height: 22, color: "#ef4444" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Tüm talimatları gör</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>Talimat geçmişini görüntülemek için tıklayın.</p>
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: "#94a3b8" }} />
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* ── Row 1: KPI + Pending ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 220px)) 1fr", gap: 12 }}>
        {kpis.map((k) => {
          const TrendIcon = k.trendIcon;
          return (
            <div key={k.label} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "24px 12px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: 16, minHeight: 36 }}>
                <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{k.label}</span>
                {k.sub && <span style={{ color: "#64748b", fontSize: 12, fontWeight: 500, marginTop: 2 }}>{k.sub}</span>}
              </div>
              <p style={{ color: "#0f172a", fontSize: 36, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-1px" }}>{k.value}</p>
              
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12, fontWeight: 600 }}>
                <span>{k.stat}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 3, color: k.trendColor }}>
                  {TrendIcon && <TrendIcon style={{ width: 14, height: 14, strokeWidth: 3 }} />}
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{k.trendVal}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pending panel */}
        <div style={{ background: "#fff", border: "2px solid #0f172a", borderRadius: 16, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Bekleyen Onaylar</span>
          {pendingCounts.map((p) => {
            const Icon = p.icon;
            const pCountColor = p.count === 0 ? "#94a3b8" : p.count >= 5 ? "#ef4444" : "#f97316";
            const pBg = p.count > 0 ? "rgba(249,115,22,0.05)" : "#f8fafc";
            const pBorder = p.count > 0 ? "rgba(249,115,22,0.2)" : "rgba(0,0,0,0.05)";
            
            return (
              <button key={p.label} onClick={() => navigate(p.to)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: pBg, border: `1px solid ${pBorder}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { if (p.count > 0) e.currentTarget.style.background = "rgba(249,115,22,0.1)" }}
                onMouseLeave={e => { if (p.count > 0) e.currentTarget.style.background = pBg }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon style={{ width: 14, height: 14, color: p.count > 0 ? p.color : "#94a3b8" }} />
                  <span style={{ color: p.count > 0 ? "#1e293b" : "#64748b", fontSize: 12, fontWeight: 600 }}>{p.label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: pCountColor }}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row 2: Ekip Canlı Durum (Live Team Status) ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Ekip Canlı Durum</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.15)" }}></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Canlı</span>
            </div>
            <Info style={{ width: 16, height: 16, color: "#94a3b8", cursor: "pointer" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/supervisor/team")} style={{ background: "transparent", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              Tüm ekibi gör <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
            <button style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <MoreVertical style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr" }}>
          
          {/* Left Column (Stats & Charts) */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Top Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {Object.entries(TEAM_STATS).map(([key, stat]) => {
                const StatIcon = stat.icon;
                return (
                  <div key={key} style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "16px 12px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <StatIcon style={{ width: 14, height: 14, color: "#fff" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{stat.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{stat.count}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: stat.color }}>%{stat.percent}</span>
                    </div>
                    {/* Bottom Border Line */}
                    <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3, background: stat.color, borderRadius: "3px 3px 0 0" }} />
                  </div>
                );
              })}
            </div>

            {/* Status Distribution */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Durum Dağılımı</span>
                <select style={{ fontSize: 12, padding: "4px 8px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 6, color: "#64748b", background: "#fff", outline: "none", cursor: "pointer" }}>
                  <option>Yüzde</option>
                  <option>Sayı</option>
                </select>
              </div>
              <div style={{ display: "flex", height: 24, borderRadius: 8, overflow: "hidden" }}>
                {Object.values(TEAM_STATS).map((stat) => (
                  <div key={stat.label} style={{ width: `${stat.percent}%`, background: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {stat.percent > 10 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>%{stat.percent}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Intraday Line Chart */}
            <div style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "16px", background: "#fff", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Gün içi durum değişimi</span>
                <span style={{ fontSize: 11, padding: "3px 8px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "#64748b", background: "#f8fafc" }}>Şu an</span>
              </div>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={INTRADAY_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} />
                    <Tooltip cursor={{ stroke: "rgba(0,0,0,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 600 }} />
                    <Line type="basis" dataKey="aktif" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="basis" dataKey="mesgul" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="basis" dataKey="mola" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="basis" dataKey="cevrimdisi" stroke="#64748b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
                {Object.values(TEAM_STATS).map((stat) => (
                  <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 3, background: stat.color, borderRadius: 2 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ background: "rgba(0,0,0,0.04)" }} />

          {/* Right Column (Team List) */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Ekip Üyeleri (27)</span>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.values(TEAM_STATS).map((stat) => (
                  <button key={stat.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: `1px solid ${stat.color}40`, background: "#fff", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>{stat.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, background: `${stat.color}15`, color: stat.color, padding: "2px 6px", borderRadius: 10 }}>{stat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 60px", padding: "0 16px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", mb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Üye</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Durum</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Süre</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textAlign: "right" }}></span>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: 420 }}>
              {TEAM_MEMBERS.map((member, i) => {
                const st = TEAM_STATS[member.status];
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 60px", alignItems: "center", padding: "12px 16px", borderRadius: 8, transition: "background 0.2s", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 700, backgroundImage: `url(https://ui-avatars.com/api/?name=${member.name}&background=f1f5f9&color=64748b&bold=true&size=64)` }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{member.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: st.color }}>{st.label}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: member.duration === "—" ? "#cbd5e1" : "#475569" }}>{member.duration}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                      <MessageSquare style={{ width: 16, height: 16, color: "#94a3b8", cursor: "pointer" }} />
                      <MoreVertical style={{ width: 16, height: 16, color: "#94a3b8", cursor: "pointer" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
              <button onClick={() => navigate("/supervisor/team")} style={{ background: "transparent", border: "none", color: "#3b82f6", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                Tüm ekibi gör <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
