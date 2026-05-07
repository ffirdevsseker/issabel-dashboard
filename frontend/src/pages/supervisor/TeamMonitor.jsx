import { useState, useMemo } from "react";
import { Phone, Coffee, Wifi, Eye, MessageCircle, Star, LayoutGrid, List, X, TrendingUp, Award, AlertTriangle, Clock } from "lucide-react";

const TEAM = [
  { id: 1, name: "Ahmet Yıldız",   ext: "1001", department: "Müşteri Hizmetleri", status: "aktif",      calls: 14, missed: 1, avgDur: "4:12", xp: 1240, breaks: 1, goal: 88, activeCall: true,  callDur: "02:34", csat: 4.8, shift: "09:00 - 18:00", loginTime: "3s 12dk", breakRemaining: null, recent: [{time:"14:22", dur:"03:15", cat:"Teknik"}, {time:"14:01", dur:"01:45", cat:"Bilgi"}] },
  { id: 2, name: "Fatma Kaya",     ext: "1002", department: "Muhasebe",           status: "mola",       calls: 9,  missed: 2, avgDur: "5:08", xp: 980,  breaks: 2, goal: 65, activeCall: false, callDur: null, csat: 4.2, shift: "10:00 - 19:00", loginTime: "4s 05dk", breakRemaining: "08:12", recent: [{time:"13:30", dur:"05:10", cat:"Fatura"}] },
  { id: 3, name: "Mehmet Demir",   ext: "1003", department: "E-Ticaret",          status: "aktif",      calls: 17, missed: 0, avgDur: "3:45", xp: 1580, breaks: 0, goal: 96, activeCall: true,  callDur: "00:48", csat: 4.9, shift: "08:00 - 17:00", loginTime: "6s 40dk", breakRemaining: null, recent: [{time:"14:40", dur:"02:50", cat:"Kargo"}] },
  { id: 4, name: "Ayşe Çelik",     ext: "1004", department: "Stok",               status: "cevrimdisi", calls: 5,  missed: 3, avgDur: "6:20", xp: 620,  breaks: 1, goal: 38, activeCall: false, callDur: null, csat: 3.5, shift: "09:00 - 18:00", loginTime: "-", breakRemaining: null, recent: [] },
  { id: 5, name: "Ali Korkmaz",    ext: "1005", department: "Müşteri Hizmetleri", status: "aktif",      calls: 12, missed: 1, avgDur: "4:02", xp: 1100, breaks: 1, goal: 55, activeCall: true,  callDur: "01:12", csat: 4.5, shift: "09:00 - 18:00", loginTime: "5s 20dk", breakRemaining: null, recent: [{time:"14:15", dur:"04:20", cat:"Şikayet"}] },
  { id: 6, name: "Elif Şahin",     ext: "1006", department: "Müşteri Hizmetleri", status: "mesgul",     calls: 8,  missed: 0, avgDur: "4:55", xp: 890,  breaks: 2, goal: 58, activeCall: false, callDur: null,  csat: 3.9, shift: "09:00 - 18:00", loginTime: "5s 15dk", breakRemaining: null, recent: [{time:"13:55", dur:"08:12", cat:"Teknik"}] },
  { id: 7, name: "Can Öztürk",     ext: "1007", department: "E-Ticaret",          status: "aktif",      calls: 11, missed: 2, avgDur: "3:30", xp: 1050, breaks: 0, goal: 72, activeCall: false, callDur: null, csat: 4.1, shift: "09:00 - 18:00", loginTime: "4s 50dk", breakRemaining: null, recent: [{time:"14:20", dur:"01:30", cat:"Bilgi"}] },
];

const SC = {
  aktif:      { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)",  text: "#059669", label: "Aktif",    borderLine: "#10b981" },
  mola:       { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)",  text: "#d97706", label: "Mola",     borderLine: "#f59e0b" },
  mesgul:     { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)",  text: "#2563eb", label: "Meşgul",   borderLine: "#3b82f6" },
  cevrimdisi: { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)",text: "#475569", label: "Çevrimdışı",borderLine: "#94a3b8" },
};

function XPModal({ person, onClose }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const valid = reason.length >= 30 && amount !== "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(255,255,255,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 18, padding: 28, width: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award style={{ width: 20, height: 20, color: "#d97706" }} />
            <h3 style={{ color: "#1e293b", fontSize: 16, fontWeight: 700, margin: 0 }}>XP Düzelt — {person.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>Mevcut XP</span>
          <span style={{ color: "#d97706", fontSize: 16, fontWeight: 800 }}>{person.xp}</span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: "#475569", fontSize: 12, marginBottom: 6, display: "block", fontWeight: 600 }}>Miktar (+ ekle / - çıkar)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="+25 veya -10"
            style={{ width: "100%", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 14, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: "#475569", fontSize: 12, marginBottom: 6, display: "block", fontWeight: 600 }}>Sebep <span style={{ color: "#94a3b8" }}>({reason.length}/30 min)</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Minimum 30 karakter açıklama giriniz..."
            style={{ width: "100%", background: "#f8fafc", border: "1px solid " + (reason.length >= 30 ? "rgba(16,185,129,0.4)" : "rgba(0,0,0,0.1)"), borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontWeight: 500 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#475569", fontSize: 12, marginBottom: 6, display: "block", fontWeight: 600 }}>Referans (opsiyonel)</label>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Çağrı ID, Görev ID vb."
            style={{ width: "100%", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px", color: "#1e293b", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
        </div>
        <p style={{ color: "#64748b", fontSize: 11, marginBottom: 14, fontWeight: 500 }}>⚠ Bu işlem Admin audit log'una kaydedilir.</p>
        <button disabled={!valid} onClick={onClose}
          style={{ width: "100%", background: valid ? "linear-gradient(135deg,#10b981,#059669)" : "#f1f5f9", border: valid ? "none" : "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: 14, color: valid ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", boxShadow: valid ? "0 4px 12px rgba(16,185,129,0.2)" : "none" }}>
          Uygula
        </button>
      </div>
    </div>
  );
}

export default function TeamMonitor() {
  const [view, setView] = useState("card");
  const [selected, setSelected] = useState(null);
  const [xpTarget, setXpTarget] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState("Tümü");
  const [filterDep, setFilterDep] = useState("Tümü");

  const filteredTeam = useMemo(() => {
    return TEAM.filter(p => {
      if (filterStatus !== "Tümü" && SC[p.status].label !== filterStatus) return false;
      if (filterDep !== "Tümü" && p.department !== filterDep) return false;
      return true;
    });
  }, [filterStatus, filterDep]);

  const stats = useMemo(() => {
    let r = { aktif: 0, mola: 0, mesgul: 0, cevrimdisi: 0, total: TEAM.length };
    TEAM.forEach(p => { r[p.status] = (r[p.status] || 0) + 1; });
    return r;
  }, []);

  const departments = ["Tümü", "Müşteri Hizmetleri", "Muhasebe", "E-Ticaret", "Stok"];
  const statuses = ["Tümü", "Aktif", "Mola", "Meşgul", "Çevrimdışı"];

  const p = selected;
  const sc = p ? (SC[p.status] || SC.aktif) : null;

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 140px)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        
        {/* Top Summary Bar */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#475569", fontSize: 13, fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#10b981", fontSize: 10 }}>🟢</span> Aktif {stats.aktif}</span> · 
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#f59e0b", fontSize: 10 }}>🟡</span> Mola {stats.mola}</span> · 
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#3b82f6", fontSize: 10 }}>🔴</span> Meşgul {stats.mesgul}</span> · 
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#64748b", fontSize: 10 }}>⚫</span> Çevrimdışı {stats.cevrimdisi}</span> · 
            <span style={{ color: "#1e293b", fontWeight: 700 }}>Toplam {stats.total} personel</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
              {statuses.map(st => (
                <button key={st} onClick={() => setFilterStatus(st)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: filterStatus === st ? "#fff" : "transparent", color: filterStatus === st ? "#1e293b" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: filterStatus === st ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
                  {st}
                </button>
              ))}
            </div>

            <select value={filterDep} onChange={e => setFilterDep(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#1e293b", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <div style={{ display: "flex", gap: 4, paddingLeft: 8, borderLeft: "1px solid rgba(0,0,0,0.1)" }}>
              {[{ id: "card", icon: LayoutGrid }, { id: "table", icon: List }].map(v => {
                const Icon = v.icon;
                return (
                  <button key={v.id} onClick={() => setView(v.id)} style={{ padding: "6px", borderRadius: 6, border: "none", background: view === v.id ? "#e0e7ff" : "transparent", color: view === v.id ? "#2563eb" : "#64748b", cursor: "pointer" }}>
                    <Icon style={{ width: 14, height: 14 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card view */}
        {view === "card" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12, overflowY: "auto", paddingBottom: 10, alignContent: "start" }}>
            {filteredTeam.map(p => {
              const sc = SC[p.status] || SC.aktif;
              const isOffline = p.status === "cevrimdisi";
              const isWarning = p.status === "aktif" && p.goal < 60;
              
              let cardBg = "#fff";
              if (isOffline) cardBg = "#f8fafc";
              else if (isWarning) cardBg = "rgba(239,68,68,0.03)";
              else if (p.status === "aktif" && p.activeCall) cardBg = "rgba(16,185,129,0.03)";

              return (
                <div key={p.id} onClick={() => setSelected(p)}
                  style={{ 
                    position: "relative",
                    background: cardBg, 
                    border: selected?.id === p.id ? "1px solid #3b82f6" : "1px solid rgba(0,0,0,0.06)", 
                    borderLeft: "3px solid " + sc.borderLine,
                    borderRadius: 16, 
                    padding: "16px", 
                    cursor: "pointer", 
                    transition: "all 0.2s", 
                    boxShadow: selected?.id === p.id ? "0 4px 12px rgba(59,130,246,0.15)" : "0 2px 8px rgba(0,0,0,0.02)",
                    minHeight: 250,
                    display: "flex",
                    flexDirection: "column",
                    opacity: isOffline ? 0.4 : 1
                  }}
                >
                  {isOffline && (
                    <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ background: "rgba(255,255,255,0.9)", padding: "4px 12px", borderRadius: 20, color: "#475569", fontWeight: 700, fontSize: 13, border: "1px solid rgba(0,0,0,0.1)" }}>Çevrimdışı</span>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bfdbfe", flexShrink: 0 }}>
                      <span style={{ color: "#2563eb", fontSize: 14, fontWeight: 700 }}>{p.name.split(" ").map(x => x[0]).join("")}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#1e293b", fontSize: 13, fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      <p style={{ color: "#64748b", fontSize: 11, margin: 0, fontWeight: 500 }}>Dahili {p.ext}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: sc.bg, color: sc.text, border: "1px solid " + sc.border, whiteSpace: "nowrap" }}>{sc.label}</span>
                  </div>

                  <div style={{ height: 32, marginBottom: 12 }}>
                    {p.activeCall && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8, padding: "5px 10px", width: "max-content" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block", animation: "pulse 1.5s infinite" }} />
                        <span style={{ color: "#059669", fontSize: 11, fontWeight: 700 }}>Çağrıda — {p.callDur}</span>
                      </div>
                    )}
                    {p.status === "mola" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "5px 10px", width: "max-content" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "block", animation: "pulse 1.5s infinite" }} />
                        <span style={{ color: "#d97706", fontSize: 11, fontWeight: 700 }}>Molada — {p.breakRemaining} kaldı</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {[{ label: "Çağrı", value: p.calls }, { label: "Ort.", value: p.avgDur }, { label: "XP", value: p.xp }].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "6px 8px", textAlign: "center", border: "1px solid rgba(0,0,0,0.03)" }}>
                        <p style={{ color: "#1e293b", fontSize: 13, fontWeight: 800, margin: 0 }}>{s.value}</p>
                        <p style={{ color: "#64748b", fontSize: 10, margin: 0, fontWeight: 600 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#64748b", fontSize: 10, fontWeight: 600 }}>Hedef</span>
                      <span style={{ color: p.goal >= 80 ? "#059669" : p.goal >= 60 ? "#d97706" : "#dc2626", fontSize: 10, fontWeight: 800 }}>%{p.goal}</span>
                    </div>
                    <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: p.goal + "%", borderRadius: 4, background: p.goal >= 80 ? "#10b981" : p.goal >= 60 ? "#f59e0b" : "#ef4444", transition: "width 0.5s" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                    <button disabled={isOffline} onClick={e => { e.stopPropagation(); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)", background: "#f8fafc", color: isOffline ? "#94a3b8" : "#475569", fontSize: 11, cursor: isOffline ? "not-allowed" : "pointer", fontWeight: 600, zIndex: 20 }}>
                      <MessageCircle style={{ width: 12, height: 12 }} /> Mesaj
                    </button>
                    <button disabled={!p.activeCall || isOffline} onClick={e => { e.stopPropagation(); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px", borderRadius: 8, border: (p.activeCall && !isOffline) ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(0,0,0,0.05)", background: (p.activeCall && !isOffline) ? "rgba(16,185,129,0.05)" : "#f8fafc", color: (p.activeCall && !isOffline) ? "#059669" : "#94a3b8", fontSize: 11, cursor: (p.activeCall && !isOffline) ? "pointer" : "not-allowed", fontWeight: 700, zIndex: 20 }}>
                      <Eye style={{ width: 12, height: 12 }} /> Dinle
                    </button>
                    <button disabled={isOffline} onClick={e => { e.stopPropagation(); setXpTarget(p); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px", borderRadius: 8, border: !isOffline ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(0,0,0,0.05)", background: !isOffline ? "rgba(245,158,11,0.05)" : "#f8fafc", color: !isOffline ? "#d97706" : "#94a3b8", fontSize: 11, cursor: isOffline ? "not-allowed" : "pointer", fontWeight: 700, zIndex: 20 }}>
                      <Star style={{ width: 12, height: 12 }} /> XP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table view */}
        {view === "table" && (
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {["İsim", "Durum", "Çağrı", "Cevapsız", "Ort.", "CSAT", "XP", "Mola", "Aksiyonlar"].map(h => (
                    <th key={h} style={{ color: "#64748b", fontSize: 11, fontWeight: 700, padding: "11px 14px", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((p, i) => {
                  const sc = SC[p.status] || SC.aktif;
                  return (
                    <tr key={p.id} onClick={() => setSelected(p)}
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer", background: selected?.id === p.id ? "rgba(59,130,246,0.05)" : (i % 2 === 0 ? "#fff" : "#f8fafc") }}
                      onMouseEnter={e => { if(selected?.id !== p.id) e.currentTarget.style.background = "#f1f5f9" }}
                      onMouseLeave={e => { if(selected?.id !== p.id) e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bfdbfe" }}>
                            <span style={{ color: "#2563eb", fontSize: 10, fontWeight: 800 }}>{p.name.split(" ").map(x => x[0]).join("")}</span>
                          </div>
                          <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: sc.bg, color: sc.text, border: "1px solid " + sc.border }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#1e293b", fontSize: 13, fontWeight: 800 }}>{p.calls}</td>
                      <td style={{ padding: "12px 14px", color: p.missed > 0 ? "#ef4444" : "#10b981", fontSize: 13, fontWeight: 800 }}>{p.missed}</td>
                      <td style={{ padding: "12px 14px", color: "#475569", fontSize: 13, fontWeight: 500 }}>{p.avgDur}</td>
                      <td style={{ padding: "12px 14px", color: p.csat >= 4.5 ? "#10b981" : p.csat >= 4.0 ? "#f59e0b" : "#ef4444", fontSize: 13, fontWeight: 800 }}>{p.csat}</td>
                      <td style={{ padding: "12px 14px", color: "#d97706", fontSize: 13, fontWeight: 800 }}>{p.xp}</td>
                      <td style={{ padding: "12px 14px", color: "#475569", fontSize: 13, fontWeight: 500 }}>{p.breaks}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.05)", background: "#fff", color: "#475569", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            <MessageCircle style={{ width: 11, height: 11 }} />
                          </button>
                          {p.activeCall && (
                            <button onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.05)", color: "#059669", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                              <Eye style={{ width: 11, height: 11 }} /> Dinle
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); setXpTarget(p); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)", color: "#d97706", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            <Star style={{ width: 11, height: 11 }} /> XP
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer Panel */}
      {p && (
        <div style={{ width: 340, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bfdbfe", flexShrink: 0 }}>
                  <span style={{ color: "#2563eb", fontSize: 20, fontWeight: 800 }}>{p.name.split(" ").map(x => x[0]).join("")}</span>
                </div>
                <div>
                  <h3 style={{ color: "#1e293b", fontSize: 16, fontWeight: 800, margin: "0 0 4px 0" }}>{p.name}</h3>
                  <p style={{ color: "#64748b", margin: 0, fontSize: 12, fontWeight: 500 }}>Dahili: {p.ext}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}><X style={{ width: 14, height: 14 }} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.text, border: "1px solid " + sc.border }}>{sc.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                <Clock style={{ width: 12, height: 12 }} /> {p.shift}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                <Wifi style={{ width: 12, height: 12 }} /> {p.loginTime}
              </div>
            </div>
          </div>

          <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>Performans Metrikleri</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { lbl: "Çağrı", val: p.calls, icon: Phone },
                  { lbl: "Cevapsız", val: p.missed, icon: Phone, color: p.missed > 0 ? "#ef4444" : "#1e293b" },
                  { lbl: "Ort. Süre", val: p.avgDur, icon: Clock },
                  { lbl: "CSAT Skoru", val: p.csat, icon: Star, color: p.csat >= 4.5 ? "#10b981" : "#d97706" },
                  { lbl: "Toplam XP", val: p.xp, icon: Award, color: "#d97706" },
                  { lbl: "Hedef", val: "%" + p.goal, icon: TrendingUp, color: p.goal >= 80 ? "#10b981" : p.goal >= 60 ? "#d97706" : "#ef4444" },
                ].map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", marginBottom: 6 }}>
                        <Icon style={{ width: 12, height: 12 }} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{m.lbl}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: m.color || "#1e293b" }}>{m.val}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>Son Çağrılar</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.recent.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>Arama kaydı yok.</div>
                ) : (
                  p.recent.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{r.time}</span>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{r.cat}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{r.dur}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>Aksiyonlar</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                  <MessageCircle style={{ width: 14, height: 14 }} /> Mesaj Gönder
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={!p.activeCall} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: p.activeCall ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(0,0,0,0.05)", background: p.activeCall ? "rgba(16,185,129,0.05)" : "#f8fafc", color: p.activeCall ? "#059669" : "#94a3b8", fontSize: 12, cursor: p.activeCall ? "pointer" : "not-allowed", fontWeight: 700, transition: "all 0.2s" }}>
                    <Eye style={{ width: 14, height: 14 }} /> Dinle
                  </button>
                  <button onClick={() => setXpTarget(p)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)", color: "#d97706", fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.2s" }}>
                    <Star style={{ width: 14, height: 14 }} /> XP Düzelt
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {p.status === "mola" ? (
                    <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#1e293b", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                      <Coffee style={{ width: 14, height: 14 }} /> Molayı Bitir
                    </button>
                  ) : (
                    <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#1e293b", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                      <Coffee style={{ width: 14, height: 14 }} /> Mola Ver
                    </button>
                  )}
                  <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                    <AlertTriangle style={{ width: 14, height: 14 }} /> Uyar
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {xpTarget && <XPModal person={xpTarget} onClose={() => setXpTarget(null)} />}
    </div>
  );
}