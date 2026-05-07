import { useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, Edit2, Moon, Umbrella, AlertTriangle, Clock, Check, X } from "lucide-react";
import { MONTH_META, PERSONNEL_LIST, MONTHLY_PLAN, SHIFT_DEF, TEMPLATES } from "./monthlyData";
// store prop üzerinden gerçek veri (monthlySummary, loadMonth, applyTemplate)
// Mock data geçiş dönemi: MONTHLY_PLAN fallback olarak kullanılmaya devam eder

const DAY_NAMES = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const FULL_DAY_NAMES = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];

// Gün numarasına göre tam tarih adı
function dayLabel(day) {
  const offset = MONTH_META.startOffset;
  const idx = (offset + day - 1) % 7;
  return `${FULL_DAY_NAMES[idx]}, ${day} Nisan 2026`;
}

// Kapasite rengi
function capColor(working) {
  if (working >= 10) return "#15803D";
  if (working >= 7)  return "#D97706";
  return "#DC2626";
}

// Avatar initials daireleri
function AvatarGroup({ personnel, working }) {
  const active = personnel.filter(p => p.shift !== "off" && p.shift !== "izin");
  const shown = active.slice(0, 4);
  const extra = active.length - 4;
  const avatarColors = ["#BFDBFE","#BBF7D0","#DDD6FE","#FED7AA"];
  const textColors   = ["#1D4ED8","#15803D","#6D28D9","#C2410C"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginTop: 4 }}>
      {shown.map((p, i) => {
        const person = PERSONNEL_LIST.find(x => x.id === p.personId);
        return (
          <div key={p.personId} style={{
            width: 18, height: 18, borderRadius: "50%",
            background: avatarColors[i % 4], border: "1.5px solid #fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize: 7, fontWeight: 700, color: textColors[i % 4],
            marginLeft: i > 0 ? -5 : 0, zIndex: shown.length - i,
          }}>
            {person?.initials?.slice(0,2) || "?"}
          </div>
        );
      })}
      {extra > 0 && (
        <div style={{ width:18, height:18, borderRadius:"50%", background:"#E2E8F0", border:"1.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:700, color:"#64748B", marginLeft:-5 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

function DayCell({ day, data, isSelected, onSelect, onDblClick }) {
  const [hovered, setHovered] = useState(false);
  const isToday    = day === MONTH_META.today;
  const isHoliday  = MONTH_META.holidays[day];
  const isWeekend  = MONTH_META.weekends.has(day);
  const noWorkers  = data.working === 0;

  let bg = "#fff";
  if (isToday)       bg = "#DBEAFE";
  else if (isHoliday) bg = "#FEF2F2";
  else if (hovered)   bg = "#F8FBFF";

  let border = "1px solid #F1F5F9";
  if (isSelected) border = "2px solid #2563EB";
  else if (isToday) border = "1.5px solid #2563EB";

  const numBg   = isToday ? "#2563EB" : "transparent";
  const numColor = isToday ? "#fff" : isWeekend ? "#94A3B8" : "#64748B";

  return (
    <div
      onClick={() => onSelect(day)}
      onDoubleClick={() => onDblClick(day)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? "#EFF6FF" : bg,
        border, borderRadius: 6, padding: "5px 6px",
        minHeight: 72, cursor: "pointer", transition: "all 0.12s",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        position:"relative", userSelect:"none",
      }}
    >
      {/* Gün numarası */}
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <span style={{
          width: 20, height: 20, borderRadius: "50%", background: numBg,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: 11, fontWeight: isToday ? 700 : 500, color: numColor,
        }}>{day}</span>
      </div>

      {/* Orta: çalışan sayısı + avatarlar */}
      {isHoliday ? (
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize: 9, color:"#B91C1C", fontWeight:600 }}>🎉 Tatil</div>
          <div style={{ fontSize: 12, fontWeight:700, color:"#DC2626" }}>{data.working}/{PERSONNEL_LIST.length}</div>
        </div>
      ) : isWeekend && noWorkers ? (
        <div style={{ textAlign:"center" }}>
          <span style={{ fontSize: 11, fontWeight:700, color:"#94A3B8" }}>0/{PERSONNEL_LIST.length}</span>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: capColor(data.working), lineHeight:1 }}>
            {data.working}
            <span style={{ fontSize:10, fontWeight:500, color:"#94A3B8" }}>/{PERSONNEL_LIST.length}</span>
          </div>
          <AvatarGroup personnel={data.personnel} working={data.working} />
        </div>
      )}

      {/* Alt ikonlar */}
      {!isHoliday && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {data.night > 0 && (
            <span style={{ fontSize:9, color:"#1D4ED8", background:"#EFF6FF", borderRadius:4, padding:"1px 4px", fontWeight:600 }}>
              🌙{data.night}
            </span>
          )}
          {data.leave > 0 && (
            <span style={{ fontSize:9, color:"#A16207", background:"#FEF9C3", borderRadius:4, padding:"1px 4px", fontWeight:600 }}>
              🏖{data.leave}
            </span>
          )}
          {data.working < 6 && !noWorkers && (
            <span style={{ fontSize:9, color:"#DC2626", background:"#FEE2E2", borderRadius:4, padding:"1px 4px", fontWeight:600 }}>⚠</span>
          )}
          {data.pending > 0 && (
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#2563EB", display:"inline-block", marginTop:2 }} />
          )}
        </div>
      )}
    </div>
  );
}

// Sağ panel: seçili günün detayı
function DayDetailPanel({ day, onClose }) {
  const data = MONTHLY_PLAN[day];
  const label = dayLabel(day);
  const isToday = day === MONTH_META.today;
  const capCol = capColor(data.working);
  const activePers = data.personnel.filter(p => p.shift !== "off" && p.shift !== "izin");

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #E2E8F0" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{label}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color: capCol, background: capCol==="#15803D"?"#DCFCE7": capCol==="#D97706"?"#FEF3C7":"#FEE2E2", padding:"2px 10px", borderRadius:20 }}>
            {data.working}/{PERSONNEL_LIST.length} personel
          </span>
          {isToday && <span style={{ fontSize:11, color:"#2563EB", fontWeight:600 }}>● Bugün</span>}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 0 16px" }}>
        {/* Bölüm 1 — Personel Listesi */}
        <div style={{ padding:"12px 20px 0" }}>
          <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".05em" }}>Personel</p>
          {activePers.map(p => {
            const person = PERSONNEL_LIST.find(x => x.id === p.personId);
            const def = SHIFT_DEF[p.shift];
            const entry = p.entry;
            return (
              <div key={p.personId} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #F8FAFC" }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background: def?.bg || "#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${def?.border||"#E2E8F0"}` }}>
                  <span style={{ fontSize:9, fontWeight:700, color: def?.textLight?"#BFDBFE": def?.color||"#64748B" }}>{person?.initials}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#0F172A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{person?.name}</div>
                  <span style={{ fontSize:10, fontWeight:600, color: def?.color, background: def?.bg, padding:"1px 6px", borderRadius:4 }}>
                    {def?.hours || def?.label}
                  </span>
                </div>
                {/* Entry durumu (sadece bugün) */}
                {isToday && entry && (
                  <div style={{ fontSize:10, fontWeight:600, flexShrink:0, display:"flex", alignItems:"center", gap:3,
                    color: entry.checked ? (entry.late ? "#DC2626" : "#15803D") : "#94A3B8" }}>
                    {entry.checked ? <Check size={10}/> : <Clock size={10}/>}
                    {entry.checked ? entry.time : "Bekleniyor"}
                    {entry.late && " GEÇ"}
                  </div>
                )}
                <Edit2 size={12} color="#CBD5E1" style={{ flexShrink:0, cursor:"pointer" }} />
              </div>
            );
          })}
          {data.leave > 0 && (
            <div style={{ marginTop:6, fontSize:11, color:"#A16207", background:"#FEF9C3", padding:"5px 10px", borderRadius:6 }}>
              🏖 {data.leave} kişi izinli
            </div>
          )}
          <button style={{ width:"100%", marginTop:12, padding:"9px", border:"1px dashed #CBD5E1", borderRadius:8, background:"#fff", color:"#64748B", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            <Plus size={13}/> Bu Güne Vardiya Ekle
          </button>
        </div>

        {/* Bölüm 2 — Vardiya Dağılımı */}
        <div style={{ padding:"14px 20px 0" }}>
          <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".05em" }}>Vardiya Dağılımı</p>
          {[
            { key:"sabah",  label:"Sabah  06-14", color:"#1D4ED8" },
            { key:"gunduz", label:"Gündüz 09-18", color:"#15803D" },
            { key:"aksam",  label:"Akşam  14-22", color:"#6D28D9" },
            { key:"gece",   label:"Gece   22-06", color:"#0F172A" },
          ].map(row => {
            const count = data.personnel.filter(p => p.shift === row.key).length;
            const pct = (count / PERSONNEL_LIST.length) * 100;
            return (
              <div key={row.key} style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>{row.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: count > 0 ? row.color : "#CBD5E1" }}>{count} kişi</span>
                </div>
                <div style={{ height:4, background:"#F1F5F9", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background: row.color, borderRadius:2, opacity: count===0?0.2:0.85 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bölüm 3 — Aksiyonlar */}
        <div style={{ padding:"14px 20px 0" }}>
          <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".05em" }}>Aksiyonlar</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <button style={{ padding:"9px 14px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", color:"#0F172A", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
              📋 Şablondan Doldur
            </button>
            <button style={{ padding:"9px 14px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", color:"#0F172A", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
              📅 Haftayı Kopyala
            </button>
          </div>
          {data.pending > 0 && (
            <div style={{ marginTop:10, padding:"10px 12px", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#92400E", marginBottom:3 }}>⏳ Bekleyen Talep</div>
              <div style={{ fontSize:11, color:"#78350F" }}>Ahmet Yıldız — vardiya değişiklik talebi</div>
              <button style={{ marginTop:6, fontSize:11, fontWeight:700, color:"#D97706", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                İncele →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Şablon Modal
function TemplateModal({ onClose, onApply }) {
  const [selectedTemplate, setSelectedTemplate] = useState("std");
  const [range, setRange] = useState("week");
  const [overwrite, setOverwrite] = useState(false);

  const handleApply = () => {
    onApply(selectedTemplate, range, overwrite);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:480, boxShadow:"0 24px 60px rgba(0,0,0,0.2)", border:"1px solid #E2E8F0" }}>
        {/* Başlık */}
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#0F172A" }}>Şablon Uygula</h3>
          <button onClick={onClose} style={{ border:"none", background:"#F1F5F9", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} color="#64748B"/>
          </button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* Şablon seçimi */}
          <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:"#475569" }}>Şablon Seç</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {TEMPLATES.map(t => (
              <label key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px", border:`1.5px solid ${selectedTemplate===t.id?"#2563EB":"#E2E8F0"}`, borderRadius:10, cursor:"pointer", background: selectedTemplate===t.id?"#EFF6FF":"#fff", transition:"all 0.15s" }}>
                <input type="radio" name="template" value={t.id} checked={selectedTemplate===t.id} onChange={() => setSelectedTemplate(t.id)} style={{ marginTop:2, accentColor:"#2563EB" }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{t.label}</div>
                  {t.desc && <div style={{ fontSize:11, color:"#64748B", marginTop:1 }}>{t.desc}</div>}
                </div>
              </label>
            ))}
          </div>

          {/* Uygulama aralığı */}
          <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:"#475569" }}>Uygulama Aralığı</p>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[{id:"week",label:"Bu Hafta"},{id:"month",label:"Bu Ay (Nisan 2026)"},{id:"custom",label:"Özel Aralık"}].map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} style={{
                flex:1, padding:"8px 0", border:`1.5px solid ${range===r.id?"#2563EB":"#E2E8F0"}`, borderRadius:8,
                background: range===r.id?"#EFF6FF":"#fff", color: range===r.id?"#2563EB":"#475569",
                fontSize:12, fontWeight: range===r.id?700:500, cursor:"pointer"
              }}>{r.label}</button>
            ))}
          </div>

          {/* Çakışma uyarısı */}
          <div style={{ padding:"10px 14px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:8, marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#92400E", fontWeight:600, marginBottom:6 }}>⚠ Bu işlem 3 mevcut vardiyayla çakışıyor</div>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#78350F", cursor:"pointer" }}>
              <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} style={{ accentColor:"#D97706" }}/>
              Çakışanları üzerine yaz
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #E2E8F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px", border:"1px solid #E2E8F0", borderRadius:9, background:"#fff", fontSize:13, fontWeight:600, color:"#64748B", cursor:"pointer" }}>İptal</button>
          <button onClick={handleApply} style={{ padding:"9px 22px", border:"none", borderRadius:9, background:"#2563EB", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>Uygula</button>
        </div>
      </div>
    </div>
  );
}

// Toast
function Toast({ msg, onClose }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:"#0F172A", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:2000, display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
      <Check size={15} color="#4ADE80"/> {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>✕</button>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function MonthlyPlanning({ store }) {
  const [selectedDay, setSelectedDay] = useState(MONTH_META.today);
  const [showTemplate, setShowTemplate] = useState(false);
  const [toast, setToast] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Gerçek API verisi varsa kullan, yoksa mock'a fallback
  const monthlySummary = store?.monthlySummary || {};
  const pendingRequests = store?.pendingRequests || [];
  const { year, month } = store?.currentMonth || { year: 2026, month: 4 };
  const AY_ADLARI = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const ayBaslik = `${AY_ADLARI[month - 1]} ${year}`;

  const handleApply = async (template, range, overwrite) => {
    if (!store?.applyTemplate) {
      setToast("Şablon uygulandı (demo).");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const ekip_id = store.personnel?.[0]?.ekip_id || 1;
    setTemplateLoading(true);
    try {
      const res = await store.applyTemplate(template, year, month, ekip_id, overwrite);
      await store.loadMonth(year, month);
      setToast(`Tamamlandı: ${res.created} oluşturuldu, ${res.updated} güncellendi, ${res.skipped} atlandı.`);
    } catch (e) {
      setToast(`Hata: ${e.message}`);
    } finally {
      setTemplateLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const cells = [];
  for (let i = 0; i < MONTH_META.startOffset; i++) cells.push(null);
  for (let d = 1; d <= MONTH_META.totalDays; d++) cells.push(d);

  return (
    <div style={{ display:"flex", gap:16, flex:1, minHeight:0, overflow:"hidden" }}>
      {/* Sol: Takvim */}
      <div style={{ flex:"0 0 68%", display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        {/* Kontroller */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexShrink:0 }}>
          <button
            onClick={() => store?.loadMonth && store.loadMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}
            style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:600, color:"#475569", cursor:"pointer" }}>
            <ChevronLeft size={13}/> Önceki
          </button>
          <span style={{ fontSize:14, fontWeight:800, color:"#0F172A" }}>{ayBaslik}</span>
          <button
            onClick={() => store?.loadMonth && store.loadMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}
            style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:600, color:"#475569", cursor:"pointer" }}>
            Sonraki <ChevronRight size={13}/>
          </button>
          <button
            onClick={() => { const t = new Date(); store?.loadMonth && store.loadMonth(t.getFullYear(), t.getMonth() + 1); }}
            style={{ padding:"6px 12px", border:"none", borderRadius:8, background:"#2563EB", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Bu Ay</button>
          <div style={{ marginLeft:"auto" }}>
            <button onClick={() => setShowTemplate(true)} disabled={templateLoading} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", border:"1px solid #2563EB", borderRadius:8, background:"#fff", color:"#2563EB", fontSize:12, fontWeight:700, cursor:"pointer", opacity: templateLoading ? 0.6 : 1 }}>
              {templateLoading ? "⏳ Uygulanıyor..." : "📋 Şablonu Uygula"}
            </button>
          </div>
        </div>

        {/* Gün adları */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3, flexShrink:0 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color: ["Cmt","Paz"].includes(d)?"#CBD5E1":"#64748B", padding:"3px 0" }}>{d}</div>
          ))}
        </div>

        {/* Hücreler — kendi içinde scroll */}
        <div style={{ flex:1, minHeight:0, overflowY:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ minHeight:72 }}/>;
              return (
                <DayCell
                  key={day}
                  day={day}
                  data={MONTHLY_PLAN[day]}
                  isSelected={selectedDay === day}
                  onSelect={setSelectedDay}
                  onDblClick={() => {}}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Sağ: Detay paneli */}
      <div style={{ flex:"0 0 32%", background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.03)" }}>
        <DayDetailPanel key={selectedDay} day={selectedDay} />
      </div>

      {/* Modaller */}
      {showTemplate && <TemplateModal onClose={() => setShowTemplate(false)} onApply={handleApply}/>}
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
    </div>
  );
}
