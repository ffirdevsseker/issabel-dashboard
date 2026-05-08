import { useState } from "react";
import { Clock, Moon, PhoneMissed, PhoneOutgoing } from "lucide-react";

function fmtSn(sn) {
  if (!sn) return "—";
  const m = Math.floor(sn / 60);
  const s = sn % 60;
  return m ? `${m}d ${s}s` : `${s}s`;
}

function DurumBadge({ durum, mesai_disi }) {
  if (mesai_disi) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 9.5, fontWeight: 800,
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.2)",
        color: "#6366f1",
        borderRadius: 99, padding: "2px 7px",
      }}>
        <Moon size={8} />
        Mesai Dışı
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 9.5, fontWeight: 800,
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
      color: "#ef4444",
      borderRadius: 99, padding: "2px 7px",
    }}>
      <PhoneMissed size={8} />
      Kaçan
    </span>
  );
}

function CallbackButton({ item, onCallback, busy }) {
  return (
    <button
      onClick={() => onCallback(item)}
      disabled={busy}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: busy ? "#f8fafc" : "#fff",
        border: "1px solid rgba(55,138,221,0.3)",
        borderRadius: 8, padding: "5px 10px",
        color: "#378ADD", fontSize: 11, fontWeight: 700,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.6 : 1,
        transition: "all 0.15s",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!busy) {
          e.currentTarget.style.background = "rgba(55,138,221,0.06)";
          e.currentTarget.style.borderColor = "rgba(55,138,221,0.5)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.borderColor = "rgba(55,138,221,0.3)";
      }}
    >
      <PhoneOutgoing size={11} color="#378ADD" />
      {busy ? "Aranıyor…" : "Geri Ara"}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      height: 52, borderRadius: 10,
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.05)",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.025), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
      }} />
    </div>
  );
}

export default function MissedCallsTable({ items, loading }) {
  const [busyId,  setBusyId]  = useState(null);
  const [filter,  setFilter]  = useState("tumu"); // "tumu" | "kacan" | "mesai_disi"

  const list = items || [];

  const filtered = list.filter((item) => {
    if (filter === "kacan")       return !item.mesai_disi;
    if (filter === "mesai_disi")  return item.mesai_disi;
    return true;
  });

  const kacanCount      = list.filter((i) => !i.mesai_disi).length;
  const mesaiDisiCount  = list.filter((i) => i.mesai_disi).length;

  const handleCallback = async (item) => {
    setBusyId(item.id);
    await new Promise((r) => setTimeout(r, 1200));
    setBusyId(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        <style>{`
          @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        `}</style>
      </div>
    );
  }

  if (!list.length) {
    return (
      <div style={{ textAlign: "center", padding: "28px 0" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(16,185,129,0.07)",
          border: "1px solid rgba(16,185,129,0.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px",
        }}>
          <PhoneMissed size={17} color="#10b981" />
        </div>
        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
          Son 2 günde kaçan çağrı yok
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>

      {/* Filtre chips */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        {[
          { key: "tumu",       label: "Tümü",        count: list.length,    color: "#64748b" },
          { key: "kacan",      label: "Kaçan",       count: kacanCount,     color: "#ef4444" },
          { key: "mesai_disi", label: "Mesai Dışı",  count: mesaiDisiCount, color: "#6366f1" },
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 999,
            border: `1.5px solid ${filter === key ? color : "rgba(0,0,0,0.08)"}`,
            background: filter === key ? `${color}0e` : "#fff",
            color: filter === key ? color : "#64748b",
            fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s",
          }}>
            {label}
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: filter === key ? `${color}18` : "rgba(0,0,0,0.06)",
              color: filter === key ? color : "#94a3b8",
              borderRadius: 999, padding: "0 5px",
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Tablo başlığı */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "50px 1fr 90px 60px 90px",
        padding: "0 10px 6px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        {["Tür", "Numara / Müşteri", "Kuyruk", "Bekleme", ""].map((col) => (
          <span key={col} style={{
            fontSize: 10.5, fontWeight: 600, color: "#94a3b8",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>{col}</span>
        ))}
      </div>

      {/* Satırlar */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: "20px 0" }}>
            Bu filtrede kayıt yok
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 90px 60px 90px",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 10,
                background: "#fff",
                border: item.mesai_disi
                  ? "1px solid rgba(99,102,241,0.12)"
                  : "1px solid rgba(239,68,68,0.09)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)")}
            >
              {/* Tür badge */}
              <DurumBadge durum={item.durum} mesai_disi={item.mesai_disi} />

              {/* Numara + tarih */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700, color: "#0f172a",
                  fontFamily: "monospace", letterSpacing: "0.03em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.arayan_numara}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={8} color="#94a3b8" />
                  {item.tarih_kisa}
                </div>
              </div>

              {/* Kuyruk */}
              <div style={{
                fontSize: 10.5, color: "#64748b", fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {item.kuyruk_adi || "—"}
              </div>

              {/* Bekleme */}
              <div style={{
                fontSize: 11.5, fontWeight: 700,
                color: item.bekleme_sn > 90 ? "#ef4444" : item.bekleme_sn > 45 ? "#f59e0b" : "#64748b",
                fontVariantNumeric: "tabular-nums",
              }}>
                {fmtSn(item.bekleme_sn)}
              </div>

              {/* Callback */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <CallbackButton
                  item={item}
                  onCallback={handleCallback}
                  busy={busyId === item.id}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      `}</style>
    </div>
  );
}
