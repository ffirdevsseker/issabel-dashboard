/**
 * DateRangePicker — Tarih aralığı seçici
 * Props:
 *   value: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 *   onChange: (newValue) => void
 *   disabled?: boolean
 */
export default function DateRangePicker({ value, onChange, disabled = false }) {
  const inp = {
    padding: "7px 10px",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8,
    fontSize: 12,
    color: "#0f172a",
    background: disabled ? "#f1f5f9" : "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    outline: "none",
    fontFamily: "inherit",
  };
  const lbl = {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      <div>
        <span style={lbl}>Başlangıç</span>
        <input
          type="date"
          style={inp}
          value={value.from}
          max={value.to}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <span style={{ color: "#cbd5e1", fontSize: 16, paddingBottom: 8 }}>—</span>
      <div>
        <span style={lbl}>Bitiş</span>
        <input
          type="date"
          style={inp}
          value={value.to}
          min={value.from}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}
