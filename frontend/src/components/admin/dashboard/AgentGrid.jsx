import { useState } from "react";
import { Phone, Search, Star } from "lucide-react";

const DURUM = {
  aktif:   { color: "#34d399", label: "Aktif"   },
  mesgul:  { color: "#f59e0b", label: "Meşgul"  },
  mola:    { color: "#a78bfa", label: "Mola"    },
  offline: { color: "#475569", label: "Offline" },
};

function AgentCard({ agent, isAdmin, onEndBreak }) {
  const [busy, setBusy] = useState(false);
  const d = DURUM[agent.anlik_durum] || DURUM.offline;
  const alarm = agent.mola_asimi;

  const handleEndBreak = async () => {
    setBusy(true);
    try { await onEndBreak(agent.id); } finally { setBusy(false); }
  };

  return (
    <div style={{
      background: alarm
        ? "linear-gradient(145deg, #fff5f5 0%, #fff1f2 100%)"
        : "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
      border: `1px solid ${alarm ? "rgba(239,68,68,0.22)" : "rgba(148,163,184,0.14)"}`,
      borderRadius: 12,
      padding: "11px 12px",
      position: "relative",
      transition: "box-shadow 0.2s",
      boxShadow: alarm
        ? "0 0 14px rgba(239,68,68,0.08), 0 4px 12px rgba(15,23,42,0.06)"
        : "0 4px 12px rgba(15,23,42,0.06)",
    }}>
      {/* Status bar at top */}
      <div style={{
        height: 2, borderRadius: 1, marginBottom: 10,
        background: `linear-gradient(90deg, ${d.color}80, transparent)`,
        boxShadow: `0 0 6px ${d.color}50`,
      }} />

      {/* Alarm pulse */}
      {alarm && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 7, height: 7, borderRadius: "50%",
          background: "#ef4444",
          boxShadow: "0 0 8px #ef4444",
        }} className="pulse-dot" />
      )}

      <div style={{
        fontWeight: 700, fontSize: 12, color: "#0f172a",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        paddingRight: alarm ? 16 : 0, marginBottom: 2,
      }}>
        {agent.ad_soyad}
      </div>
      <div style={{
        fontSize: 10, color: "#64748b",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: 8,
      }}>
        {agent.departman_adi || "—"}
      </div>

      {/* Durum pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: `${d.color}14`,
        border: `1px solid ${d.color}28`,
        borderRadius: 999, padding: "2px 7px",
        marginBottom: 8,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: d.color, boxShadow: `0 0 4px ${d.color}`,
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: d.color }}>{d.label}</span>
        {agent.anlik_durum === "mola" && agent.mola_tipi && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>· {agent.mola_sure_dk}dk</span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#64748b" }}>
          <Phone size={9} color="#378ADD" /> {agent.bugun_toplam_cagri}
        </span>
        {agent.bugun_ort_csat > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#f59e0b" }}>
            <Star size={9} fill="#f59e0b" color="#f59e0b" /> {agent.bugun_ort_csat.toFixed(1)}
          </span>
        )}
      </div>

      {alarm && isAdmin && (
        <button
          onClick={handleEndBreak}
          disabled={busy}
          style={{
            marginTop: 9, width: "100%",
            background: busy ? "transparent" : "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.24)",
            borderRadius: 6, padding: "4px 0",
            color: "#dc2626", fontSize: 10, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            letterSpacing: "0.02em",
          }}
        >
          {busy ? "..." : "Molayı Bitir"}
        </button>
      )}
    </div>
  );
}

export default function AgentGrid({ agents, isAdmin, onEndBreak }) {
  const [search, setSearch] = useState("");
  const [durumFilter, setDurumFilter] = useState("tumu");

  const filtered = (agents || []).filter((a) => {
    const q = search.toLowerCase();
    const nameMatch = !q || a.ad_soyad?.toLowerCase().includes(q) || a.departman_adi?.toLowerCase().includes(q);
    const durumMatch = durumFilter === "tumu" || a.anlik_durum === durumFilter;
    return nameMatch && durumMatch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={12} style={{
            position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", color: "#94a3b8",
            pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Personel ara..."
            style={{
              width: "100%", height: 32, paddingLeft: 28, paddingRight: 10,
              background: "#ffffff",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 8, color: "#0f172a", fontSize: 12, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={durumFilter}
          onChange={(e) => setDurumFilter(e.target.value)}
          style={{
            height: 32, padding: "0 8px",
            background: "#ffffff",
            border: "1px solid rgba(148,163,184,0.16)",
            borderRadius: 8, color: "#0f172a", fontSize: 11, outline: "none", cursor: "pointer",
          }}
        >
          <option value="tumu">Tümü</option>
          <option value="aktif">Aktif</option>
          <option value="mesgul">Meşgul</option>
          <option value="mola">Mola</option>
          <option value="offline">Offline</option>
        </select>
        <span style={{
          fontSize: 11, color: "#64748b",
          alignSelf: "center", whiteSpace: "nowrap",
        }}>
          {filtered.length} kişi
        </span>
      </div>

      {/* 4-column card grid — fills remaining height */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        alignContent: "start",
        paddingRight: 2,
      }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13, padding: "32px 0",
          }}>
            Sonuç bulunamadı
          </div>
        ) : (
          filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} isAdmin={isAdmin} onEndBreak={onEndBreak} />
          ))
        )}
      </div>
    </div>
  );
}
