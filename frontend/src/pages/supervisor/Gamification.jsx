import { useState, useEffect } from "react";
import { Target, Star, Award, Search, Plus, ListTodo, History, Check } from "lucide-react";
import { supervisorApi } from "../../services/api";

const MOCK_TEAM = [
  "Ahmet Yılmaz", "Selin Öztürk", "Can Demir", "Zeynep Arslan",
  "Mert Güven", "Ayşe Koç", "Burak Yıldız", "Deniz Kaya",
];

export default function SupervisorGamification() {
  const [tab, setTab] = useState("gorevler");
  const [xpModal, setXpModal] = useState(false);
  const [TEAM, setTeam] = useState(MOCK_TEAM);

  useEffect(() => {
    supervisorApi.getGamification().then(res => {
      const data = res.data || [];
      const names = data.map(x => x.name || x.ad_soyad).filter(Boolean);
      setTeam(names.length > 0 ? names : MOCK_TEAM);
    }).catch(() => setTeam(MOCK_TEAM));
  }, []);

  const TASKS = [
    { id: 1, title: "Bugün CSAT 4.5+ tut", target: "4.5 Puan", diff: "Zor", xp: 50, scope: "Tüm Ekip", status: "aktif" },
    { id: 2, title: "Müşteri bekleme süresini < 30sn yap", target: "30 Saniye", diff: "Orta", xp: 25, scope: "Ahmet, Fatma", status: "aktif" },
    { id: 3, title: "Sabah vardiyasında devamsızlık yapma", target: "%100 Devam", diff: "Kolay", xp: 10, scope: "Tüm Ekip", status: "tamamlandi" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, margin: 0 }}>Oyunlaştırma & Görevler</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            {[
              { id: "gorevler", label: "Günlük Görevler (Quest)" },
              { id: "rozetler", label: "Rozetler (Salt Okunur)" },
              { id: "xp", label: "Manuel XP Düzeltme" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? "rgba(59,130,246,0.08)" : "transparent",
                color: tab === t.id ? "#2563eb" : "#64748b",
                border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 700 : 600, cursor: "pointer", transition: "all 0.2s"
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, display: "flex", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
        
        {/* Görevler Sekmesi */}
        {tab === "gorevler" && (
          <div style={{ display: "flex", width: "100%" }}>
            <div style={{ flex: 1, borderRight: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", padding: 24, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ color: "#1e293b", fontSize: 16, margin: 0, fontWeight: 800 }}>Mevcut Görevler</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "8px 14px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <History style={{ width: 14, height: 14 }} /> Arşiv
                  </button>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {TASKS.map(t => (
                  <div key={t.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 20, position: "relative", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                    {t.status === "tamamlandi" && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 6, background: "#10b981" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ color: "#1e293b", fontSize: 15, fontWeight: 800 }}>{t.title}</span>
                      <span style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#d97706", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 800 }}>+{t.xp} XP</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, color: "#64748b", fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Target style={{ width: 14, height: 14, color: "#94a3b8" }} /> Hedef: <strong style={{ color: "#1e293b" }}>{t.target}</strong></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>Kitle: <strong style={{ color: "#1e293b" }}>{t.scope}</strong></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, fontWeight: 700, background: t.diff === "Zor" ? "rgba(239,68,68,0.1)" : t.diff === "Orta" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", color: t.diff === "Zor" ? "#dc2626" : t.diff === "Orta" ? "#2563eb" : "#059669" }}>{t.diff}</span>
                      {t.status === "aktif" ? (
                        <button style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", color: "#475569", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                      ) : (
                        <span style={{ color: "#059669", fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}><Check style={{ width: 14, height: 14 }} /> Tamamlandı</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ width: 400, padding: 32, background: "#f8fafc", borderLeft: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus style={{ width: 20, height: 20, color: "#059669" }} />
                </div>
                <h3 style={{ color: "#1e293b", fontSize: 18, margin: 0, fontWeight: 800 }}>Yeni Görev Tanımla</h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: 12, marginBottom: 8, display: "block", fontWeight: 600 }}>Başlık</label>
                  <input type="text" placeholder="Örn: Bugün CSAT 4.5+ tut" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }} />
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: 12, marginBottom: 8, display: "block", fontWeight: 600 }}>Açıklama</label>
                  <textarea rows={3} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", resize: "none", boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}></textarea>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: "#64748b", fontSize: 12, marginBottom: 8, display: "block", fontWeight: 600 }}>Zorluk</label>
                    <select style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none" }}>
                      <option value="kolay">Kolay (10 XP)</option>
                      <option value="orta">Orta (25 XP)</option>
                      <option value="zor">Zor (50 XP)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: "#64748b", fontSize: 12, marginBottom: 8, display: "block", fontWeight: 600 }}>Geçerlilik</label>
                    <select style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none" }}>
                      <option value="bugun">Bugün</option>
                      <option value="hafta">Bu Hafta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: 12, marginBottom: 8, display: "block", fontWeight: 600 }}>Hedef Kitle</label>
                  <select style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none" }}>
                    <option value="all">Tüm Ekip</option>
                    {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                
                <button style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 10, padding: 14, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 12, boxShadow: "0 4px 12px rgba(59,130,246,0.2)" }}>
                  Görevi Başlat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rozetler (Salt Okunur) */}
        {tab === "rozetler" && (
          <div style={{ padding: 32, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", padding: 20, borderRadius: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Award style={{ width: 24, height: 24, color: "#2563eb" }} />
              </div>
              <div>
                <h3 style={{ color: "#1e293b", fontSize: 16, margin: 0, fontWeight: 800 }}>Sistem Rozetleri</h3>
                <p style={{ color: "#3b82f6", fontSize: 13, margin: "4px 0 0", fontWeight: 500 }}>Rozet kataloğu yalnızca Admin tarafından yönetilir. Personel sistem rozetlerini otomatik kazanır.</p>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {[
                { n: "İlk Çağrı", d: "Sistemdeki ilk çağrıyı tamamla.", c: "#3b82f6" },
                { n: "Hız Şampiyonu", d: "Ortalama süreyi 3dk altına indir.", c: "#10b981" },
                { n: "Müşteri Dostu", d: "CSAT 4.8 üzerinde 10 çağrı al.", c: "#f59e0b" },
              ].map(r => (
                <div key={r.n} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${r.c}15`, border: `2px solid ${r.c}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Award style={{ width: 28, height: 28, color: r.c }} />
                  </div>
                  <div>
                    <h4 style={{ color: "#1e293b", fontSize: 15, margin: "0 0 6px 0", fontWeight: 800 }}>{r.n}</h4>
                    <p style={{ color: "#64748b", fontSize: 12, margin: 0, fontWeight: 500 }}>{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manuel XP Düzeltme */}
        {tab === "xp" && (
          <div style={{ padding: 32, width: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ color: "#1e293b", fontSize: 18, margin: 0, fontWeight: 800 }}>Ekip Üyeleri</h3>
                <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0", fontWeight: 500 }}>Manuel XP ekleme/çıkarma işlemleri sınırsızdır ancak Admin'in audit loguna düşer.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px", width: 280, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}>
                <Search style={{ width: 16, height: 16, color: "#94a3b8" }} />
                <input type="text" placeholder="Personel Ara..." style={{ background: "transparent", border: "none", outline: "none", color: "#1e293b", fontSize: 14, fontWeight: 500, marginLeft: 10, width: "100%" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {TEAM.map(name => (
                <div key={name} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bfdbfe" }}>
                      <span style={{ color: "#2563eb", fontSize: 15, fontWeight: 800 }}>{name.split(" ").map(x=>x[0]).join("")}</span>
                    </div>
                    <div>
                      <p style={{ color: "#1e293b", fontSize: 15, fontWeight: 800, margin: 0 }}>{name}</p>
                      <span style={{ color: "#d97706", fontSize: 13, fontWeight: 800 }}>1240 XP</span>
                    </div>
                  </div>
                  <button onClick={() => setXpModal(true)} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 14px", color: "#d97706", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(245,158,11,0.1)"}>
                    <Star style={{ width: 14, height: 14 }} /> Düzelt
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Mock XP Modal */}
      {xpModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(255,255,255,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 16, padding: 24, width: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.1)" }}>
             <h3 style={{ color: "#1e293b", fontSize: 18, margin: "0 0 16px 0", fontWeight: 800 }}>XP Düzelt (Mock)</h3>
             <p style={{ color: "#64748b", fontSize: 14, fontWeight: 500 }}>Ekip İzleme sayfasındaki modülün aynısıdır.</p>
             <button onClick={() => setXpModal(false)} style={{ background: "#f1f5f9", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, padding: 12, color: "#475569", width: "100%", marginTop: 24, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
