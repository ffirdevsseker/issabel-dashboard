import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Send } from "lucide-react";
import { SHIFT_TYPES } from "./mockData";
import { toDateStr, addDays, isSameDay } from "./useShiftsStore";
import ShiftModal from "./ShiftModal";
import BottomPanels from "./BottomPanels";
import PublishModal from "./PublishModal";

const PERSON_COL_W = 200;
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function getInitials(name) {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toLocaleUpperCase('tr-TR');
}

function CapacityBadge({ current, total }) {
  const pct = total > 0 ? current / total : 0;
  let bg, color;
  if (pct >= 0.8) { bg = "#DCFCE7"; color = "#15803D"; }
  else if (pct >= 0.5) { bg = "#FEF9C3"; color = "#A16207"; }
  else { bg = "#FEE2E2"; color = "#B91C1C"; }
  const isLow = pct < 0.4;
  return (
    <div title={`Bu gün ${total - current} personel eksik`} style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: bg, color, borderRadius: 6, padding: "2px 8px",
      fontSize: 11, fontWeight: 700,
      animation: isLow ? "shake 0.5s infinite" : "none",
    }}>
      {current}/{total}
    </div>
  );
}

function ShiftCell({ shift, person, dateStr, dayLabel, isToday, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  const tur = shift?.tur || null;
  const def = tur ? SHIFT_TYPES[tur] : null;
  const isEmpty = !tur;

  const calcHours = () => {
    if (!shift?.baslangic || !shift?.bitis) return null;
    const start = new Date(shift.baslangic);
    const end = new Date(shift.bitis);
    const mins = (end - start) / 60000;
    if (mins <= 0) return null;
    const h = Math.floor(Math.abs(mins) / 60);
    const m = Math.abs(mins) % 60;
    return m > 0 ? `${h}s ${m}dk` : `${h}s`;
  };

  const formatTime = (dt) => {
    if (!dt) return null;
    const d = new Date(dt);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const cellStyle = {
    padding: "6px 8px", borderRadius: 8, cursor: "pointer",
    transition: "all 0.15s",
    transform: hovered ? "scale(1.02)" : "scale(1)",
    boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
    minHeight: 56,
    display: "flex", flexDirection: "column", justifyContent: "center",
    background: isEmpty ? (hovered ? "#EFF6FF" : "#fff") : (def?.bg || "#F1F5F9"),
    border: isEmpty ? "1.5px dashed #CBD5E1" : `1px solid ${def?.border || "#E2E8F0"}`,
    borderLeft: isEmpty ? undefined : `3px solid ${def?.color || "#94A3B8"}`,
    position: "relative",
  };

  return (
    <>
      <div
        style={cellStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { setMenuPos(null); onOpen({ person, dateStr, dayLabel, shift }); }}
        onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
      >
        {isEmpty ? (
          <div style={{ textAlign: "center", color: "#CBD5E1", fontSize: 18 }}>+</div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: def?.textColor || "#475569", display: "flex", alignItems: "center", gap: 4 }}>
              {tur === "gece" && <span>🌙</span>}
              {tur === "izin" && <span>🌴</span>}
              {tur === "off" ? "Kapalı" : (def?.label || tur)}
            </div>
            {shift?.baslangic && tur !== "off" && tur !== "izin" && (
              <div style={{ fontSize: 10, color: def?.textColor || "#475569", opacity: 0.75 }}>
                {formatTime(shift.baslangic)}–{formatTime(shift.bitis)} {calcHours() ? `· ${calcHours()}` : ""}
              </div>
            )}
            {shift?.durum === "revize" && (
              <span style={{ position: "absolute", top: 3, right: 3, fontSize: 9, background: "#F59E0B", color: "#fff", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>
                TASLAK
              </span>
            )}
          </>
        )}
      </div>
      {menuPos && (
        <ContextMenu
          pos={menuPos}
          onClose={() => setMenuPos(null)}
          onEdit={() => { setMenuPos(null); onOpen({ person, dateStr, dayLabel, shift }); }}
          onDelete={shift?.id ? () => { setMenuPos(null); onDelete(shift); } : null}
        />
      )}
    </>
  );
}

function ContextMenu({ pos, onClose, onEdit, onDelete }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
      <div style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 201,
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 160, overflow: "hidden" }}>
        {[
          { label: "Düzenle", icon: "✏️", action: onEdit },
          { label: "Kopyala", icon: "📋", action: onClose },
          { label: "Mola Ekle", icon: "☕", action: onClose },
          { label: "Vardiyayı Değiştir", icon: "🔄", action: onClose },
          onDelete && { label: "Sil", icon: "🗑️", action: onDelete, danger: true },
        ].filter(Boolean).map(item => (
          <button key={item.label} onClick={item.action} style={{
            display: "block", width: "100%", textAlign: "left",
            padding: "9px 14px", border: "none", background: "none",
            fontSize: 13, fontWeight: 500, color: item.danger ? "#DC2626" : "#0F172A",
            cursor: "pointer", borderTop: item.danger ? "1px solid #F1F5F9" : "none",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

function HoursBadge({ hours }) {
  if (!hours) return null;
  if (hours >= 45) return (
    <span style={{ fontSize: 11, background: "#FEF3C7", color: "#D97706", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
      {hours}s ⚠
    </span>
  );
  if (hours <= 32) return (
    <span style={{ fontSize: 11, background: "#FEF9C3", color: "#A16207", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
      {hours}s −
    </span>
  );
  return (
    <span style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
      {hours}s
    </span>
  );
}

function DeleteConfirmModal({ shift, onConfirm, onCancel }) {
  const [gerekce, setGerekce] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 400, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Vardiyayı Sil</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Bu işlem geri alınamaz. Lütfen bir gerekçe girin:</p>
        <textarea
          value={gerekce}
          onChange={e => setGerekce(e.target.value)}
          placeholder="En az 10 karakter..."
          rows={3}
          style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            İptal
          </button>
          <button
            onClick={() => gerekce.trim().length >= 10 && onConfirm(gerekce.trim())}
            disabled={gerekce.trim().length < 10}
            style={{ padding: "9px 18px", border: "none", borderRadius: 10, background: gerekce.trim().length >= 10 ? "#DC2626" : "#F1F5F9", color: gerekce.trim().length >= 10 ? "#fff" : "#94A3B8", fontSize: 13, fontWeight: 700, cursor: gerekce.trim().length >= 10 ? "pointer" : "default" }}
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyCalendar({ store, draftCount }) {
  const [modalCell, setModalCell] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const {
    personnel, weekShifts, weeklyStats,
    currentWeekStart, loadWeek, loadWeeklyStats,
    goToPrevWeek, goToNextWeek, goToToday,
    saveShift, deleteShift, bulkSave,
  } = store;

  // Haftanın günlerini dinamik hesapla
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(currentWeekStart, i);
    return {
      date: d,
      dateStr: toDateStr(d),
      label: TR_DAYS[d.getDay()],
      num: d.getDate(),
      isToday: isSameDay(d, new Date()),
    };
  });

  // Hafta başlığı
  const weekLabel = (() => {
    const s = currentWeekStart;
    const e = addDays(currentWeekStart, 6);
    const sStr = s.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    const eStr = e.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    return `${sStr} – ${eStr}`;
  })();

  // Kapasite hesabı: weekShifts'ten gün bazlı
  const capacityByDate = {};
  weekDays.forEach(d => {
    const working = personnel.filter(p => {
      const key = `${p.id}_${d.dateStr}`;
      const v = weekShifts[key];
      return v && v.tur !== "off" && v.tur !== "izin" && v.durum !== "iptal";
    }).length;
    capacityByDate[d.dateStr] = { current: working, total: personnel.length };
  });

  // Vardiya kaydet
  const handleSave = async (payload) => {
    setSaving(true);
    try {
      await saveShift(payload);
      await loadWeek(currentWeekStart);
      await loadWeeklyStats(toDateStr(currentWeekStart), toDateStr(addDays(currentWeekStart, 6)));
    } catch (e) {
      alert(`Vardiya kaydedilemedi: ${e.message}`);
    } finally {
      setSaving(false);
      setModalCell(null);
    }
  };

  // Vardiya sil
  const handleDeleteConfirm = async (gerekce) => {
    if (!deleteTarget?.id) return;
    try {
      await deleteShift(deleteTarget.id, gerekce);
      await loadWeek(currentWeekStart);
      await loadWeeklyStats(toDateStr(currentWeekStart), toDateStr(addDays(currentWeekStart, 6)));
    } catch (e) {
      alert(`Vardiya silinemedi: ${e.message}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Yayınla
  const handlePublish = async () => {
    const draftEntries = Object.values(weekShifts).filter(v => v?.durum === "taslak" || v?._draft);
    if (draftEntries.length > 0) {
      await bulkSave(draftEntries.map(v => ({
        personel_id: v.personel_id,
        tarih: v.tarih,
        tur: v.tur,
        baslangic: v.baslangic,
        bitis: v.bitis,
      })), true);
    }
    await loadWeek(currentWeekStart);
    setShowPublish(false);
  };

  // Atanmamış slot sayısı (BottomPanels için)
  const totalUnassigned = personnel.length * 5 - // Pzt-Cum
    Object.values(weekShifts).filter(v => v?.tur && v.tur !== "off" && v.tur !== "izin").length;

  const isLoading = store.loadingWeek;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            onClick={goToPrevWeek}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}
          >
            <ChevronLeft size={14} /> Önceki Hafta
          </button>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{weekLabel}</span>
          <button
            onClick={goToNextWeek}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}
          >
            Sonraki Hafta <ChevronRight size={14} />
          </button>
          <button
            onClick={goToToday}
            style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Bugün
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #2563EB", borderRadius: 10, background: "#fff", color: "#2563EB", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <FileText size={14} /> Şablondan Ata
            </button>
            <button
              onClick={() => setShowPublish(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", border: "none", borderRadius: 10,
                background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                animation: draftCount > 0 ? "pulse-btn 2s infinite" : "none",
              }}
            >
              <Send size={14} /> Yayınla {draftCount > 0 && (
                <span style={{ background: "#fff", color: "#2563EB", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                  {draftCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, border: "2px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Yükleniyor...
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 14, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              {/* Capacity row */}
              <tr>
                <td style={{ width: PERSON_COL_W, padding: "8px 12px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", borderRight: "1px solid #E2E8F0", fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>
                  Kapasite
                </td>
                {weekDays.map((d) => {
                  const cap = capacityByDate[d.dateStr] || { current: 0, total: personnel.length };
                  return (
                    <td key={d.dateStr} style={{ padding: "8px 6px", background: d.isToday ? "#EFF6FF" : "#F8FAFC", borderBottom: "1px solid #E2E8F0", borderRight: "1px solid #E2E8F0", textAlign: "center" }}>
                      <CapacityBadge current={cap.current} total={cap.total} />
                    </td>
                  );
                })}
              </tr>
              {/* Day headers */}
              <tr>
                <th style={{ width: PERSON_COL_W, padding: "10px 12px", background: "#F8FAFC", borderBottom: "2px solid #E2E8F0", borderRight: "1px solid #E2E8F0", textAlign: "left", fontSize: 12, color: "#475569", fontWeight: 700 }}>
                  Personel
                </th>
                {weekDays.map((d) => (
                  <th key={d.dateStr} style={{
                    padding: "10px 6px",
                    background: d.isToday ? "#EFF6FF" : "#F8FAFC",
                    borderBottom: `2px solid ${d.isToday ? "#2563EB" : "#E2E8F0"}`,
                    borderRight: "1px solid #E2E8F0",
                    textAlign: "center", fontSize: 12,
                    color: d.isToday ? "#2563EB" : "#475569",
                    fontWeight: d.isToday ? 800 : 700,
                  }}>
                    {d.label} {d.num}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#94A3B8", fontSize: 14 }}>
                    Ekibinizde personel bulunamadı.
                  </td>
                </tr>
              )}
              {personnel.map((person) => {
                // Kişinin haftalık saatini hesapla
                const weekHours = weekDays.reduce((acc, d) => {
                  const v = weekShifts[`${person.id}_${d.dateStr}`];
                  if (v && v.baslangic && v.bitis && v.tur !== "off" && v.tur !== "izin") {
                    const start = new Date(v.baslangic);
                    const end = new Date(v.bitis);
                    return acc + Math.abs(end - start) / 3600000;
                  }
                  return acc;
                }, 0);

                return (
                  <tr key={person.id}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #F1F5F9", borderRight: "1px solid #E2E8F0", background: "#FAFAFA" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#DBEAFE,#BFDBFE)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>{getInitials(person.full_name || person.username)}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {person.full_name || person.username}
                          </div>
                          <HoursBadge hours={Math.round(weekHours)} />
                        </div>
                      </div>
                    </td>
                    {weekDays.map((d) => {
                      const shift = weekShifts[`${person.id}_${d.dateStr}`] || null;
                      return (
                        <td key={d.dateStr} style={{
                          padding: "6px", borderBottom: "1px solid #F1F5F9", borderRight: "1px solid #E2E8F0",
                          background: d.isToday ? "#F8FBFF" : "#fff",
                          verticalAlign: "middle",
                        }}>
                          <ShiftCell
                            shift={shift}
                            person={person}
                            dateStr={d.dateStr}
                            dayLabel={d.date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                            isToday={d.isToday}
                            onOpen={setModalCell}
                            onDelete={(v) => setDeleteTarget(v)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom panels */}
      <BottomPanels totalUnassigned={Math.max(0, totalUnassigned)} weeklyStats={weeklyStats} weekLabel={weekLabel} />

      {/* Modals */}
      {modalCell && (
        <ShiftModal
          cell={modalCell}
          personnel={personnel}
          onClose={() => setModalCell(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {showPublish && (
        <PublishModal
          draftCount={draftCount}
          onClose={() => setShowPublish(false)}
          onPublish={handlePublish}
          personnel={personnel}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          shift={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
