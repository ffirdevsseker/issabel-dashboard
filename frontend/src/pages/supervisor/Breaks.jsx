import { useState, useEffect } from "react";
import { Coffee, CheckCircle, XCircle, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { supervisorApi } from "../../services/api";

export default function SupervisorBreaks() {
  const [tab, setTab] = useState("talepler");
  const [MOLA_TALEPLERI, setMolaTalepleri] = useState([]);
  
  useEffect(() => {
    supervisorApi.getActiveBreaks().then(res => {
      setMolaTalepleri(res.data || []);
    }).catch(err => console.error(err));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, margin: 0 }}>Mola Yönetimi</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            {[
              { id: "talepler", label: "Bekleyen Talepler", count: 3 },
              { id: "harita", label: "Ekip Mola Haritası" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? "rgba(59,130,246,0.08)" : "transparent",
                color: tab === t.id ? "#2563eb" : "#64748b",
                border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 700 : 600, cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6
              }}>
                {t.label}
                {t.count && <span style={{ background: "#f97316", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 10 }}>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
        
        {/* Talepler Listesi */}
        {tab === "talepler" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ color: "#64748b", fontSize: 14, margin: 0, fontWeight: 500 }}>Bu kararlar nihaidir (Admin onayı gerekmez).</p>
              <button style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}>
                <CheckCircle style={{ width: 16, height: 16 }} /> Uygun Olanları Toplu Onayla
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 10 }}>
              {MOLA_TALEPLERI.map(r => (
                <div key={r.id} style={{
                  background: r.isEmergency ? "rgba(239,68,68,0.03)" : "#f8fafc",
                  border: `1px solid ${r.isEmergency ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.06)"}`,
                  borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: r.isEmergency ? "2px solid rgba(239,68,68,0.4)" : "1px solid #bfdbfe" }}>
                      <span style={{ color: r.isEmergency ? "#dc2626" : "#2563eb", fontSize: 16, fontWeight: 800 }}>{r.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ color: "#1e293b", fontSize: 16, fontWeight: 800 }}>{r.name}</span>
                        {r.isEmergency && <span style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 800, border: "1px solid rgba(239,68,68,0.2)" }}>ACİL MOLA</span>}
                      </div>
                      <div style={{ display: "flex", gap: 20, color: "#64748b", fontSize: 13, fontWeight: 600 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock style={{ width: 14, height: 14, color: "#94a3b8" }} /> {r.time} ({r.dur})</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Coffee style={{ width: 14, height: 14, color: "#94a3b8" }} /> {r.type}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    {r.inCall && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d97706", fontSize: 13, fontWeight: 700, background: "rgba(245,158,11,0.1)", padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)" }}>
                        <AlertCircle style={{ width: 16, height: 16 }} /> Çağrıda — Beklenmesi önerilir
                      </div>
                    )}
                    
                    <div style={{ display: "flex", gap: 12 }}>
                      <button style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 20px", color: "#059669", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(16,185,129,0.15)"} onMouseLeave={e => e.currentTarget.style.background="rgba(16,185,129,0.1)"}>
                        <CheckCircle style={{ width: 18, height: 18 }} /> Onayla
                      </button>
                      <button style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 20px", color: "#dc2626", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.15)"} onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.1)"}>
                        <XCircle style={{ width: 18, height: 18 }} /> Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ekip Mola Haritası (Gantt Mock) */}
        {tab === "harita" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <h3 style={{ color: "#1e293b", fontSize: 16, margin: 0, fontWeight: 800 }}>Bugün (12 Nisan)</h3>
                <div style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#10b981" }}/> Aktif</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#3b82f6" }}/> Onaylı (Bekliyor)</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#f59e0b" }}/> Onay Bekliyor</span>
                </div>
              </div>
              
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert style={{ width: 16, height: 16, color: "#dc2626" }} />
                <span style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>11:00 - 11:30 arası çakışma riski (3+ kişi)</span>
              </div>
            </div>

            <div style={{ flex: 1, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "auto", position: "relative", background: "#f8fafc" }}>
               {/* Time Header */}
               <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
                 <div style={{ width: 150, padding: 14, color: "#64748b", fontSize: 12, fontWeight: 700, borderRight: "1px solid rgba(0,0,0,0.08)" }}>Personel</div>
                 {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(t => (
                   <div key={t} style={{ flex: 1, padding: "14px 0", textAlign: "center", color: "#64748b", fontSize: 12, fontWeight: 700, borderRight: "1px solid rgba(0,0,0,0.08)" }}>{t}</div>
                 ))}
               </div>

               {/* Rows */}
               {[
                 { name: "Ahmet Yıldız", blocks: [{ start: "10:00", end: "10:15", type: "active", l: 11, w: 1.5 }, { start: "13:00", end: "14:00", type: "approved", l: 44, w: 10 }] },
                 { name: "Fatma Kaya", blocks: [{ start: "11:00", end: "11:15", type: "pending", l: 22, w: 1.5 }] },
                 { name: "Mehmet Demir", blocks: [{ start: "11:00", end: "11:10", type: "pending", l: 22, w: 1 }] },
                 { name: "Ayşe Çelik", blocks: [{ start: "12:30", end: "13:15", type: "pending", l: 38, w: 4.5 }] },
               ].map((p, i) => (
                 <div key={i} style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.05)", position: "relative", height: 56 }}>
                   <div style={{ width: 150, padding: "0 14px", display: "flex", alignItems: "center", color: "#1e293b", fontSize: 13, fontWeight: 700, borderRight: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>{p.name}</div>
                   <div style={{ flex: 1, position: "relative" }}>
                     {/* Grid lines */}
                     {[1,2,3,4,5,6,7,8,9].map(line => (
                       <div key={line} style={{ position: "absolute", left: `${line * 10}%`, top: 0, bottom: 0, borderLeft: "1px dashed rgba(0,0,0,0.08)" }} />
                     ))}
                     
                     {/* Blocks */}
                     {p.blocks.map((b, j) => (
                       <div key={j} style={{
                         position: "absolute", top: 12, bottom: 12, left: `${b.l}%`, width: `${b.w}%`,
                         background: b.type === "active" ? "#10b981" : b.type === "approved" ? "#3b82f6" : "#f59e0b",
                         borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer",
                         display: "flex", alignItems: "center", justifyContent: "center",
                         boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                       }}>
                         {b.w > 3 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>{b.start}</span>}
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "16px 0 0", textAlign: "center", fontWeight: 600 }}>* Günlük kişi başı mola limitleri Admin tarafından belirlenir, Süpervizör sadece daha sıkı kurallar koyabilir.</p>
          </div>
        )}

      </div>
    </div>
  );
}
