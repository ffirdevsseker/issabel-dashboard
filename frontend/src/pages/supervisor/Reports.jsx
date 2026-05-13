import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Filter, Download, FileText, PieChart, Users } from "lucide-react";
import { supervisorApi } from "../../services/api";

/* ─── DEMO veriler (backend boş döndüğünde gösterilir) ─── */
const MOCK_REPORTS = {
  kpis: [
    { label: "Toplam Çağrı",      value: "1.284", prev: "1.146", trend: "up",   perc: "+12%" },
    { label: "Cevapsız Çağrı",    value: "%6,2",  prev: "%7,3",  trend: "down", perc: "-1,1%" },
    { label: "Ortalama Görüşme",  value: "3:45",  prev: "3:50",  trend: "down", perc: "-0:05" },
    { label: "CSAT Puanı",        value: "4.6",   prev: "4.4",   trend: "up",   perc: "+0.2" },
  ],
  hourly_chart: [
    { name: "08", gelen: 28  },
    { name: "09", gelen: 65  },
    { name: "10", gelen: 102 },
    { name: "11", gelen: 134 },
    { name: "12", gelen: 88  },
    { name: "13", gelen: 95  },
    { name: "14", gelen: 142 },
    { name: "15", gelen: 158 },
    { name: "16", gelen: 124 },
    { name: "17", gelen: 78  },
  ],
  agents: [
    { name: "Ahmet Yılmaz",   calls: 142, avg: "3:22", csat: 4.8, missed: 4 },
    { name: "Selin Öztürk",   calls: 128, avg: "3:55", csat: 4.6, missed: 6 },
    { name: "Can Demir",      calls: 115, avg: "4:12", csat: 4.4, missed: 8 },
    { name: "Zeynep Arslan",  calls: 156, avg: "3:08", csat: 4.9, missed: 2 },
    { name: "Mert Güven",     calls: 98,  avg: "4:32", csat: 4.3, missed: 5 },
    { name: "Ayşe Koç",       calls: 104, avg: "3:48", csat: 4.5, missed: 3 },
  ],
};

export default function SupervisorReports() {
  const [period, setPeriod] = useState("bugun");
  const [data, setData] = useState(MOCK_REPORTS);

  useEffect(() => {
    supervisorApi.getReports().then(res => {
      const real = res.data || {};
      // Boş alanları mock ile doldur
      setData({
        kpis:          (real.kpis?.length         > 0) ? real.kpis         : MOCK_REPORTS.kpis,
        hourly_chart:  (real.hourly_chart?.length > 0) ? real.hourly_chart : MOCK_REPORTS.hourly_chart,
        agents:        (real.agents?.length       > 0) ? real.agents       : MOCK_REPORTS.agents,
      });
    }).catch(() => setData(MOCK_REPORTS));
  }, [period]);

  const KPIS = data.kpis;

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
