import { useState } from "react";
import { X, Bell, Mail, Send } from "lucide-react";

export default function PublishModal({ draftCount, onClose, onPublish, personnel }) {
  const [selectedPersons, setSelectedPersons] = useState(
    personnel.filter(p => p.shifts.some(s => s.draft)).map(p => p.id)
  );
  const [sendMobile, setSendMobile] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  const affectedPersonnel = personnel.filter(p => p.shifts.some(s => s.draft));

  const togglePerson = (id) => {
    setSelectedPersons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: "1px solid #E2E8F0" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Vardiyaları Yayınla</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B" }}>{draftCount} değişiklik yayınlanacak</p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#64748B" />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Etkilenen Personel</p>
          {affectedPersonnel.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94A3B8" }}>Taslak değişiklik bulunamadı.</p>
          ) : (
            affectedPersonnel.map(p => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                <input type="checkbox" checked={selectedPersons.includes(p.id)} onChange={() => togglePerson(p.id)} />
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#1D4ED8" }}>{p.name.split(" ").map(x=>x[0]).join("")}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{p.name}</span>
              </label>
            ))
          )}

          <p style={{ margin: "16px 0 10px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Bildirim Kanalı</p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Mobil Bildirim", icon: Bell, state: sendMobile, setState: setSendMobile },
              { label: "E-posta", icon: Mail, state: sendEmail, setState: setSendEmail },
            ].map(({ label, icon: Icon, state, setState }) => (
              <div key={label} onClick={() => setState(p=>!p)} style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                border: `1px solid ${state ? "#2563EB" : "#E2E8F0"}`,
                borderRadius: 10, background: state ? "#EFF6FF" : "#fff",
                cursor: "pointer", transition: "all 0.15s"
              }}>
                <Icon size={16} color={state ? "#2563EB" : "#94A3B8"} />
                <span style={{ fontSize: 13, fontWeight: 600, color: state ? "#2563EB" : "#64748B" }}>{label}</span>
                <div style={{ marginLeft: "auto", width: 32, height: 18, borderRadius: 9, background: state ? "#2563EB" : "#CBD5E1", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, left: state ? 16 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
            İptal
          </button>
          <button onClick={onPublish} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", border: "none", borderRadius: 10, background: "#2563EB", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            <Send size={14} /> Yayınla ve Bildir
          </button>
        </div>
      </div>
    </div>
  );
}
