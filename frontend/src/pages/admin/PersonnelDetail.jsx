/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · PERSONEL DETAY (Komuta Sayfası) — V3 Komuta Modeli
   ────────────────────────────────────────────────────────────────────────────
   Genel Bakış ile aynı dil:
     · Beyaz Panel kartları, soft shadow, üst renk şeridi
     · #0f172a metin, #94a3b8 muted, accent renkleri eşleşir
   Üstte Profil & Anlık Durum kartı (mola override butonu),
   sonra 4 sekme: Performans · Vardiya & Oturum · Mola Geçmişi · Gamification
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Phone, Star, Zap, Coffee, Shield,
  Wifi, WifiOff, AlertTriangle, CheckCircle2,
  TrendingUp, Clock, ScrollText, Trophy, Activity,
  History, Lock, GraduationCap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { personnelApi, operationsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Panel } from "@/pages/admin/Overview";

/* ─── Tema (Genel Bakış ile birebir) ────────────────────────────────────────── */
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
  offline: "#94a3b8",
  alarm:   "#ef4444",
  purple:  "#8b5cf6",
};

const DURUM = {
  aktif:   { color: C.active,  bg: "rgba(16,185,129,0.08)",  label: "Aktif"     },
  mesgul:  { color: C.busy,    bg: "rgba(59,130,246,0.08)",  label: "Görüşmede" },
  mola:    { color: C.break,   bg: "rgba(245,158,11,0.08)",  label: "Molada"    },
  offline: { color: C.offline, bg: "rgba(148,163,184,0.08)", label: "Offline"   },
};

const UNVAN_STYLE = {
  Bronz:  { color: "#92400e", bg: "rgba(146,64,14,0.08)" },
  Gumus:  { color: "#475569", bg: "rgba(71,85,105,0.08)" },
  Altin:  { color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  Platin: { color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
};

/* ─── Yardımcılar ───────────────────────────────────────────────────────────── */
const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  : "—";
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
  : "—";
const fmtDateLong = (iso) => iso
  ? new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  : "—";

function Avatar({ name, color, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}15`, border: `2px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 800, color,
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

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 150,
      background: "#ffffff",
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${color}`,
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={color} strokeWidth={2.4} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color,
          lineHeight: 1, fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}>
          {value}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, marginTop: 5 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#ffffff", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(15,23,42,0.12)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6, fontSize: 11 }}>{label}</div>
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

function Toast({ kind, msg }) {
  if (!msg) return null;
  const ok = kind === "ok";
  const color = ok ? C.active : C.alarm;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      marginTop: 10, padding: "8px 12px", borderRadius: 8,
      background: `${color}10`, border: `1px solid ${color}28`,
      fontSize: 11, fontWeight: 600, color,
    }}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {msg}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 1 — PERFORMANS & ÇAĞRILAR
════════════════════════════════════════════════════════════════════════════ */
function PerformanceTab({ performans }) {
  const data = (performans || []).map((r) => ({
    tarih:      r.gun?.slice(5) || "",
    toplam:     r.toplam || 0,
    cevaplanan: r.cevaplanan || 0,
    csat:       r.ort_csat || 0,
  }));
  const empty = data.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title="Son 7 Gün — Çağrı Hacmi" accentColor={C.active}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          Toplam ve cevaplanan çağrı sayısı
        </div>
        {empty ? (
          <div style={{
            height: 220, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.muted, fontSize: 12,
          }}>
            Bu personel için son 7 günde çağrı verisi bulunamadı
          </div>
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.busy}   stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.busy}   stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradAns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.active} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.active} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="toplam" name="Toplam"
                  stroke={C.busy} strokeWidth={2}
                  fill="url(#gradTop)" dot={false}
                  activeDot={{ r: 4, fill: C.busy, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="cevaplanan" name="Cevaplanan"
                  stroke={C.active} strokeWidth={2}
                  fill="url(#gradAns)" dot={false}
                  activeDot={{ r: 4, fill: C.active, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="CSAT Trendi (5 üzerinden)" accentColor={C.purple}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          Müşteri memnuniyeti — günlük ortalama
        </div>
        {empty || data.every((r) => r.csat === 0) ? (
          <div style={{ color: C.muted, fontSize: 12, padding: "20px 0" }}>
            CSAT skoru kaydı yok
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 110 }}>
            {data.map((r) => {
              const c = r.csat >= 4 ? C.active
                      : r.csat >= 3 ? C.break
                      : r.csat > 0  ? C.alarm
                                    : C.faint;
              const h = Math.max(4, Math.round(r.csat / 5 * 80));
              return (
                <div key={r.tarih} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: h, background: c, borderRadius: "4px 4px 0 0",
                    margin: "0 auto 6px", width: "60%",
                    opacity: r.csat > 0 ? 0.85 : 0.25,
                    transition: "height 0.4s ease",
                  }} />
                  <div style={{ fontSize: 11, color: c, fontWeight: 700 }}>
                    {r.csat > 0 ? r.csat.toFixed(1) : "—"}
                  </div>
                  <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{r.tarih}</div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 2 — VARDİYA & OTURUM
════════════════════════════════════════════════════════════════════════════ */
function SessionsTab({ oturumlar }) {
  const items = oturumlar || [];

  const calcSure = (login, cikis) => {
    if (!login || !cikis) return null;
    const dk = Math.round((new Date(cikis) - new Date(login)) / 60000);
    if (dk < 60) return `${dk}dk`;
    return `${Math.floor(dk / 60)}s ${dk % 60}dk`;
  };

  return (
    <Panel title="Son 14 Gün — Oturum Kayıtları" accentColor={C.busy}
      badge={items.length || null}>
      {items.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>
          Oturum kaydı bulunamadı
        </div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 90px 90px 80px 90px 120px 1fr",
            padding: "0 8px 10px",
            color: C.muted, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.07em",
            borderBottom: `1px solid ${C.borderL}`,
          }}>
            {["Tarih", "Giriş", "Çıkış", "Süre", "Geç (dk)", "Durum", "IP Adresi"].map((h) =>
              <span key={h}>{h}</span>
            )}
          </div>

          {items.map((s) => {
            const late     = (s.gec_giris_dk || 0) > 10;
            const slightly = (s.gec_giris_dk || 0) > 0 && !late;
            const sure     = calcSure(s.login_zamani, s.cikis_zamani);
            return (
              <div key={s.id} style={{
                display: "grid",
                gridTemplateColumns: "100px 90px 90px 80px 90px 120px 1fr",
                padding: "11px 8px",
                borderBottom: `1px solid ${C.borderL}`,
                alignItems: "center",
                background: late ? "rgba(239,68,68,0.04)" : "transparent",
                borderLeft: late ? `3px solid ${C.alarm}` : "3px solid transparent",
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.text }}>
                  {fmtDate(s.tarih)}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.busy, fontFamily: "monospace" }}>
                  {fmtTime(s.login_zamani)}
                </span>
                <span style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: s.cikis_zamani ? C.muted : C.active,
                  fontFamily: "monospace",
                }}>
                  {s.cikis_zamani ? fmtTime(s.cikis_zamani) : "AKTİF"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: "monospace" }}>
                  {sure || "—"}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: late ? C.alarm : slightly ? C.break : C.muted,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {(s.gec_giris_dk || 0) > 0 ? (
                    <>
                      <Clock size={10} />
                      +{s.gec_giris_dk}dk
                    </>
                  ) : "—"}
                </span>
                <span>
                  {late      ? <Badge label={`${s.gec_giris_dk}DK GEÇ KALDI`} color={C.alarm}  small />
                  : slightly ? <Badge label="BİRAZ GEÇ"                       color={C.break}  small />
                             : <Badge label="ZAMANINDA"                       color={C.active} small />}
                </span>
                <span style={{ fontSize: 10.5, fontFamily: "monospace" }}>
                  {s.ip_adresi ? (
                    <a
                      href={`https://whatismyipaddress.com/ip/${s.ip_adresi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: C.busy, textDecoration: "none" }}
                      onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                      onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                    >
                      {s.ip_adresi}
                    </a>
                  ) : (
                    <span style={{ color: C.muted }}>Bilinmiyor</span>
                  )}
                </span>
              </div>
            );
          })}
        </>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 3 — MOLA GEÇMİŞİ
════════════════════════════════════════════════════════════════════════════ */
function BreaksTab({ molalar }) {
  const items = molalar || [];

  return (
    <Panel title="Son 30 Gün — Mola Kayıtları" accentColor={C.break}
      badge={items.length || null}>
      {items.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>
          Mola kaydı bulunamadı
        </div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 130px 130px 90px 100px 130px",
            padding: "0 8px 10px",
            color: C.muted, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.07em",
            borderBottom: `1px solid ${C.borderL}`,
          }}>
            {["Mola Tipi", "Başlangıç", "Bitiş", "Plan", "Gerçek", "Durum"].map((h) =>
              <span key={h}>{h}</span>
            )}
          </div>

          {items.map((m) => {
            const overrun = m.planlanan_dk > 0 && m.gerceklesen_dk > m.planlanan_dk;
            const overrunDk = overrun
              ? Math.round((m.gerceklesen_dk - m.planlanan_dk) * 10) / 10
              : 0;
            return (
              <div key={m.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 130px 90px 100px 130px",
                padding: "11px 8px",
                borderBottom: `1px solid ${C.borderL}`,
                alignItems: "center",
                background: overrun ? "rgba(239,68,68,0.04)" : "transparent",
                borderLeft: overrun ? `3px solid ${C.alarm}` : "3px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Coffee size={13} color={overrun ? C.alarm : C.break} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>
                    {m.tur || "Mola"}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
                  {fmtDateLong(m.baslangic)}
                </span>
                <span style={{
                  fontSize: 11, color: m.devam_ediyor ? C.active : C.muted,
                  fontFamily: "monospace", fontWeight: m.devam_ediyor ? 700 : 500,
                }}>
                  {m.devam_ediyor ? "DEVAM EDİYOR" : fmtDateLong(m.bitis)}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: C.muted,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {m.planlanan_dk > 0 ? `${m.planlanan_dk} dk` : "—"}
                </span>
                <span style={{
                  fontSize: 12.5, fontWeight: 800,
                  color: overrun ? C.alarm : C.text,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {m.gerceklesen_dk?.toFixed(1)} dk
                </span>
                <span>
                  {overrun
                    ? <Badge label={`AŞIM +${overrunDk}DK`} color={C.alarm}  small />
                    : m.devam_ediyor
                    ? <Badge label="AKTİF"                  color={C.active} small />
                    : <Badge label="NORMAL"                 color={C.muted}  small />}
                </span>
              </div>
            );
          })}
        </>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEKME 4 — GAMIFICATION & KOMUTA
════════════════════════════════════════════════════════════════════════════ */
function GamificationTab({ profil, xpHistory, isAdmin, onSuccess }) {
  const [delta,  setDelta]  = useState("");
  const [sebep,  setSebep]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    const d = parseInt(delta, 10);
    if (!d || !sebep.trim()) {
      setResult({ ok: false, msg: "Delta ve sebep zorunludur." });
      return;
    }
    if (!window.confirm(`${d > 0 ? "+" : ""}${d} XP uygulanacak. Audit log'a kaydedilecek. Devam?`)) return;

    setBusy(true); setResult(null);
    try {
      const res = await personnelApi.manualXp({
        user_id: profil.id, delta: d, sebep: sebep.trim(),
      });
      setResult({
        ok: true,
        msg: `Yeni XP: ${res.data.yeni_xp?.toLocaleString("tr-TR")} (${d > 0 ? "+" : ""}${d})`,
      });
      setDelta(""); setSebep("");
      onSuccess?.();
    } catch (err) {
      setResult({ ok: false, msg: err?.response?.data?.detail || "İşlem başarısız." });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}
      className="gamification-grid">

      <Panel title="XP Hareketleri" accentColor={C.purple}
        badge={(xpHistory || []).length || null}>
        {(xpHistory || []).length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>
            XP hareketi bulunamadı
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 420, overflowY: "auto" }}>
            {xpHistory.map((h) => (
              <div key={h.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 8,
                background: "#f8fafc", border: `1px solid ${C.borderL}`,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 800, minWidth: 56,
                  color: h.miktar >= 0 ? C.active : C.alarm,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {h.miktar >= 0 ? "+" : ""}{h.miktar}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, color: C.text, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {h.sebep || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {h.kaynak === "admin_override" && (
                      <span style={{ color: C.alarm, fontWeight: 700, marginRight: 6 }}>OVERRIDE</span>
                    )}
                    {h.olusturan_ad ? `${h.olusturan_ad} · ` : ""}
                    {fmtDateLong(h.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Manuel XP Düzeltme" accentColor={isAdmin ? C.alarm : C.muted}
        action={isAdmin && <Badge label="AUDIT ZORUNLU" color={C.alarm} small />}>
        {!isAdmin ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(148,163,184,0.08)", border: `1px solid ${C.border}`,
            color: C.muted, fontSize: 12,
          }}>
            <Lock size={14} />
            Sadece Admin XP düzeltme yapabilir
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>
              Mevcut XP:{" "}
              <span style={{ color: C.purple, fontWeight: 800 }}>
                {profil.xp?.toLocaleString("tr-TR")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[-100, -50, -10, +10, +50, +100].map((v) => (
                <button key={v} onClick={() => setDelta(String(v))} style={{
                  flex: 1, height: 32, borderRadius: 8,
                  border: `1px solid ${(v < 0 ? C.alarm : C.active)}30`,
                  background: delta === String(v)
                    ? (v < 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)")
                    : "#ffffff",
                  color: v < 0 ? C.alarm : C.active,
                  fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                }}>
                  {v > 0 ? "+" : ""}{v}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>
                Delta (pozitif/negatif tam sayı)
              </div>
              <input
                type="number" value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+50 veya -100"
                style={{
                  width: "100%", height: 36, padding: "0 12px", boxSizing: "border-box",
                  background: "#f8fafc", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>
                Sebep (audit log için zorunlu)
              </div>
              <input
                value={sebep}
                onChange={(e) => setSebep(e.target.value)}
                placeholder="Hatalı XP iadesi, supervisor düzeltmesi..."
                style={{
                  width: "100%", height: 36, padding: "0 12px", boxSizing: "border-box",
                  background: "#f8fafc", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
                }}
              />
            </div>

            <button onClick={handleSubmit}
              disabled={busy || !delta || !sebep.trim()}
              style={{
                width: "100%", height: 40, borderRadius: 9, border: "none",
                background: busy || !delta || !sebep.trim()
                  ? "#e2e8f0"
                  : `linear-gradient(135deg, ${C.purple}, #6366f1)`,
                color: busy || !delta || !sebep.trim() ? C.muted : "#ffffff",
                fontSize: 12.5, fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: !busy && delta && sebep.trim() ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              {busy ? "İşleniyor..." : "XP Düzelt & Audit'e Kaydet"}
            </button>

            {result && <Toast kind={result.ok ? "ok" : "err"} msg={result.msg} />}
          </>
        )}
      </Panel>

      <style>{`
        @media (max-width: 1100px) {
          .gamification-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: "perf",   label: "Performans & Çağrılar", Icon: TrendingUp },
  { key: "sess",   label: "Vardiya & Oturum",      Icon: ScrollText },
  { key: "breaks", label: "Mola Geçmişi",          Icon: Coffee     },
  { key: "xp",     label: "Gamification & Komuta", Icon: Trophy     },
];

export default function PersonnelDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isAdmin    = user?.role === "admin";

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("perf");

  const [endBreakBusy,   setEndBreakBusy]   = useState(false);
  const [endBreakResult, setEndBreakResult] = useState(null);

  const [trainBusy,   setTrainBusy]   = useState(false);
  const [trainSent,   setTrainSent]   = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await personnelApi.getDetails(id);
      setDetails(res.data);
    } catch {
      setDetails(null);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const profil  = details?.profil;
  const d       = DURUM[profil?.anlik_durum] || DURUM.offline;
  const overrun = (profil?.mola_asimi_dk || 0) > 0;
  const unvanS  = UNVAN_STYLE[profil?.unvan];

  const xpPerLevel = 500;
  const xpPct = useMemo(() => {
    if (!profil) return 0;
    return Math.min(100, Math.round((profil.xp % xpPerLevel) / xpPerLevel * 100));
  }, [profil]);

  const handleEndBreak = async () => {
    if (!window.confirm(`${profil.ad_soyad} adlı personelin molası zorla bitirilecek. Onaylıyor musunuz?`)) return;
    setEndBreakBusy(true); setEndBreakResult(null);
    try {
      await personnelApi.endBreakOverride({
        user_id: profil.id,
        sebep:   `Detay sayfası override · admin: ${user?.username || ""}`,
      });
      setEndBreakResult({ ok: true, msg: "Mola bitirildi. Audit'e kaydedildi." });
      fetchDetails();
    } catch (err) {
      setEndBreakResult({
        ok: false,
        msg: err?.response?.data?.detail || "Aktif onaylı mola bulunamadı.",
      });
    } finally { setEndBreakBusy(false); }
  };

  const handleFlagTraining = async () => {
    setTrainBusy(true); setTrainResult(null);
    try {
      await operationsApi.flagTraining({
        user_id: profil.id,
        neden: "Admin tarafından eğitime atandı (war room komuta)",
      });
      setTrainSent(true);
      setTrainResult({ ok: true, msg: "Personel eğitime atandı." });
      fetchDetails();
    } catch (err) {
      setTrainResult({ ok: false, msg: err?.response?.data?.detail || "İşlem başarısız." });
    } finally { setTrainBusy(false); }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
        Yükleniyor...
      </div>
    );
  }

  if (!profil) {
    return (
      <div>
        <button onClick={() => navigate("/admin/personnel")} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          background: "#ffffff", border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.muted, fontSize: 12, cursor: "pointer", marginBottom: 24,
        }}>
          <ArrowLeft size={13} /> Personel Listesi
        </button>
        <div style={{ color: C.alarm, fontSize: 14 }}>Personel bulunamadı.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

      {/* Geri linki */}
      <button onClick={() => navigate("/admin/personnel")} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", background: "#ffffff",
        border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
        width: "fit-content",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <ArrowLeft size={13} /> Personel Listesi
      </button>

      {/* ─── PROFİL & ANLIK DURUM KARTI ─────────────────────────────────── */}
      <div style={{
        background: "#ffffff",
        border: `1px solid ${overrun ? "rgba(239,68,68,0.25)" : C.border}`,
        borderRadius: 16,
        boxShadow: overrun
          ? "0 2px 12px rgba(239,68,68,0.1)"
          : "0 2px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        <div style={{
          height: 3,
          background: overrun
            ? `linear-gradient(90deg, ${C.alarm}, ${C.break})`
            : `linear-gradient(90deg, ${d.color}, ${d.color}44)`,
        }} />

        <div style={{
          padding: "20px 22px",
          display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{ position: "relative" }}>
            <Avatar name={profil.ad_soyad} color={overrun ? C.alarm : d.color} size={64} />
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 14, height: 14, borderRadius: "50%",
              background: d.color, border: "2px solid #ffffff",
              boxShadow: `0 0 0 2px ${d.color}30`,
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
                {profil.ad_soyad}
              </h2>
              {unvanS && (
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                  color: unvanS.color, background: unvanS.bg,
                  border: `1px solid ${unvanS.color}25`,
                  borderRadius: 5, padding: "2px 7px",
                }}>
                  {profil.unvan?.toUpperCase()}
                </span>
              )}
              {overrun && (
                <Badge label={`MOLA AŞIMI +${profil.mola_asimi_dk}DK`} color={C.alarm} />
              )}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              @{profil.kullanici_adi} · {profil.rol || "—"} · {profil.departman || "—"} / {profil.ekip || "—"}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 999,
                background: d.bg, border: `1px solid ${d.color}28`,
                fontSize: 11, fontWeight: 700, color: d.color,
              }}>
                <Activity size={10} /> {d.label}
              </div>
              {profil.sip_durumu === "koptu" ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
                  fontSize: 11, fontWeight: 700, color: C.alarm,
                }}>
                  <WifiOff size={10} /> SIP Kopuk
                </div>
              ) : (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999,
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)",
                  fontSize: 11, fontWeight: 700, color: C.active,
                }}>
                  <Wifi size={10} /> SIP Bağlı
                </div>
              )}
              {profil.dahili_no && (
                <div style={{
                  padding: "3px 10px", borderRadius: 999,
                  background: "#f1f5f9", border: `1px solid ${C.border}`,
                  fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: "monospace",
                }}>
                  # {profil.dahili_no}
                </div>
              )}
            </div>
          </div>

          {/* XP / Seviye */}
          <div style={{
            background: "#f8fafc",
            border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 16px",
            minWidth: 150, textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>
              XP / SEVİYE
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: C.purple,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {profil.xp?.toLocaleString("tr-TR")}
            </div>
            <div style={{ fontSize: 11, color: C.muted, margin: "3px 0 8px", fontWeight: 600 }}>
              Seviye {profil.seviye}
            </div>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(0,0,0,0.06)" }}>
              <div style={{
                width: `${xpPct}%`, height: "100%",
                background: `linear-gradient(90deg, ${C.purple}, #6366f1)`,
                borderRadius: 3,
              }} />
            </div>
          </div>

          {/* EĞİTİME ATA */}
          {isAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
              <button
                onClick={handleFlagTraining}
                disabled={trainBusy || trainSent}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: trainSent
                    ? "rgba(16,185,129,0.1)"
                    : trainBusy ? "#e2e8f0"
                    : `linear-gradient(135deg, #8b5cf6, #6366f1)`,
                  color: trainSent ? C.active : trainBusy ? C.muted : "#fff",
                  fontSize: 12, fontWeight: 800,
                  cursor: trainSent || trainBusy ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  border: trainSent ? `1px solid ${C.active}30` : "1px solid transparent",
                  boxShadow: trainSent || trainBusy ? "none" : "0 2px 8px rgba(99,102,241,0.3)",
                }}
              >
                <GraduationCap size={14} />
                {trainBusy ? "Atanıyor..." : trainSent ? "Eğitimde" : "Eğitime Ata"}
              </button>
              {trainResult && <Toast kind={trainResult.ok ? "ok" : "err"} msg={trainResult.msg} />}
            </div>
          )}

          {/* MOLA OVERRIDE */}
          {profil.anlik_durum === "mola" && isAdmin && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 8,
              minWidth: 240, alignSelf: "stretch", justifyContent: "center",
            }}>
              <button onClick={handleEndBreak} disabled={endBreakBusy}
                style={{
                  padding: "14px 22px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.alarm}, ${C.break})`,
                  color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: `0 4px 18px rgba(239,68,68,0.35)`,
                  animation: overrun ? "pulseBtn 1.6s ease-in-out infinite" : "none",
                }}
              >
                <Coffee size={16} />
                {endBreakBusy ? "İşleniyor..." : "MOLAYI ZORLA BİTİR"}
              </button>
              {endBreakResult && <Toast kind={endBreakResult.ok ? "ok" : "err"} msg={endBreakResult.msg} />}
            </div>
          )}
        </div>
      </div>

      {/* ─── ÖZET KARTLARI ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard icon={Phone} label="Bugün Çağrı"
          value={profil.bugun_cagri || 0} color={C.busy} sub="Bugün" />
        <StatCard icon={Star} label="Ortalama CSAT"
          value={profil.bugun_csat > 0 ? `${profil.bugun_csat.toFixed(1)}/5` : "—"}
          color={profil.bugun_csat >= 4 ? C.active : profil.bugun_csat >= 3 ? C.break : C.alarm}
          sub="Müşteri memnuniyeti" />
        <StatCard icon={Zap} label="Toplam XP"
          value={profil.xp?.toLocaleString("tr-TR")}
          color={C.purple} sub={`Lv ${profil.seviye}`} />
        <StatCard icon={Activity} label="Anlık Durum"
          value={d.label} color={d.color} sub={profil.ekip || "—"} />
      </div>

      {/* ─── TAB BAR ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 2,
        background: "#ffffff",
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        padding: 4, overflow: "auto",
      }}>
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: active ? "rgba(16,185,129,0.1)" : "transparent",
              color: active ? C.active : C.muted,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s", outline: "none", whiteSpace: "nowrap",
            }}>
              <Icon size={13} /> {label}
            </button>
          );
        })}

        <div style={{
          marginLeft: "auto",
          display: "flex", alignItems: "center", gap: 6, paddingRight: 12,
        }}>
          <Shield size={11} color={isAdmin ? C.alarm : C.muted} />
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: isAdmin ? C.alarm : C.muted, letterSpacing: "0.05em",
          }}>
            {isAdmin ? "KOMUTA MERKEZİ" : "İZLEME MODU"}
          </span>
        </div>
      </div>

      {/* ─── SEKME İÇERİĞİ ─────────────────────────────────────────────── */}
      <div>
        {tab === "perf"   && <PerformanceTab performans={details.performans} />}
        {tab === "sess"   && <SessionsTab oturumlar={details.oturumlar} />}
        {tab === "breaks" && <BreaksTab molalar={details.molalar} />}
        {tab === "xp"     && (
          <GamificationTab
            profil={profil}
            xpHistory={details.xp_gecmisi}
            isAdmin={isAdmin}
            onSuccess={fetchDetails}
          />
        )}
      </div>

      <style>{`
        @keyframes pulseBtn {
          0%, 100% { box-shadow: 0 4px 18px rgba(239,68,68,0.35); }
          50%      { box-shadow: 0 4px 24px rgba(239,68,68,0.55); }
        }
      `}</style>
    </div>
  );
}
