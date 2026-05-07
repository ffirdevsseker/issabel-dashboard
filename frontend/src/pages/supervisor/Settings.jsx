import { useState } from "react";
import { User, Bell, Users, Lock, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SupervisorSettings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("profil");

  const TABS = [
    { id: "profil", label: "Profil Bilgileri", icon: User },
    { id: "bildirim", label: "Bildirim Tercihleri", icon: Bell },
    { id: "ekip", label: "Ekip Tercihleri", icon: Users },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, margin: 0 }}>Ayarlar</h2>
        <button style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}>
          <Save style={{ width: 16, height: 16 }} /> Değişiklikleri Kaydet
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 24 }}>
        {/* Sidebar */}
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 8 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? "rgba(59,130,246,0.08)" : "#fff",
                border: `1px solid ${tab === t.id ? "rgba(59,130,246,0.2)" : "rgba(0,0,0,0.05)"}`,
                borderRadius: 12, padding: "14px 16px", color: tab === t.id ? "#2563eb" : "#64748b",
                fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                textAlign: "left", boxShadow: tab === t.id ? "0 2px 8px rgba(59,130,246,0.1)" : "0 1px 3px rgba(0,0,0,0.02)"
              }}>
                <Icon style={{ width: 18, height: 18 }} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 32, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          
          {tab === "profil" && (
            <div style={{ maxWidth: 500 }}>
              <h3 style={{ color: "#1e293b", fontSize: 18, margin: "0 0 24px 0", fontWeight: 800 }}>Profil Bilgileri</h3>
              
              <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #bfdbfe", boxShadow: "0 4px 12px rgba(37,99,235,0.1)" }}>
                  <span style={{ color: "#2563eb", fontSize: 28, fontWeight: 800 }}>{user?.full_name?.split(" ").map(n=>n[0]).join("") || "SP"}</span>
                </div>
                <div>
                  <button style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "8px 16px", color: "#1e293b", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>Fotoğraf Değiştir</button>
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0, fontWeight: 500 }}>Önerilen: 256x256px JPG/PNG</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ color: "#475569", fontSize: 13, marginBottom: 8, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>Ad Soyad</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#94a3b8" }}><Lock style={{ width: 12, height: 12 }} /> Admin tarafından kilitli</span>
                  </label>
                  <input type="text" value={user?.full_name || ""} disabled style={{ width: "100%", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, padding: 14, color: "#94a3b8", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: "#475569", fontSize: 13, marginBottom: 8, display: "block", fontWeight: 600 }}>Kullanıcı Adı</label>
                  <input type="text" value={user?.username || ""} disabled style={{ width: "100%", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, padding: 14, color: "#94a3b8", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: "#475569", fontSize: 13, marginBottom: 8, display: "block", fontWeight: 600 }}>E-posta</label>
                  <input type="email" defaultValue={`${user?.username || "sup"}@sporthink.com.tr`} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }} />
                </div>
                <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.08)", margin: "8px 0" }} />
                <div>
                  <label style={{ color: "#475569", fontSize: 13, marginBottom: 8, display: "block", fontWeight: 600 }}>Yeni Şifre</label>
                  <input type="password" placeholder="••••••••" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }} />
                </div>
              </div>
            </div>
          )}

          {tab === "bildirim" && (
            <div style={{ maxWidth: 600 }}>
              <h3 style={{ color: "#1e293b", fontSize: 18, margin: "0 0 24px 0", fontWeight: 800 }}>Bildirim Tercihleri</h3>
              
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 20, marginBottom: 28, display: "flex", gap: 16 }}>
                <AlertTriangle style={{ width: 24, height: 24, color: "#dc2626", flexShrink: 0 }} />
                <div>
                  <p style={{ color: "#b91c1c", fontSize: 15, fontWeight: 800, margin: "0 0 6px 0" }}>Admin Talimatları</p>
                  <p style={{ color: "#dc2626", fontSize: 13, margin: 0, lineHeight: 1.5, fontWeight: 600 }}>Admin'den gelen talimat bildirimleri KAPATILAMAZ. Uygulamada modal popup ve kırmızı şerit olarak zorunlu gösterilir.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { id: "mola", label: "Mola Talebi Geldiğinde", desc: "Personel mola talep ettiğinde uygulama içi bildirim al.", on: true },
                  { id: "acil", label: "Acil Mola Talebi", desc: "Personel acil mola istediğinde yüksek sesli uyarı ver.", on: true },
                  { id: "sikayet", label: "Şikayet Onayı Bekliyor", desc: "Yeni şikayet kaydı geldiğinde bildirim al.", on: true },
                  { id: "override", label: "Admin İptali (Override)", desc: "Admin verdiğiniz bir kararı geri aldığında bildirim al.", on: true },
                  { id: "kb", label: "Bilgi Bankası Önerisi", desc: "Yeni bir içerik önerisi geldiğinde bildirim al.", on: false },
                ].map((b, i) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                    <div>
                      <p style={{ color: "#1e293b", fontSize: 15, fontWeight: 700, margin: "0 0 6px 0" }}>{b.label}</p>
                      <p style={{ color: "#64748b", fontSize: 13, margin: 0, fontWeight: 500 }}>{b.desc}</p>
                    </div>
                    {/* Toggle Switch */}
                    <div style={{ width: 48, height: 26, borderRadius: 13, background: b.on ? "#3b82f6" : "#cbd5e1", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: b.on ? 24 : 2, transition: "left 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "ekip" && (
            <div style={{ maxWidth: 600 }}>
              <h3 style={{ color: "#1e293b", fontSize: 18, margin: "0 0 24px 0", fontWeight: 800 }}>Ekip Tercihleri</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div>
                  <label style={{ color: "#1e293b", fontSize: 14, fontWeight: 700, marginBottom: 6, display: "block" }}>Mola Çakışma Uyarı Eşiği</label>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Aynı anda kaç kişi molada olduğunda sistem uyarı versin?</p>
                  <select defaultValue="3" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 600, outline: "none", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}>
                    <option value="2">2 Kişi</option>
                    <option value="3">3 Kişi (Varsayılan)</option>
                    <option value="4">4 Kişi</option>
                    <option value="5">5 Kişi</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: "#1e293b", fontSize: 14, fontWeight: 700, marginBottom: 6, display: "block" }}>Otomatik Toplu Onay</label>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>"Uygun Olanları Toplu Onayla" butonuna basıldığında uygulanacak kural.</p>
                  <select defaultValue="no_conflict" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 600, outline: "none", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}>
                    <option value="all">Sadece bekleme süresi geleni onayla</option>
                    <option value="no_conflict">Çakışma yoksa onayla (Önerilen)</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: "#1e293b", fontSize: 14, fontWeight: 700, marginBottom: 6, display: "block" }}>Vardiya Çakışma Toleransı</label>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Personelin vardiya değiştirme taleplerinde uygulanacak esneklik kuralı.</p>
                  <select defaultValue="strict" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14, color: "#1e293b", fontSize: 14, fontWeight: 600, outline: "none", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}>
                    <option value="strict">Katı (Aynı gün vardiya değiştirilemez)</option>
                    <option value="flexible">Esnek (Sadece saatler uyuyorsa değiştir)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
