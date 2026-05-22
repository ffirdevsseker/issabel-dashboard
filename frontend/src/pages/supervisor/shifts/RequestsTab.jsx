import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, Eye } from "lucide-react";

const TYPE_COLORS = {
  degisiklik: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  izin:       { bg: "#FEFCE8", color: "#A16207", border: "#FDE047" },
  erken:      { bg: "#FFF7ED", color: "#D97706", border: "#FED7AA" },
};

const TYPE_LABELS = {
  degisiklik: "Vardiya Değişiklik",
  izin: "İzin Talebi",
  erken: "Erken Çıkış",
  // Backend tiplerine de match et
  vardiya_degisim: "Vardiya Değişiklik",
  izin_talep: "İzin Talebi",
};

function getInitials(name = "") {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toLocaleUpperCase('tr-TR');
}

function Toast({ msg, onClose }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#fff",
      padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 2000,
      display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      animation: "fadeIn 0.3s ease",
    }}>
      <CheckCircle size={16} color="#4ADE80" /> {msg}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, marginLeft: 6 }}>✕</button>
    </div>
  );
}

// Onay zinciri: durum'a göre dinamik
function ApprovalChain({ durum }) {
  const isSuperDone = ["admin_karari", "onaylandi", "reddedildi"].includes(durum);
  const isAdminDone = ["onaylandi", "reddedildi"].includes(durum);
  const isSuperPending = durum === "gonderildi" || durum === "supervisor_gorus";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isSuperDone ? "#15803D" : "#D97706" }}>
        {isSuperDone ? <CheckCircle size={12} /> : <span style={{ fontSize: 13 }}>⏳</span>}
        <span style={{ fontWeight: 600 }}>Süpervizör</span>
      </div>
      <div style={{ width: 20, height: 1, background: "#E2E8F0" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isAdminDone ? "#15803D" : isSuperDone ? "#D97706" : "#94A3B8" }}>
        {isAdminDone
          ? <CheckCircle size={12} />
          : isSuperDone
            ? <span style={{ fontSize: 13 }}>⏳</span>
            : <span style={{ fontSize: 12 }}>—</span>
        }
        <span style={{ fontWeight: 600 }}>Yönetici</span>
      </div>
      <div style={{ width: 20, height: 1, background: "#E2E8F0" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: durum === "onaylandi" ? "#15803D" : "#94A3B8" }}>
        {durum === "onaylandi" ? <CheckCircle size={12} /> : <span style={{ fontSize: 12 }}>—</span>}
        <span style={{ fontWeight: 600 }}>Admin</span>
      </div>
    </div>
  );
}

function RequestCard({ req, onApprove, onReject, submitting }) {
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  // Alan adları (backend'den gelebilecek çeşitli formatlara karşı güvenli)
  const name = req.personel?.full_name || req.personel?.username || `Personel #${req.personel_id}`;
  const ext = req.personel?.extension || "—";
  const talep_tarih = req.talep_tarih
    ? new Date(req.talep_tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
    : "—";
  const typeKey = req.talep_tur ? "degisiklik" : req.tur || "degisiklik";
  const tc = TYPE_COLORS[typeKey] || TYPE_COLORS.degisiklik;
  const typeLabel = TYPE_LABELS[typeKey] || typeKey;

  if (done) {
    return (
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <CheckCircle size={20} color="#15803D" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>{name} — {doneMsg}</span>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#DBEAFE,#BFDBFE)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1D4ED8" }}>{getInitials(name)}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{name}</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Dahili: {ext}</span>
          </div>
          <span style={{ fontSize: 11, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>
            {typeLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{talep_tarih}</span>
      </div>

      {/* Talep detayı */}
      {req.personel_gerekce && (
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12, fontStyle: "italic" }}>
          "{req.personel_gerekce}"
        </div>
      )}

      {/* Talep vardiyaları */}
      {req.mevcut_vardiya_id && req.talep_tur && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#475569", background: "#fff", padding: "5px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontWeight: 600 }}>
            Mevcut Vardiya #{req.mevcut_vardiya_id}
          </span>
          <ArrowRight size={16} color="#94A3B8" style={{ animation: "slideRight 1.2s ease-in-out infinite" }} />
          <span style={{ fontSize: 13, color: "#15803D", background: "#DCFCE7", padding: "5px 10px", borderRadius: 8, border: "1px solid #BBF7D0", fontWeight: 700 }}>
            {req.talep_tur} · {req.talep_tarih}
          </span>
        </div>
      )}

      {/* Onay zinciri */}
      <ApprovalChain durum={req.durum} />

      {/* Aksiyonlar */}
      {req.durum === "gonderildi" && !showReject ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={async () => {
              try {
                await onApprove(req.id);
                setDoneMsg("Görüşünüz iletildi. Admin onayı bekleniyor.");
                setDone(true);
              } catch (e) {
                alert(`Hata: ${e.message}`);
              }
            }}
            disabled={submitting}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "none", borderRadius: 10, background: "#16A34A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            <CheckCircle size={15} /> Onayla
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={submitting}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1px solid #DC2626", borderRadius: 10, background: "#fff", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            <XCircle size={15} /> Reddet
          </button>
        </div>
      ) : req.durum === "gonderildi" && showReject ? (
        <div>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Red sebebini yazın (zorunlu)..."
            rows={2}
            style={{ width: "100%", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#0F172A", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 8, background: "#FFF5F5" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowReject(false)} style={{ flex: 1, padding: "8px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              İptal
            </button>
            <button
              onClick={async () => {
                if (!rejectReason.trim()) return;
                try {
                  await onReject(req.id, rejectReason.trim());
                  setDoneMsg("Red görüşünüz iletildi.");
                  setShowReject(false);
                  setDone(true);
                } catch (e) {
                  alert(`Hata: ${e.message}`);
                }
              }}
              disabled={!rejectReason.trim() || submitting}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: rejectReason.trim() ? "#DC2626" : "#F1F5F9", color: rejectReason.trim() ? "#fff" : "#94A3B8", fontSize: 13, fontWeight: 700, cursor: rejectReason.trim() ? "pointer" : "default" }}
            >
              Gönder
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>
          Bu talep "{req.durum}" durumunda — işlem tamamlandı.
        </div>
      )}
    </div>
  );
}

export default function RequestsTab({ pendingRequests, loadingRequests, submitOpinion, loadPendingRequests }) {
  const [subTab, setSubTab] = useState("personel");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (reqId) => {
    setSubmitting(true);
    try {
      await submitOpinion(reqId, "uygun", "Uygun görülmüştür");
      await loadPendingRequests();
      showToast("Görüşünüz iletildi. Admin onayı bekleniyor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (reqId, gerekce) => {
    setSubmitting(true);
    try {
      await submitOpinion(reqId, "uygun_degil", gerekce);
      await loadPendingRequests();
      showToast("Red görüşünüz iletildi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[
          { id: "personel", label: "Personelden", count: pendingRequests.length },
          { id: "admin", label: "Adminden", count: 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
            border: `1px solid ${subTab === t.id ? "#2563EB" : "#E2E8F0"}`,
            borderRadius: 10, background: subTab === t.id ? "#EFF6FF" : "#fff",
            color: subTab === t.id ? "#2563EB" : "#64748B",
            fontSize: 13, fontWeight: subTab === t.id ? 700 : 500, cursor: "pointer",
          }}>
            {t.label}
            <span style={{
              background: subTab === t.id ? "#2563EB" : "#F1F5F9",
              color: subTab === t.id ? "#fff" : "#64748B",
              fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 7px",
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {subTab === "personel" && (
          loadingRequests ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>
              <div style={{ width: 20, height: 20, border: "2px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              Talepler yükleniyor...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#94A3B8", fontSize: 14, fontWeight: 500 }}>Bekleyen personel talebi yok. 🎉</p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                onApprove={handleApprove}
                onReject={handleReject}
                submitting={submitting}
              />
            ))
          )
        )}
        {subTab === "admin" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "#94A3B8", fontSize: 14, fontWeight: 500 }}>
              Yönetici talimatları yakında burada görünecek.
            </p>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
