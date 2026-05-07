import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Filter, Download, FileText, PieChart, Users } from "lucide-react";
import { supervisorApi } from "../../services/api";

export default function SupervisorReports() {
  const [period, setPeriod] = useState("bugun");
  const [data, setData] = useState({ kpis: [], hourly_chart: [], agents: [] });

  useEffect(() => {
    supervisorApi.getReports().then(res => {
      setData(res.data);
    }).catch(console.error);
  }, [period]);

  const KPIS = data.kpis.length > 0 ? data.kpis : [
    { label: "Toplam Çağrı", value: "...", prev: "...", trend: "up", perc: "..." }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, margin: 0 }}>Ekip Raporları</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 14px", color: "#1e293b", fontSize: 13, fontWeight: 600, outline: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <option value="bugun">Bugün</option>
            <option value="hafta">Bu Hafta</option>
            <option value="ay">Bu Ay</option>
            <option value="ozel">Özel Tarih...</option>
          </select>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 14px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <Filter style={{ width: 14, height: 14 }} /> Filtrele
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "8px 14px", color: "#059669", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(16,185,129,0.05)" }}>
            <Download style={{ width: 14, height: 14 }} /> Dışa Aktar
          </button>
        </div>
      </div>

      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 10 }}>
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {KPIS.map(k => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <p style={{ color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{k.label}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ color: "#1e293b", fontSize: 28, fontWeight: 800 }}>{k.value}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: k.trend === "up" ? (k.label === "Cevapsız" ? "#dc2626" : "#059669") : (k.label === "Cevapsız" ? "#059669" : "#dc2626"), fontSize: 13, fontWeight: 800 }}>
                  {k.trend === "up" ? <TrendingUp style={{ width: 16, height: 16 }} /> : <TrendingDown style={{ width: 16, height: 16 }} />}
                  {k.perc}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, margin: "6px 0 0" }}>Önceki dönem: {k.prev}</p>
            </div>
          ))}
        </div>

        {/* Charts Mock */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* Main Chart */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, margin: "0 0 24px 0", fontWeight: 800 }}>Çağrı Hacmi Trendi</h3>
            <div style={{ height: 250, display: "flex", alignItems: "flex-end", gap: "2%", padding: "0 10px" }}>
              {data.hourly_chart.length > 0 ? data.hourly_chart.map((h, i) => {
                const maxVal = Math.max(...data.hourly_chart.map(x => x.gelen)) || 1;
                const pct = (h.gelen / maxVal) * 100;
                return (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                  <div style={{ width: "100%", height: `${pct}%`, background: "linear-gradient(180deg, #3b82f6 0%, rgba(59,130,246,0.1) 100%)", borderRadius: "8px 8px 0 0", position: "relative" }}>
                    <div style={{ position: "absolute", top: -24, left: 0, right: 0, textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: 700 }}>{h.gelen}</div>
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>{h.name}</span>
                </div>
              )}) : <div style={{width: "100%", textAlign: "center", color: "#94a3b8"}}>Veri bekleniyor...</div>}
            </div>
          </div>

          {/* Pie Chart / Distribution */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, margin: "0 0 24px 0", fontWeight: 800 }}>Kategori Dağılımı</h3>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 180, height: 180, borderRadius: "50%", border: "28px solid #3b82f6", borderTopColor: "#10b981", borderRightColor: "#f59e0b", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", fontSize: 24, fontWeight: 800 }}>
                  247
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#475569", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }}/> Satış Öncesi</span><span style={{ color: "#1e293b", fontWeight: 800 }}>%45</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#475569", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }}/> İade/Değişim</span><span style={{ color: "#1e293b", fontWeight: 800 }}>%35</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#475569", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }}/> Şikayet</span><span style={{ color: "#1e293b", fontWeight: 800 }}>%20</span></div>
            </div>
          </div>
        </div>

        {/* Personel Tablosu */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <h3 style={{ color: "#1e293b", fontSize: 16, margin: "0 0 20px 0", fontWeight: 800 }}>Personel Performansı</h3>
          <div style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {["Personel", "Çağrı", "Cevapsız", "Ort. Süre", "CSAT", "Mola Süresi"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "14px 16px", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.agents.length > 0 ? data.agents.map((p, i) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "14px 16px", color: "#1e293b", fontSize: 13, fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: 13, fontWeight: 600 }}>{p.calls}</td>
                    <td style={{ padding: "14px 16px", color: p.missed > 0 ? "#dc2626" : "#059669", fontSize: 13, fontWeight: 700 }}>{p.missed || 0}</td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: 13, fontWeight: 500 }}>{p.avgTime}</td>
                    <td style={{ padding: "14px 16px", color: "#059669", fontSize: 13, fontWeight: 800 }}>{p.csat}</td>
                    <td style={{ padding: "14px 16px", color: "#64748b", fontSize: 13, fontWeight: 500 }}>{p.break || "0 dk"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" style={{ padding: "14px 16px", textAlign: "center" }}>Veri yükleniyor...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
