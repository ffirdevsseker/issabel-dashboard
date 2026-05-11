import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Coffee, Phone, Search, Star, WifiOff } from "lucide-react";

const PAGE_SIZE = 20;

const DURUM = {
  aktif:   { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  label: "Aktif"       },
  mesgul:  { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)",  label: "Görüşmede"   },
  mola:    { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Mola"        },
  offline: { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", label: "Offline"     },
};

const UNVAN_STYLE = {
  "Bronz":  { color: "#92400e", bg: "rgba(146,64,14,0.08)"  },
  "Gumus":  { color: "#475569", bg: "rgba(71,85,105,0.08)"  },
  "Altin":  { color: "#d97706", bg: "rgba(217,119,6,0.08)"  },
  "Platin": { color: "#0891b2", bg: "rgba(8,145,178,0.08)"  },
};

function StatusDot({ color }) {
  return (
    <div style={{
      width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
      boxShadow: `0 0 0 2px ${color}28`,
    }} />
  );
}

function AgentRow({ agent, isAdmin, onEndBreak }) {
  const [busy, setBusy] = useState(false);
  const d     = DURUM[agent.anlik_durum] || DURUM.offline;
  const alarm = agent.mola_asimi;
  const sipKopuk = agent.sip_durumu === "koptu";
  const unvanStyle = UNVAN_STYLE[agent.unvan] || null;

  const handleEndBreak = async () => {
    setBusy(true);
    try { await onEndBreak(agent.id); } finally { setBusy(false); }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 90px 80px 60px 90px",
      alignItems: "center",
      padding: "10px 14px",
      borderRadius: 10,
      background: alarm ? "rgba(239,68,68,0.025)" : "transparent",
      border: alarm ? "1px solid rgba(239,68,68,0.12)" : "1px solid transparent",
      transition: "background 0.15s",
      cursor: "default",
    }}
      onMouseEnter={(e) => {
        if (!alarm) e.currentTarget.style.background = "rgba(0,0,0,0.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = alarm ? "rgba(239,68,68,0.025)" : "transparent";
      }}
    >
      {/* Ad + Dept */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: `${d.color}15`,
          border: `1.5px solid ${d.color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: d.color,
        }}>
          {agent.ad_soyad?.charAt(0).toUpperCase() || "?"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#0f172a",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {agent.ad_soyad}
            {alarm && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                color: "#ef4444", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 5, padding: "1px 5px", flexShrink: 0,
              }}>
                AŞIM
              </span>
            )}
            {sipKopuk && (
              <WifiOff size={9} color="#ef4444" style={{ flexShrink: 0 }} />
            )}
          </div>
          <div style={{
            fontSize: 11, color: "#94a3b8", fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {agent.departman_adi || "—"}
            {agent.dahili_no ? ` · ${agent.dahili_no}` : ""}
          </div>
        </div>
      </div>

      {/* Durum */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <StatusDot color={d.color} />
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: d.color }}>
            {d.label}
          </div>
          {agent.anlik_durum === "mola" && agent.mola_sure_dk > 0 && (
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
              {agent.mola_sure_dk}dk
              {agent.planlanan_sure_dk > 0 && ` / ${agent.planlanan_sure_dk}dk`}
            </div>
          )}
        </div>
      </div>

      {/* Çağrı */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 13, fontWeight: 700, color: "#0f172a",
      }}>
        <Phone size={11} color="#94a3b8" />
        {agent.bugun_toplam_cagri}
      </div>

      {/* CSAT */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 12, fontWeight: 700,
        color: agent.bugun_ort_csat >= 4 ? "#10b981"
             : agent.bugun_ort_csat >= 3 ? "#f59e0b"
             : agent.bugun_ort_csat > 0  ? "#ef4444"
             : "#cbd5e1",
      }}>
        {agent.bugun_ort_csat > 0 ? (
          <>
            <Star size={10} fill="currentColor" color="currentColor" />
            {agent.bugun_ort_csat.toFixed(1)}
          </>
        ) : (
          <span style={{ color: "#e2e8f0" }}>—</span>
        )}
      </div>

      {/* Aksiyonlar / Unvan */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        {unvanStyle && agent.unvan && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: "0.02em",
            color: unvanStyle.color, background: unvanStyle.bg,
            borderRadius: 5, padding: "2px 6px",
          }}>
            {agent.unvan.toUpperCase()}
          </span>
        )}
        {alarm && isAdmin && (
          <button
            onClick={handleEndBreak}
            disabled={busy}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#fff",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, padding: "4px 9px",
              color: "#dc2626", fontSize: 10, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1, transition: "all 0.15s",
            }}
          >
            <Coffee size={9} color="#dc2626" />
            {busy ? "..." : "Bitir"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Tablo header ──────────────────────────────────────────────────────────── */
function TableHeader() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 90px 80px 60px 90px",
      padding: "0 14px 8px",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      marginBottom: 4,
    }}>
      {["Personel", "Durum", "Çağrı", "CSAT", ""].map((col) => (
        <span key={col} style={{
          fontSize: 11, fontWeight: 600, color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {col}
        </span>
      ))}
    </div>
  );
}

/* ─── Filter chips ──────────────────────────────────────────────────────────── */
function FilterChip({ label, count, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 11px", borderRadius: 999,
      border: `1.5px solid ${active ? color : "rgba(0,0,0,0.08)"}`,
      background: active ? `${color}0e` : "#ffffff",
      color: active ? color : "#64748b",
      fontSize: 11.5, fontWeight: 700,
      cursor: "pointer", transition: "all 0.15s",
    }}>
      {color !== "tumu" && (
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: active ? color : "#cbd5e1",
        }} />
      )}
      {label}
      <span style={{
        fontSize: 10.5, fontWeight: 800,
        background: active ? `${color}18` : "rgba(0,0,0,0.06)",
        color: active ? color : "#94a3b8",
        borderRadius: 999, padding: "0 5px",
      }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Export ────────────────────────────────────────────────────────────────── */
export default function AgentGrid({ agents, isAdmin, onEndBreak }) {
  const [search,      setSearch]      = useState("");
  const [durumFilter, setDurumFilter] = useState("tumu");
  const [page,        setPage]        = useState(1);

  const list = agents || [];

  const counts = {
    aktif:   list.filter((a) => a.anlik_durum === "aktif").length,
    mesgul:  list.filter((a) => a.anlik_durum === "mesgul").length,
    mola:    list.filter((a) => a.anlik_durum === "mola").length,
    offline: list.filter((a) => a.anlik_durum === "offline").length,
  };

  const filtered = list.filter((a) => {
    const q = search.toLowerCase();
    const match = !q
      || a.ad_soyad?.toLowerCase().includes(q)
      || a.departman_adi?.toLowerCase().includes(q)
      || a.ekip_adi?.toLowerCase().includes(q)
      || a.dahili_no?.includes(q);
    return match && (durumFilter === "tumu" || a.anlik_durum === durumFilter);
  });

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Filtre/search değişirse sayfayı 1'e döndür
  useEffect(() => { setPage(1); }, [search, durumFilter]);
  // Sayfa toplam sayfa sınırını aşarsa düzelt
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageStart = (page - 1) * PAGE_SIZE;
  const visible   = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const CHIPS = [
    { key: "tumu",    label: "Tümü",      color: "#64748b", count: list.length   },
    { key: "aktif",   label: "Aktif",     color: "#10b981", count: counts.aktif  },
    { key: "mesgul",  label: "Görüşmede", color: "#3b82f6", count: counts.mesgul },
    { key: "mola",    label: "Mola",      color: "#f59e0b", count: counts.mola   },
    { key: "offline", label: "Offline",   color: "#94a3b8", count: counts.offline },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        {CHIPS.map(({ key, label, color, count }) => (
          <FilterChip
            key={key}
            label={label}
            count={count}
            color={key === "tumu" ? "#64748b" : DURUM[key]?.color || "#64748b"}
            active={durumFilter === key}
            onClick={() => setDurumFilter(key)}
          />
        ))}

        {/* Arama */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={12} style={{
            position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, dahili, dept..."
            style={{
              height: 32, paddingLeft: 28, paddingRight: 12, width: 170,
              background: "#f8fafc",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8, color: "#0f172a", fontSize: 12,
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.08)"}
          />
        </div>
      </div>

      {/* Tablo */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <TableHeader />

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", color: "#94a3b8",
              fontSize: 13, padding: "40px 0",
            }}>
              {search ? `"${search}" için sonuç bulunamadı` : "Personel bulunamadı"}
            </div>
          ) : (
            visible.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isAdmin={isAdmin}
                onEndBreak={onEndBreak}
              />
            ))
          )}
        </div>

        {/* Sayfalama */}
        {filtered.length > PAGE_SIZE && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageStart={pageStart}
            visibleCount={visible.length}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sayfalama (alt footer) ───────────────────────────────────────────────── */
function Pagination({ page, totalPages, total, pageStart, visibleCount, onPrev, onNext }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 8, marginTop: 8,
      padding: "8px 12px",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      background: "#fafbfc",
      borderRadius: "0 0 10px 10px",
    }}>
      <span style={{
        fontSize: 11, color: "#64748b", fontVariantNumeric: "tabular-nums",
      }}>
        <strong style={{ color: "#0f172a" }}>{pageStart + 1}–{pageStart + visibleCount}</strong>
        {" / "}
        <strong style={{ color: "#0f172a" }}>{total}</strong>
        {" "}kayıt
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={onPrev}
          disabled={page <= 1}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.08)",
            background: page <= 1 ? "#f8fafc" : "#fff",
            color: page <= 1 ? "#cbd5e1" : "#475569",
            cursor: page <= 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.color = "#10b981"; }}
          onMouseLeave={(e) => { if (page > 1) e.currentTarget.style.color = "#475569"; }}
        >
          <ChevronLeft size={13} />
        </button>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#0f172a",
          padding: "0 8px", fontVariantNumeric: "tabular-nums",
          minWidth: 50, textAlign: "center",
        }}>
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.08)",
            background: page >= totalPages ? "#f8fafc" : "#fff",
            color: page >= totalPages ? "#cbd5e1" : "#475569",
            cursor: page >= totalPages ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.color = "#10b981"; }}
          onMouseLeave={(e) => { if (page < totalPages) e.currentTarget.style.color = "#475569"; }}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
