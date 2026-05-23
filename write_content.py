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
  aktif:      { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)",  text: "#059669", label: "Aktif",    dot: "#10b981", borderLine: "#10b981" },
  mola:       { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)",  text: "#d97706", label: "Mola",     dot: "#f59e0b", borderLine: "#f59e0b" },
  mesgul:     { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)",  text: "#2563eb", label: "Meşgul",   dot: "#3b82f6", borderLine: "#3b82f6" },
  cevrimdisi: { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)",text: "#475569", label: "Çevrimdışı",dot: "#64748b", borderLine: "#94a3b8" },
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
        <p style={{ color: "#64748b", fontSize: 11, marginBottom: 14, fontWeight: 500 }}>⚠ Bu işlem Admin in audit log'una kaydedilir.</p>
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
    let r = { aktif: 0,