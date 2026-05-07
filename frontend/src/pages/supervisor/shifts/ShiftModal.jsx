import { useState } from "react";
import { X, Clock, Plus, Trash2 } from "lucide-react";
import { SHIFT_TYPES } from "./mockData";

const DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

export default function ShiftModal({ cell, onClose, onSave }) {
  const [startTime, setStartTime] = useState(
    cell?.shift?.type && SHIFT_TYPES[cell.shift.type]?.hours
      ? SHIFT_TYPES[cell.shift.type].hours.split("-")[0]
      : "09:00"
  );
  const [endTime, setEndTime] = useState(
    cell?.shift?.type && SHIFT_TYPES[cell.shift.type]?.hours
      ? SHIFT_TYPES[cell.shift.type].hours.split("-")[1]
      : "18:00"
  );
  const [shiftType, setShiftType] = useState(cell?.shift?.type || "gunduz");
  const [note, setNote] = useState("");
  const [breaks, setBreaks] = useState([]);
  const [repeatDays, setRepeatDays] = useState([]);
  const [applyThisWeek, setApplyThisWeek] = useState(false);

  const calcDuration = () => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}s ${m}dk` : `${h} saat`;
  };

  const addBreak = () => {
    setBreaks(prev => [...prev, { time: "12:00", dur: 45, label: "Öğle" }]);
  };

  const handleSave = () => {
    onSave({ personId: cell.person.id, dayIndex: cell.dayIndex, type: shiftType, startTime, endTime, note, draft: true });
    onClose();
  };

  if (!cell) return null;
  const isNew = !cell.shift?.type || cell.shift.type === null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 20, width: 520, maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        border: "1px solid #E2E8F0"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
              {isNew ? "Yeni Vardiya" : "Vardiya Düzenle"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B" }}>
              {cell.person.name} — {cell.dayLabel}
            </p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Saat seçici */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Başlangıç</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#0F172A", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 18 }}>
              <div style={{ fontSize: 18, color: "#94A3B8" }}>→</div>
              <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 700, background: "#EFF6FF", padding: "2px 8px", borderRadius: 6 }}>{calcDuration()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Bitiş</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#0F172A", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Vardiya Tipi */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Vardiya Tipi</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(SHIFT_TYPES).filter(([k]) => !["izin","kapali"].includes(k)).map(([key, val]) => (
                <button key={key} onClick={() => setShiftType(key)} style={{
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${shiftType === key ? val.color : "#E2E8F0"}`,
                  background: shiftType === key ? val.bg : "#fff",
                  color: shiftType === key ? val.textColor : "#64748B",
                  fontSize: 13, fontWeight: shiftType === key ? 700 : 500, cursor: "pointer"
                }}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Molalar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Molalar</label>
              <button onClick={addBreak} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                <Plus size={12} /> Mola Ekle
              </button>
            </div>
            {breaks.length === 0 && (
              <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Henüz mola eklenmedi.</p>
            )}
            {breaks.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 6 }}>
                <Clock size={14} color="#64748B" />
                <input type="time" value={b.time} onChange={e => setBreaks(prev => prev.map((x,j)=>j===i?{...x,time:e.target.value}:x))}
                  style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 8px", fontSize: 13, color: "#0F172A" }} />
                <span style={{ fontSize: 13, color: "#64748B" }}>—</span>
                <input type="number" value={b.dur} min={5} step={5}
                  onChange={e => setBreaks(prev => prev.map((x,j)=>j===i?{...x,dur:+e.target.value}:x))}
                  style={{ width: 60, border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 8px", fontSize: 13 }} />
                <span style={{ fontSize: 13, color: "#64748B" }}>dk</span>
                <input value={b.label} onChange={e => setBreaks(prev => prev.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
                  style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 8px", fontSize: 13 }} />
                <button onClick={() => setBreaks(prev => prev.filter((_,j)=>j!==i))} style={{ border: "none", background: "none", cursor: "pointer" }}>
                  <Trash2 size={14} color="#DC2626" />
                </button>
              </div>
            ))}
          </div>

          {/* Not */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Not (opsiyonel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Vardiyayla ilgili not ekleyin..."
              style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#0F172A", resize: "none", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Tekrar günleri */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Tekrar Et</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setRepeatDays(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i])}
                  style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${repeatDays.includes(i) ? "#2563EB" : "#E2E8F0"}`,
                    background: repeatDays.includes(i) ? "#EFF6FF" : "#fff",
                    color: repeatDays.includes(i) ? "#2563EB" : "#64748B",
                    fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>
            {repeatDays.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <div onClick={() => setApplyThisWeek(p=>!p)} style={{ width: 36, height: 20, borderRadius: 10,
                  background: applyThisWeek ? "#2563EB" : "#CBD5E1", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    top: 2, left: applyThisWeek ? 18 : 2, transition: "left 0.2s" }} />
                </div>
                <span style={{ fontSize: 13, color: "#0F172A" }}>Bu haftaya uygula</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
            İptal
          </button>
          <button onClick={handleSave} style={{ padding: "10px 24px", border: "none", borderRadius: 10, background: "#2563EB", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
