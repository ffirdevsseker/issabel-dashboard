import { useState } from "react";
import { CheckSquare, AlertCircle, CheckCircle, XCircle, FileText, User, Headphones } from "lucide-react";

export default function SupervisorApprovals() {
  const [tab, setTab] = useState("sikayetler");
  const [selectedItem, setSelectedItem] = useState(null);

  const SIKAYETLER = [
    { id: 1, name: "Ahmet Yıldız", customer: "Canan Kaya", date: "Bugün 10:25", category: "Davranış", status: "bekliyor", text: "Müşteri kargo gecikmesi nedeniyle hakaret etti.", audio: "call_1234.mp3" },
    { id: 2, name: "Mehmet Demir", customer: "Burak Öztürk", date: "Dün 15:40", category: "İade", status: "onaylandi", text: "Ürün yırtık geldiği için iade talebinde zorluk çıkarıldı." },
  ];

  const KB_ONERILERI = [
    { id: 101, name: "Fatma Kaya", title: "Yeni İade Prosedürü (Nisan Güncellemesi)", category: "Prosedürler", date: "Bugün 09:10", status: "bekliyor", text: "Nisan ayında değişen iade prosedürleri hakkında müşterilere iletilmesi gereken yeni metin ektedir." },
  ];

  const currentData = tab === "sikayetler" ? SIKAYETLER : KB_ONERILERI;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, margin: 0 }}>Onay Merkezi</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            {[
              { id: "sikayetler", label: "Şikayet Onayları", count: 2 },
              { id: "kb", label: "Bilgi Bankası Önerileri", count: 1 },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedItem(null); }} style={{
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
      <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, display: "flex", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
        
        {/* List (Left) */}
        <div style={{ width: 380, borderRight: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
          <div style={{ padding: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ color: "#64748b", fontSize: 12, margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
              {tab === "sikayetler" ? "Şikayet onayı nihaidir. Onaylandığında personelden 20 XP düşülür. Admin sonradan iptal edebilir." : "Bilgi bankası içeriklerini inceleyip düzenleyerek yayına alabilirsiniz."}
            </p>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {currentData.map(item => (
              <div key={item.id} onClick={() => setSelectedItem(item)} style={{
                background: selectedItem?.id === item.id ? "#fff" : "transparent",
                border: `1px solid ${selectedItem?.id === item.id ? "#3b82f6" : "rgba(0,0,0,0.06)"}`,
                borderRadius: 12, padding: 16, cursor: "pointer",
                boxShadow: selectedItem?.id === item.id ? "0 4px 12px rgba(59,130,246,0.1)" : "none"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 800 }}>{tab === "sikayetler" ? item.customer : item.title}</span>
                  <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>{item.date}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569", fontSize: 12, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: item.status === "bekliyor" ? "rgba(249,115,22,0.1)" : "rgba(16,185,129,0.1)", color: item.status === "bekliyor" ? "#ea580c" : "#059669" }}>
                    {item.status === "bekliyor" ? "Bekliyor" : "Onaylandı"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail (Right) */}
        <div style={{ flex: 1, padding: 32, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!selectedItem ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
              Soldan bir kayıt seçin.
            </div>
          ) : (
            <div style={{ maxWidth: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: tab === "sikayetler" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${tab === "sikayetler" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}` }}>
                  {tab === "sikayetler" ? <AlertCircle style={{ width: 28, height: 28, color: "#dc2626" }} /> : <FileText style={{ width: 28, height: 28, color: "#2563eb" }} />}
                </div>
                <div>
                  <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 800, margin: 0 }}>{tab === "sikayetler" ? "Şikayet İncelemesi" : "KB Öneri İncelemesi"}</h2>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0", fontWeight: 600 }}>ID: #{selectedItem.id}</p>
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
                {/* Şikayet Alanları */}
                {tab === "sikayetler" && (
                  <>
                    <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Oluşturan Personel</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <User style={{ width: 14, height: 14, color: "#475569" }} />
                          <span style={{ color: "#1e293b", fontSize: 14, fontWeight: 700 }}>{selectedItem.name}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Müşteri Adı</p>
                        <span style={{ color: "#1e293b", fontSize: 14, fontWeight: 700 }}>{selectedItem.customer}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Kategori</p>
                        <span style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", padding: "6px 12px", borderRadius: 8, color: "#475569", fontSize: 12, fontWeight: 700 }}>{selectedItem.category}</span>
                      </div>
                    </div>

                    {selectedItem.audio && (
                      <div style={{ background: "#fff", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(59,130,246,0.05)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
                          <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid #fff", marginLeft: 4 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: "30%", height: "100%", background: "#3b82f6", borderRadius: 3 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>0:12</span>
                            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>4:35</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* KB Alanları */}
                {tab === "kb" && (
                  <>
                    <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Öneren</p>
                    <span style={{ color: "#1e293b", fontSize: 14, fontWeight: 800, display: "block", marginBottom: 20 }}>{selectedItem.name}</span>
                    
                    <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Önerilen Başlık & Kategori</p>
                    <input type="text" defaultValue={selectedItem.title} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 12, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", marginBottom: 20, boxSizing: "border-box" }} />
                  </>
                )}

                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Açıklama / Metin</p>
                <textarea defaultValue={selectedItem.text} rows={5} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}></textarea>
              </div>

              {selectedItem.status === "bekliyor" && (
                <div>
                  <textarea placeholder="Varsa gerekçenizi yazın..." rows={2} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", resize: "none", marginBottom: 16, boxSizing: "border-box" }}></textarea>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 14, color: "#059669", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(16,185,129,0.15)"} onMouseLeave={e => e.currentTarget.style.background="rgba(16,185,129,0.1)"}>
                      <CheckCircle style={{ width: 18, height: 18 }} /> {tab === "sikayetler" ? "Şikayeti Onayla (-20 XP)" : "Öneriyi Yayına Al"}
                    </button>
                    <button style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: 14, color: "#dc2626", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.15)"} onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.1)"}>
                      <XCircle style={{ width: 18, height: 18 }} /> Reddet / İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
