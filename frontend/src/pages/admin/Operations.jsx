/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · OPERASYON KOMUTA MERKEZİ  (/admin/operations)
   ────────────────────────────────────────────────────────────────────────────
   Stratejik KPI · Supervisor Denetim Matrisi · Ekip Karşılaştırma · AI Kriz
   Genel Bakış ile aynı tasarım dili (beyaz Panel, soft shadow, light theme).
   15 sn polling. Her override aksiyonu denetim_izleri'ne yazar.
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Activity, AlertTriangle, Shield, Send, Zap, Coffee,
  TrendingUp, Users, Brain, Gauge, Phone, Star, ChevronRight,
  CheckCircle2, XCircle, GraduationCap, ScrollText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { operationsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Panel } from "@/pages/admin/Overview";

/* ─── Tema (Genel Bakış ile birebir) ─────────────────────────────────────── */
const C = {
  text:    "#0f172a",
  muted:   "#94a3b8",
  faint:   "#cbd5e1",
  border:  "rgba(0,0,0,0.07)",
  borderL: "rgba(0,0,0,0.05)",
  hover:   "rgba(0,0,0,0.02)",

  active:  "#10b981",
  busy:    "#3b82f6",
  break:   "#f59e0b",
  alarm:   "#ef4444",
  purple:  "#8b5cf6",
  teal:    "#0891b2",
};

const POLL_MS = 15_000;

/* ─── Yardımcılar ────────────────────────────────────────────────────────── */
function Avatar({ name, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}15`, border: `1.5px solid ${color}28`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color,
    }}>
      {name?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function Badge({ label, color, small }) {
  return (
    <span style={{
      fontSize: small ? 9 : 10.5, fontWeight: 800, letterSpacing: "0.04em",
      color, background: `${color}10`, border: `1px solid ${color}28`,
      borderRadius: 5, padding: small ? "1px 5px" : "2px 7px", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function Toast({ kind, msg }) {
  if (!msg) return null;
  const color = kind === "ok" ? C.active : C.alarm;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      marginTop: 10, padding: "8px 12px", borderRadius: 8,
      background: `${color}10`, border: `1px solid ${color}28`,
      fontSize: 11, fontWeight: 600, color,
    }}>
      {kind === "ok" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {msg}
    </div>
  );
}

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  : "—";

/* ════════════════════════════════════════════════════════════════════════════
   1. STRATEJIK KPI ŞERİDİ
════════════════════════════════════════════════════════════════════════════ */
function KpiCard({ Icon, label, value, sub, color, alarm, gauge }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 200,
      background: "#ffffff",
      border: `1px solid ${alarm ? "rgba(239,68,68,0.35)" : C.border}`,
      borderTop: `2px solid ${alarm ? C.alarm : color}`,
      borderRadius: 14,
      boxShadow: alarm
        ? "0 2px 12px rgba(239,68,68,0.12)"
        : "0 2px 12px rgba(0,0,0,0.04)",
      padding: "14px 18px",
      animation: alarm ? "alarmFlash 1.4s ease-in-out infinite" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${alarm ? C.alarm : color}12`,
          border: `1px solid ${alarm ? C.alarm : color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={alarm ? C.alarm : color} strokeWidth={2.4} />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text, letterSpacing: "0.01em" }}>
          {label}
        </div>
        {alarm && (
          <span style={{ marginLeft: "auto" }}>
            <Badge label="ALARM" color={C.alarm} small />
          </span>
        )}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color: alarm ? C.alarm : color,
        lineHeight: 1, fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {gauge !== undefined && (
        <div style={{ marginTop: 10, height: 4, borderRadius: 3, background: "rgba(0,0,0,0.05)" }}>
          <div style={{
            width: `${Math.min(100, gauge)}%`, height: "100%",
            background: alarm
              ? `linear-gradient(90deg, ${C.alarm}, ${C.break})`
              : `linear-gradient(90deg, ${color}, ${color}88)`,
            borderRadius: 3, transition: "width 0.4s ease",
          }} />
        </div>
      )}
    </div>
  );
}

function StrategicKpiStrip({ summary, loading }) {
  const k = summary || {};
  const kapasite = k.kapasite || {};
  const abandon  = k.abandon  || {};
  const verim    = k.verimlilik || {};
  const csat     = k.csat || {};

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <KpiCard
        Icon={Gauge} color={C.busy}
        label="Kapasite Kullanımı"
        value={loading ? "—" : `%${kapasite.yuzde ?? 0}`}
        sub={`${kapasite.aktif_cagri ?? 0}/${kapasite.max_kapasite ?? 0} aktif kanal`}
        gauge={kapasite.yuzde}
      />
      <KpiCard
        Icon={AlertTriangle}
        color={C.alarm}
        label="Abandon Rate (Bugün)"
        value={loading ? "—" : `%${abandon.yuzde ?? 0}`}
        sub={`${abandon.bugun_kacan ?? 0} kaçan / ${abandon.bugun_toplam ?? 0} toplam`}
        alarm={abandon.kritik === true}
        gauge={abandon.yuzde}
      />
      <KpiCard
        Icon={Zap} color={C.purple}
        label="XP / Çağrı Verimliliği"
        value={loading ? "—" : (verim.xp_per_cagri ?? 0).toFixed(2)}
        sub={`${verim.toplam_xp_bugun ?? 0} XP · ${verim.toplam_cagri_bugun ?? 0} çağrı`}
      />
      <KpiCard
        Icon={Star} color={C.active}
        label="Bugün Ortalama CSAT"
        value={loading ? "—"
              : (csat.bugun_ortalama ? `${csat.bugun_ortalama.toFixed(1)}/5` : "—")}
        sub="Müşteri memnuniyeti — bugün"
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   2. SUPERVISOR DENETIM MATRISI
════════════════════════════════════════════════════════════════════════════ */
function SupervisorCard({ sup, onTalimat, onOverride, busy }) {
  const overload = sup.toplam_bekleyen > 5;
  return (
    <div style={{
      background: "#ffffff",
      border: `1px solid ${overload ? "rgba(239,68,68,0.25)" : C.border}`,
      borderTop: `2px solid ${overload ? C.alarm : C.busy}`,
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={sup.ad_soyad} color={overload ? C.alarm : C.busy} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{sup.ad_soyad}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {sup.yonetilen_ekipler} · {sup.ekip_boyutu} personel
          </div>
        </div>
        {overload && <Badge label="YÜKLÜ" color={C.alarm} small />}
      </div>

      {/* Metrikler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {[
          { lbl: "Bekl. Mola",    val: sup.bekleyen_mola,    color: C.break  },
          { lbl: "Bekl. Vardiya", val: sup.bekleyen_vardiya, color: C.busy   },
          { lbl: "Bekl. Şikayet", val: sup.bekleyen_sikayet, color: C.alarm  },
          { lbl: "Bugün Karar",   val: sup.bugun_karar,      color: C.active },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{
            background: "#f8fafc", border: `1px solid ${C.borderL}`,
            borderRadius: 10, padding: "9px 10px",
          }}>
            <div style={{
              fontSize: 18, fontWeight: 800, color,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {val ?? 0}
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 4 }}>
              {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Aksiyonlar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onTalimat(sup)} disabled={busy} style={{
          flex: "1 1 130px", padding: "8px 12px", borderRadius: 8, border: "none",
          background: `linear-gradient(135deg, ${C.alarm}, #dc2626)`,
          color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          boxShadow: "0 2px 8px rgba(239,68,68,0.25)",
        }}>
          <Send size={11} /> Talimat Ver
        </button>
        {sup.toplam_bekleyen > 0 && (
          <>
            <button onClick={() => onOverride(sup, "approve")} disabled={busy} style={{
              flex: "1 1 110px", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.active}40`,
              background: `${C.active}10`, color: C.active,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <CheckCircle2 size={11} /> Hepsini Onayla
            </button>
            <button onClick={() => onOverride(sup, "reject")} disabled={busy} style={{
              flex: "1 1 110px", padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.alarm}40`,
              background: `${C.alarm}10`, color: C.alarm,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <XCircle size={11} /> Hepsini Reddet
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   3. EKİP KARŞILAŞTIRMA (Battleground)
════════════════════════════════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#ffffff", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(15,23,42,0.12)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <span style={{ color: C.muted, flex: 1, fontSize: 11 }}>{p.name}</span>
          <span style={{ fontWeight: 800, color: C.text }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TeamComparisonView({ teams, loading, onSendTalimatToSupervisor }) {
  const data = (teams || []).map((t) => ({
    ekip:      t.ekip_ad,
    cagri:     t.bugun_cagri,
    cevap:     t.bugun_cevaplanan,
    kacan:     t.bugun_kacan,
    csat5x:    Math.round((t.ortalama_csat || 0) * 20) / 1, // 0-100
    xp_k:      Math.round((t.toplam_xp || 0) / 100),        // /100 ölçek
    raw:       t,
  }));
  const empty = data.length === 0;

  return (
    <Panel title="Ekip Karşılaştırma — MH Battleground"
      accentColor={C.purple}
      badge={teams?.length || null}>
      {empty && !loading ? (
        <div style={{ color: C.muted, fontSize: 12, padding: "30px 0", textAlign: "center" }}>
          Ekip karşılaştırma verisi bulunamadı
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div style={{ height: 260, marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="ekip" tick={{ fontSize: 11, fill: C.muted, fontWeight: 600 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cagri" name="Çağrı"     fill={C.busy}    radius={[6, 6, 0, 0]} />
                <Bar dataKey="cevap" name="Cevaplanan" fill={C.active}  radius={[6, 6, 0, 0]} />
                <Bar dataKey="csat5x" name="CSAT (×20)" fill={C.purple} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ekip kartları */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
            gap: 12,
          }}>
            {(teams || []).map((t) => {
              const cevapYuzde = t.bugun_cagri
                ? Math.round((t.bugun_cevaplanan / t.bugun_cagri) * 100)
                : 0;
              const lowPerf = (t.bugun_cagri > 0)
                && (cevapYuzde < 70 || (t.ortalama_csat && t.ortalama_csat < 3));
              return (
                <div key={t.ekip_id} style={{
                  background: "#f8fafc",
                  border: `1px solid ${lowPerf ? "rgba(239,68,68,0.25)" : C.borderL}`,
                  borderLeft: `3px solid ${lowPerf ? C.alarm : C.purple}`,
                  borderRadius: 12, padding: "12px 14px",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{t.ekip_ad}</div>
                    {lowPerf && <Badge label="DÜŞÜK PERFORMANS" color={C.alarm} small />}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {t.supervisor_ad || "Supervisor atanmamış"} · {t.personel_sayisi} kişi
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[
                      { lbl: "Çağrı",     val: t.bugun_cagri,      color: C.busy   },
                      { lbl: "Cevap %",   val: `${cevapYuzde}%`,    color: C.active },
                      { lbl: "Avg CSAT",  val: t.ortalama_csat ? t.ortalama_csat.toFixed(1) : "—", color: C.purple },
                    ].map(({ lbl, val, color }) => (
                      <div key={lbl} style={{
                        background: "#fff", border: `1px solid ${C.borderL}`,
                        borderRadius: 8, padding: "6px 8px", textAlign: "center",
                      }}>
                        <div style={{
                          fontSize: 14, fontWeight: 800, color,
                          fontVariantNumeric: "tabular-nums",
                        }}>{val ?? 0}</div>
                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginTop: 2 }}>
                          {lbl}
                        </div>
                      </div>
                    ))}
                  </div>
                  {lowPerf && (
                    <button
                      onClick={() => onSendTalimatToSupervisor(t)}
                      style={{
                        padding: "7px 12px", borderRadius: 8, border: "none",
                        background: `linear-gradient(135deg, ${C.alarm}, ${C.break})`,
                        color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      <Send size={11} /> Supervisor'a Talimat Gönder
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. AI KRIZ RADARI
════════════════════════════════════════════════════════════════════════════ */
function CrisisRadar({ items, loading, onTrainingFlag, onPersonClick }) {
  return (
    <Panel title="AI Kriz Radarı — Düşük Duygu Skoru"
      accentColor={C.alarm}
      badge={items?.length || null}>
      {!items?.length && !loading ? (
        <div style={{ color: C.muted, fontSize: 12, padding: "30px 0", textAlign: "center" }}>
          Düşük duygu skorlu çağrı bulunamadı (son 2 gün)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(items || []).map((c) => {
            const c1 = c.duygu_skoru === 1;
            return (
              <div key={c.analiz_id} style={{
                background: c1 ? "rgba(239,68,68,0.04)" : "#f8fafc",
                border: `1px solid ${c1 ? "rgba(239,68,68,0.25)" : C.borderL}`,
                borderLeft: `3px solid ${c1 ? C.alarm : C.break}`,
                borderRadius: 10, padding: "11px 14px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  minWidth: 44, gap: 2,
                }}>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    color: c1 ? C.alarm : C.break, lineHeight: 1,
                  }}>
                    {c.duygu_skoru ?? "?"}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>
                    DUYGU
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, color: C.text, fontWeight: 600, marginBottom: 4,
                  }}>
                    {c.ai_ozet || "(AI özeti yok)"}
                  </div>
                  <div style={{
                    fontSize: 10.5, color: C.muted,
                    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Phone size={10} /> {fmtTime(c.baslangic)}
                    </span>
                    {c.personel_ad && (
                      <span
                        onClick={() => onPersonClick(c.personel_id)}
                        style={{
                          cursor: "pointer", color: C.busy, fontWeight: 600,
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}
                      >
                        {c.personel_ad}
                        <ChevronRight size={10} />
                      </span>
                    )}
                    {c.ekip_ad && <Badge label={c.ekip_ad} color={C.purple} small />}
                    {c.csat_skoru && <Badge label={`CSAT ${c.csat_skoru}/5`} color={C.muted} small />}
                  </div>
                </div>
                {c.personel_id && (
                  <button onClick={() => onTrainingFlag(c)} title="Eğitime Gönder"
                    style={{
                      padding: "6px 10px", borderRadius: 7, border: "none",
                      background: C.alarm, color: "#fff",
                      fontSize: 10.5, fontWeight: 800, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                    }}>
                    <GraduationCap size={11} /> Eğit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. SUPERVISOR AUDIT LOG (alt panel)
════════════════════════════════════════════════════════════════════════════ */
function AuditFeed({ logs, loading }) {
  return (
    <Panel title="Supervisor Eylem Logu"
      accentColor={C.teal}
      badge={logs?.length || null}>
      {!logs?.length && !loading ? (
        <div style={{ color: C.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>
          Son 7 günde supervisor eylemi kaydedilmemiş
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto" }}>
          {(logs || []).map((l) => {
            const aksColor = l.aksiyon === "override"      ? C.alarm
                          : l.aksiyon === "xp_correction" ? C.purple
                          : l.aksiyon === "delete"        ? C.alarm
                          : C.busy;
            return (
              <div key={l.id} style={{
                display: "grid",
                gridTemplateColumns: "100px 130px 1fr 110px",
                gap: 10, alignItems: "center",
                padding: "9px 10px", borderRadius: 8,
                background: "#f8fafc", border: `1px solid ${C.borderL}`,
              }}>
                <Badge label={l.aksiyon?.toUpperCase()} color={aksColor} small />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.text }}>
                  {l.user_ad}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>
                  <span style={{ color: C.text, fontWeight: 600 }}>{l.tablo_adi}</span>
                  {l.kayit_id && <span> · #{String(l.kayit_id).slice(0, 8)}</span>}
                </span>
                <span style={{ fontSize: 10.5, color: C.muted, textAlign: "right", fontFamily: "monospace" }}>
                  {l.tarih ? new Date(l.tarih).toLocaleString("tr-TR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  }) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. TALİMAT MODALI
════════════════════════════════════════════════════════════════════════════ */
function TalimatModal({ open, target, onClose, onSubmit }) {
  const [baslik, setBaslik]   = useState("");
  const [icerik, setIcerik]   = useState("");
  const [busy,   setBusy]     = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    if (open) { setBaslik(""); setIcerik(""); setResult(null); }
  }, [open]);

  if (!open) return null;

  const handleSend = async () => {
    if (baslik.trim().length < 3) {
      setResult({ ok: false, msg: "Başlık en az 3 karakter olmalı" });
      return;
    }
    setBusy(true); setResult(null);
    try {
      await onSubmit({ alici_id: target.id, baslik: baslik.trim(), icerik: icerik.trim() });
      setResult({ ok: true, msg: "Talimat gönderildi · audit'e kaydedildi" });
      setTimeout(onClose, 800);
    } catch (err) {
      setResult({ ok: false, msg: err?.response?.data?.detail || "Gönderilemedi" });
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16,
        padding: 0, width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(15,23,42,0.4)",
        overflow: "hidden",
      }}>
        <div style={{
          height: 3, background: `linear-gradient(90deg, ${C.alarm}, ${C.break})`,
        }} />
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${C.alarm}12`, border: `1px solid ${C.alarm}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Send size={15} color={C.alarm} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Talimat Gönder</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Alıcı: <strong style={{ color: C.text }}>{target?.ad_soyad}</strong>
                {target?.yonetilen_ekipler && ` · ${target.yonetilen_ekipler}`}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>
              Başlık
            </div>
            <input
              value={baslik} onChange={(e) => setBaslik(e.target.value)}
              placeholder="örn: Bekleyen mola taleplerini bugün karara bağla"
              style={{
                width: "100%", height: 38, padding: "0 12px", boxSizing: "border-box",
                background: "#f8fafc", border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>
              Detay (opsiyonel)
            </div>
            <textarea
              value={icerik} onChange={(e) => setIcerik(e.target.value)}
              rows={4}
              placeholder="Ek açıklama, son tarih, KPI bağlantısı..."
              style={{
                width: "100%", padding: "10px 12px", boxSizing: "border-box",
                background: "#f8fafc", border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13,
                outline: "none", resize: "vertical", fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={busy} style={{
              flex: 1, height: 40, borderRadius: 9,
              background: "#f1f5f9", border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>
              İptal
            </button>
            <button onClick={handleSend} disabled={busy || baslik.trim().length < 3} style={{
              flex: 2, height: 40, borderRadius: 9, border: "none",
              background: busy || baslik.trim().length < 3
                ? "#e2e8f0"
                : `linear-gradient(135deg, ${C.alarm}, ${C.break})`,
              color: busy || baslik.trim().length < 3 ? C.muted : "#fff",
              fontSize: 12.5, fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: busy ? "none" : "0 2px 8px rgba(239,68,68,0.25)",
            }}>
              <Send size={12} />
              {busy ? "Gönderiliyor..." : "Gönder · Audit'e Kaydet"}
            </button>
          </div>

          {result && <Toast kind={result.ok ? "ok" : "err"} msg={result.msg} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function Operations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const [summary,    setSummary]    = useState(null);
  const [supervisors,setSupervisors]= useState([]);
  const [teams,      setTeams]      = useState([]);
  const [crisis,     setCrisis]     = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync,   setLastSync]   = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [pageToast,  setPageToast]  = useState(null);
  const [modal,      setModal]      = useState(null); // { kind: "talimat", target }
  const timerRef = useRef(null);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const results = await Promise.allSettled([
      operationsApi.getSummary(),
      operationsApi.getSupervisors(),
      operationsApi.getTeamComparison(),
      operationsApi.getCrisisRadar(5),
      operationsApi.getAuditLogs({ limit: 30, only_overrides: false }),
    ]);
    const get = (i) => results[i]?.status === "fulfilled" ? results[i].value.data : null;
    setSummary(get(0));
    setSupervisors(get(1) || []);
    setTeams(get(2) || []);
    setCrisis(get(3) || []);
    setLogs(get(4) || []);
    setLastSync(new Date());
    setLoading(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const showToast = (kind, msg) => {
    setPageToast({ kind, msg });
    setTimeout(() => setPageToast(null), 3500);
  };

  const handleSendTalimat = async (body) => {
    await operationsApi.sendTalimat(body);
    fetchAll();
  };

  const handleOverridePending = async (sup, action) => {
    const verb = action === "approve" ? "ONAYLANACAK" : "REDDEDİLECEK";
    if (!window.confirm(
      `${sup.ad_soyad}'ın bekleyen ${sup.toplam_bekleyen} talebi ${verb}.\n` +
      `Tüm değişiklikler audit log'a kaydedilecek. Devam edilsin mi?`
    )) return;
    setBusy(true);
    try {
      const res = await operationsApi.overridePending({
        supervisor_id: sup.id,
        action,
        reason: `Admin override · ${user?.username || "admin"} · ${sup.ad_soyad}`,
        scope: "all",
      });
      showToast("ok",
        `${res.data.affected_mola} mola · ${res.data.affected_vardiya} vardiya işlendi`);
      fetchAll();
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "İşlem başarısız");
    } finally { setBusy(false); }
  };

  const handleSendTalimatToTeamSup = (team) => {
    if (!team.supervisor_ad) {
      showToast("err", "Bu ekibe atanmış supervisor bulunamadı");
      return;
    }
    // İlk eşleşen supervisor'ı bul
    const sup = supervisors.find((s) => (s.yonetilen_ekipler || "").includes(team.ekip_ad));
    if (!sup) {
      showToast("err", "Supervisor matrisinde eşleşen kart bulunamadı");
      return;
    }
    setModal({ kind: "talimat", target: { ...sup,
      _prefill: `${team.ekip_ad} ekibinin performansı kritik seviyede` } });
  };

  const handleTrainingFlag = async (c) => {
    const neden = window.prompt(
      `${c.personel_ad} eğitime gönderilecek. Sebep:`,
      `Düşük duygu skoru (${c.duygu_skoru}/5) — çağrı: ${(c.cagri_id || "").slice(0, 8)}`
    );
    if (!neden || neden.trim().length < 5) return;
    try {
      await operationsApi.flagTraining({
        user_id:  c.personel_id,
        cagri_id: c.cagri_id,
        neden:    neden.trim(),
      });
      showToast("ok", `${c.personel_ad} eğitim listesine eklendi`);
      fetchAll();
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "İşlem başarısız");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>

      {/* ── BAŞLIK ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 4, borderBottom: "1px solid rgba(0,0,0,0.06)",
        gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: C.text, letterSpacing: "-0.025em",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Brain size={20} color={C.alarm} />
            Operasyon Komuta Merkezi
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted, fontWeight: 500 }}>
            Stratejik KPI · Supervisor denetimi · Ekip karşılaştırma · AI kriz radarı
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: C.faint, fontWeight: 500 }}>
              {lastSync.toLocaleTimeString("tr-TR")}
            </span>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: "rgba(239,68,68,0.06)",
            border: "1.5px solid rgba(239,68,68,0.22)",
            borderRadius: 8,
          }}>
            <Shield size={12} color={C.alarm} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.alarm }}>
              {isAdmin ? "ANA KARARGAH" : "İZLEME"}
            </span>
          </div>
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "6px 14px",
              fontSize: 12, fontWeight: 600, color: "#475569",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            Yenile
          </button>
        </div>
      </div>

      {/* ── 1. STRATEJIK KPI ŞERİDİ ────────────────────────────────────── */}
      <StrategicKpiStrip summary={summary} loading={loading} />

      {/* ── 2. SUPERVISOR DENETİM MATRISI ──────────────────────────────── */}
      <Panel title="Supervisor Denetim Matrisi"
        accentColor={C.busy}
        badge={supervisors?.length || null}>
        {!supervisors?.length && !loading ? (
          <div style={{ color: C.muted, fontSize: 12, padding: "30px 0", textAlign: "center" }}>
            MH ekiplerini yöneten supervisor bulunamadı
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(340px, 1fr))`,
            gap: 12,
          }}>
            {(supervisors || []).map((s) => (
              <SupervisorCard
                key={s.id}
                sup={s}
                busy={busy}
                onTalimat={(target) => setModal({ kind: "talimat", target })}
                onOverride={handleOverridePending}
              />
            ))}
          </div>
        )}
      </Panel>

      {/* ── 3 & 4. EKİP KARŞILAŞTIRMA + AI KRIZ ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
        className="ops-main-grid">
        <TeamComparisonView
          teams={teams} loading={loading}
          onSendTalimatToSupervisor={handleSendTalimatToTeamSup}
        />
        <CrisisRadar
          items={crisis} loading={loading}
          onTrainingFlag={handleTrainingFlag}
          onPersonClick={(uid) => navigate(`/admin/personnel/${uid}`)}
        />
      </div>

      {/* ── 5. SUPERVISOR EYLEM LOGU ────────────────────────────────────── */}
      <AuditFeed logs={logs} loading={loading} />

      {/* ── TALİMAT MODALI ───────────────────────────────────────────── */}
      <TalimatModal
        open={modal?.kind === "talimat"}
        target={modal?.target}
        onClose={() => setModal(null)}
        onSubmit={handleSendTalimat}
      />

      {/* ── Sayfa toast ─────────────────────────────────────────────── */}
      {pageToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100,
          padding: "12px 16px", borderRadius: 10,
          background: "#ffffff",
          border: `1px solid ${pageToast.kind === "ok" ? C.active : C.alarm}40`,
          borderLeft: `3px solid ${pageToast.kind === "ok" ? C.active : C.alarm}`,
          boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
          fontSize: 12.5, fontWeight: 600,
          color: pageToast.kind === "ok" ? C.active : C.alarm,
          display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
        }}>
          {pageToast.kind === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {pageToast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes alarmFlash {
          0%, 100% { box-shadow: 0 2px 12px rgba(239,68,68,0.12); }
          50%      { box-shadow: 0 2px 24px rgba(239,68,68,0.45); }
        }
        @media (max-width: 1100px) {
          .ops-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
