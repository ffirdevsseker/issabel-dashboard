/* ════════════════════════════════════════════════════════════════════════════
   ADMIN · CANLI OPERASYON (WAR ROOM)  (/admin/operations)
   ────────────────────────────────────────────────────────────────────────────
   Kapsam   : SADECE Müşteri Hizmetleri departmanı
   Paneller : A) Canlı Çağrı Radarı (aktif görüşmeler)
              B) Kuyruk Monitörü    (kuyrukta bekleyenler)
              C) Personel Radarı    (ekip filtreli anlık durum)
   Veri     : Gerçek DB – 5 sn poll + 1 sn tick

   Aşama 2 — canlandırılan butonlar:
     · QueueCard  → Duraklat / Aktifleştir  (PATCH /queues/{id}/toggle)
     · StaffRow   → Mola Bitir              (POST  /actions/end-break/{uid})
     · StaffRow   → Talimat Gönder modal    (POST  /actions/send-instruction)
════════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Ear,
  Headphones,
  Minus,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  StopCircle,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { warRoomApi, operationsApi } from "@/services/api";
import { useAuth }    from "@/context/AuthContext";
import { Panel }      from "@/pages/admin/Overview";
import { ADMIN_THEME } from "@/constants/adminTheme";

const POLL_MS = 5_000;

/* ─── Statü renk haritası ────────────────────────────────────────────────── */
const D = {
  aktif:   { label: "Aktif",   color: "#10b981", bg: "rgba(16,185,129,0.09)" },
  mesgul:  { label: "Meşgul",  color: "#3b82f6", bg: "rgba(59,130,246,0.09)" },
  mola:    { label: "Mola",    color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
  offline: { label: "Offline", color: "#94a3b8", bg: "rgba(148,163,184,0.09)" },
};

const SIP_COLOR = {
  kayitli: "#10b981",
  mesgul:  "#3b82f6",
  koptu:   "#ef4444",
};

/* ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────── */
function fmtDur(sn) {
  if (sn < 0) sn = 0;
  const h  = Math.floor(sn / 3600);
  const m  = Math.floor((sn % 3600) / 60);
  const s  = sn % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtSn(sn) {
  if (sn == null || sn <= 0) return "0sn";
  if (sn < 60) return `${Math.round(sn)}sn`;
  const m = Math.floor(sn / 60);
  const s = Math.round(sn % 60);
  return s > 0 ? `${m}d ${s}sn` : `${m}d`;
}

function nowHMS() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
function StatusBadge({ durum }) {
  const d = D[durum] || D.offline;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
      color: d.color, background: d.bg, border: `1px solid ${d.color}30`,
      borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      {d.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   A. CANLI ÇAĞRI RADARI — aktif görüşmeler (mesgul personel)
════════════════════════════════════════════════════════════════════════════ */
function ActiveCallsPanel({ calls, nowMs, isAdmin, onAction }) {
  const cols = isAdmin ? "1fr 1fr 130px 88px 70px" : "1fr 1fr 130px 88px";
  const hdrs = isAdmin
    ? ["Müşteri / Numara", "Personel", "Kuyruk", "Süre", ""]
    : ["Müşteri / Numara", "Personel", "Kuyruk", "Süre"];

  return (
    <Panel title="📡 Canlı Çağrı Radarı" accentColor="#3b82f6" badge={calls.length}>
      {calls.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Şu an aktif görüşme yok
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: cols,
            gap: 8, padding: "6px 10px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}>
            {hdrs.map((h, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700, color: "#94a3b8",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{h}</div>
            ))}
          </div>

          {calls.map((c) => {
            const elapsed  = c.baslangic_zamani
              ? Math.floor((nowMs - new Date(c.baslangic_zamani)) / 1000)
              : (c.sure_sn || 0);
            const longCall = elapsed >= 900;

            return (
              <div
                key={c.id}
                style={{
                  display: "grid", gridTemplateColumns: cols,
                  gap: 8, padding: "9px 10px",
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                  alignItems: "center",
                  background: longCall ? "rgba(239,68,68,0.04)" : "transparent",
                  borderLeft: longCall ? "3px solid #ef4444" : "3px solid transparent",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#0f172a",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {c.musteri_ad || c.arayan_numara || "—"}
                  </div>
                  {c.musteri_ad && c.arayan_numara && c.arayan_numara !== "—" && (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.arayan_numara}</div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#0f172a",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {c.personel_ad || "—"}
                  </div>
                  {c.dahili_no && (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      ·{c.dahili_no}
                      {c.ekip_adi && c.ekip_adi !== "—" && (
                        <span style={{ marginLeft: 4 }}>· {c.ekip_adi}</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: 11, color: "#475569",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {c.kuyruk_adi || "—"}
                </div>

                <div style={{
                  fontSize: 13, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: longCall ? "#ef4444" : "#3b82f6",
                  whiteSpace: "nowrap",
                }}>
                  {fmtDur(elapsed)}
                </div>

                {isAdmin && (
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      title="🎧 Dinle (Whisper)"
                      onClick={() => onAction(c.id, "whisper")}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: "1px solid rgba(59,130,246,0.3)",
                        background: "rgba(59,130,246,0.08)", color: "#3b82f6",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Ear size={12} />
                    </button>
                    <button
                      title="🎙️ Müdahale (Barge)"
                      onClick={() => onAction(c.id, "barge")}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: "1px solid rgba(245,158,11,0.3)",
                        background: "rgba(245,158,11,0.08)", color: "#f59e0b",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Headphones size={12} />
                    </button>
                  </div>
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
   B. KUYRUK MONİTÖRÜ
════════════════════════════════════════════════════════════════════════════ */
function QueueCard({ q, onCapacityChange, onToggle }) {
  const kapYuzde = q.max_kapasite > 0
    ? Math.min(100, Math.round((q.bekleyen_sayi / q.max_kapasite) * 100))
    : 0;
  const barColor = kapYuzde >= 80 ? "#ef4444" : kapYuzde >= 50 ? "#f59e0b" : "#10b981";
  const isPaused = !q.aktif;

  return (
    <div
      className={q.kritik ? "queue-pulse" : ""}
      style={{
        background: isPaused ? "#f8fafc" : "#fff",
        border: `1px solid ${q.kritik ? "rgba(239,68,68,0.45)" : isPaused ? "rgba(148,163,184,0.35)" : "rgba(0,0,0,0.07)"}`,
        borderTop: `2px solid ${q.kritik ? "#ef4444" : isPaused ? "#94a3b8" : "#f59e0b"}`,
        borderRadius: 14, padding: "14px 16px",
        minWidth: 220, flex: "1 1 220px",
        display: "flex", flexDirection: "column", gap: 10,
        opacity: isPaused ? 0.75 : 1,
        transition: "opacity 0.2s, border-color 0.2s",
      }}
    >
      {/* Başlık */}
      <div style={{
        fontSize: 13, fontWeight: 800, color: "#0f172a",
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {q.kuyruk_adi}
        </span>
        {isPaused && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: "#94a3b8",
            background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.3)",
            borderRadius: 4, padding: "1px 5px", letterSpacing: "0.06em", flexShrink: 0,
          }}>DURDURULDU</span>
        )}
        {!isPaused && q.kritik && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: "#ef4444",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 4, padding: "1px 5px", letterSpacing: "0.06em", flexShrink: 0,
          }}>KRİTİK</span>
        )}
      </div>

      {/* 2×2 metrik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { lbl: "Bekleyen",   val: q.bekleyen_sayi,          color: q.bekleyen_sayi > 5 ? "#ef4444" : "#0f172a" },
          { lbl: "Maks Bekl.", val: fmtSn(q.max_bekleme_sn),  color: q.max_bekleme_sn >= 45 ? "#ef4444" : "#f59e0b" },
          { lbl: "Ort Bekl.",  val: fmtSn(q.ort_bekleme_sn),  color: "#475569" },
          { lbl: "Kapasite",   val: `${q.bekleyen_sayi}/${q.max_kapasite}`, color: "#475569" },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{
            background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)",
            borderRadius: 8, padding: "7px 10px",
          }}>
            <div style={{
              fontSize: 15, fontWeight: 800, color,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>{val}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Doluluk çubuğu */}
      <div style={{ height: 4, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          width: `${kapYuzde}%`, height: "100%", background: isPaused ? "#94a3b8" : barColor,
          borderRadius: 3, transition: "width 0.4s ease",
        }} />
      </div>

      {/* Alt satır: kapasite stepper + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Kapasite stepper */}
        <button
          onClick={() => onCapacityChange(q.id, q.max_kapasite - 1)}
          disabled={q.max_kapasite <= 1}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.1)",
            background: q.max_kapasite <= 1 ? "#f1f5f9" : "#fff",
            color: q.max_kapasite <= 1 ? "#cbd5e1" : "#475569",
            cursor: q.max_kapasite <= 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        ><Minus size={11} /></button>

        <span style={{
          fontSize: 13, fontWeight: 800, color: "#0f172a",
          minWidth: 32, textAlign: "center", fontVariantNumeric: "tabular-nums",
        }}>{q.max_kapasite}</span>

        <button
          onClick={() => onCapacityChange(q.id, q.max_kapasite + 1)}
          disabled={q.max_kapasite >= 200}
          style={{
            width: 26, height: 26, borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.1)",
            background: q.max_kapasite >= 200 ? "#f1f5f9" : "#fff",
            color: q.max_kapasite >= 200 ? "#cbd5e1" : "#475569",
            cursor: q.max_kapasite >= 200 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        ><Plus size={11} /></button>

        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>maks</span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── TOGGLE BUTONU (Yeni) ── */}
        <button
          title={isPaused ? "Kuyruğu Aktifleştir" : "Kuyruğu Duraklat"}
          onClick={() => onToggle(q.id)}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        4,
            padding:    "4px 9px",
            borderRadius: 7,
            border:     isPaused
              ? "1px solid rgba(16,185,129,0.35)"
              : "1px solid rgba(148,163,184,0.35)",
            background: isPaused
              ? "rgba(16,185,129,0.08)"
              : "rgba(148,163,184,0.08)",
            color:      isPaused ? "#10b981" : "#64748b",
            fontSize:   10,
            fontWeight: 700,
            cursor:     "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          {isPaused
            ? <><Play    size={10} />&nbsp;Aktifleştir</>
            : <><Pause   size={10} />&nbsp;Duraklat</>}
        </button>
      </div>
    </div>
  );
}

function QueuesPanel({ queues, onCapacityChange, onToggle }) {
  return (
    <Panel title="Kuyruk Monitörü" accentColor="#f59e0b" badge={queues.length}>
      {queues.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Aktif kuyruk bulunamadı
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {queues.map((q) => (
            <QueueCard
              key={q.id}
              q={q}
              onCapacityChange={onCapacityChange}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   C. PERSONEL RADARI — Ekip odaklı filtre + durum vurgusu
════════════════════════════════════════════════════════════════════════════ */
function TeamFilterTabs({ teams, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 5, flexWrap: "wrap",
      padding: "10px 16px 8px",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      background: "#fafbff",
    }}>
      {teams.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            fontSize: 10.5, fontWeight: 700,
            padding: "4px 10px", borderRadius: 6,
            cursor: "pointer", whiteSpace: "nowrap",
            border: active === t
              ? "1.5px solid #8b5cf6"
              : "1px solid rgba(0,0,0,0.08)",
            background: active === t ? "rgba(139,92,246,0.1)" : "#ffffff",
            color: active === t ? "#8b5cf6" : "#64748b",
            transition: "all 0.12s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function StaffRow({ s, onEndBreak, onInstruction, endBreakLoading }) {
  const d        = D[s.anlik_durum] || D.offline;
  const sipC     = SIP_COLOR[s.sip_durumu] || "#94a3b8";
  const initials = (s.ad_soyad || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isLoading = endBreakLoading.has(s.id);

  return (
    <div
      className={s.mola_asimi ? "mola-alarm" : ""}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid rgba(0,0,0,0.03)",
        background: s.mola_asimi ? "rgba(254,226,226,0.55)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: d.bg, border: `1.5px solid ${d.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 800, color: d.color, flexShrink: 0,
      }}>
        {initials}
      </div>

      {/* Ad + dahili */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: "#0f172a",
            whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", maxWidth: 110,
          }}>
            {s.ad_soyad}
          </span>
          {s.mola_asimi && (
            <span style={{
              fontSize: 8, fontWeight: 800, color: "#ef4444",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 3, padding: "1px 4px",
              letterSpacing: "0.06em", flexShrink: 0,
            }}>AŞIM</span>
          )}
        </div>
        <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 500, marginTop: 1 }}>
          {[s.dahili_no && `·${s.dahili_no}`, s.unvan].filter(Boolean).join("  ")}
        </div>
      </div>

      {/* Statü badge */}
      <StatusBadge durum={s.anlik_durum} />

      {/* SIP */}
      <div title={`SIP: ${s.sip_durumu}`} style={{ flexShrink: 0 }}>
        {s.sip_durumu === "koptu"
          ? <WifiOff size={11} color="#ef4444" />
          : <Wifi    size={11} color={sipC} />}
      </div>

      {/* ── AKSİYON BUTONLARI (Yeni) ── */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {/* Mola Bitir — sadece mola aşımı varsa */}
        {s.mola_asimi && (
          <button
            title="Molayı Zorla Bitir"
            onClick={() => onEndBreak(s.id)}
            disabled={isLoading}
            style={{
              width:      26,
              height:     26,
              borderRadius: 6,
              border:     "1px solid rgba(239,68,68,0.4)",
              background: isLoading ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.1)",
              color:      "#ef4444",
              cursor:     isLoading ? "not-allowed" : "pointer",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity:    isLoading ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <StopCircle size={11} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </button>
        )}

        {/* Talimat Gönder — her personel için */}
        <button
          title="Anlık Talimat Gönder"
          onClick={() => onInstruction(s.id, s.ad_soyad)}
          style={{
            width:      26,
            height:     26,
            borderRadius: 6,
            border:     "1px solid rgba(139,92,246,0.35)",
            background: "rgba(139,92,246,0.08)",
            color:      "#8b5cf6",
            cursor:     "pointer",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send size={10} />
        </button>
      </div>
    </div>
  );
}

function StaffPanel({ staff, onEndBreak, onInstruction, endBreakLoading }) {
  const teams = ["Tümü", ...Array.from(
    new Set(staff.map((s) => s.ekip_ad).filter(Boolean))
  ).sort()];

  const [activeTeam, setActiveTeam] = useState("Tümü");

  const filtered = activeTeam === "Tümü"
    ? staff
    : staff.filter((s) => s.ekip_ad === activeTeam);

  const groups = activeTeam === "Tümü"
    ? teams.slice(1).reduce((acc, team) => {
        const members = filtered.filter((s) => s.ekip_ad === team);
        if (members.length) acc.push({ team, members });
        return acc;
      }, [
        ...(filtered.filter((s) => !s.ekip_ad).length
          ? [{ team: "—", members: filtered.filter((s) => !s.ekip_ad) }]
          : []),
      ])
    : [{ team: activeTeam, members: filtered }];

  const onlineCount = staff.filter(
    (s) => s.anlik_durum === "aktif" || s.anlik_durum === "mesgul"
  ).length;

  return (
    <Panel
      title="Personel Radarı"
      accentColor="#8b5cf6"
      badge={`${onlineCount}/${staff.length}`}
      stretch
      noPad
    >
      <TeamFilterTabs teams={teams} active={activeTeam} onChange={setActiveTeam} />

      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
            Bu ekipte personel bulunamadı
          </div>
        ) : (
          groups.map(({ team, members }) => (
            <div key={team}>
              <div style={{
                padding: "7px 16px 4px",
                fontSize: 9, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#8b5cf6",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(139,92,246,0.03)",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#8b5cf6", display: "inline-block", flexShrink: 0,
                }} />
                {team}
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>({members.length})</span>
              </div>

              {members.map((s) => (
                <StaffRow
                  key={s.id}
                  s={s}
                  onEndBreak={onEndBreak}
                  onInstruction={onInstruction}
                  endBreakLoading={endBreakLoading}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   D. ALERT TICKER
════════════════════════════════════════════════════════════════════════════ */
function AlertTicker({ staff, queues, calls, nowMs }) {
  const msgs = [];

  staff.forEach((s) => {
    if (s.mola_asimi)             msgs.push(`⏰ ${s.ad_soyad} — mola süresi aşıldı`);
    if (s.sip_durumu === "koptu") msgs.push(`📡 ${s.ad_soyad} — SIP bağlantısı kopuk`);
  });

  queues.forEach((q) => {
    if (!q.aktif)
      msgs.push(`⏸️ ${q.kuyruk_adi} — kuyruk duraklatıldı`);
    else if (q.kritik)
      msgs.push(`🚨 ${q.kuyruk_adi} — ${fmtSn(q.max_bekleme_sn)} bekleme (kritik)`);
  });

  calls.forEach((c) => {
    const elapsed = c.baslangic_zamani
      ? Math.floor((nowMs - new Date(c.baslangic_zamani)) / 1000)
      : (c.sure_sn || 0);
    if (elapsed >= 900)
      msgs.push(`📞 ${c.personel_ad || c.arayan_numara || "?"} — ${fmtDur(elapsed)} uzun görüşme`);
  });

  if (msgs.length === 0) return null;

  const ticker = msgs.join("   ·   ");
  const doubled = `${ticker}   ·   ${ticker}`;

  return (
    <div style={{
      position: "sticky", bottom: 0,
      margin: "12px -16px -16px",
      background: "linear-gradient(90deg,#7f1d1d,#991b1b,#7f1d1d)",
      overflow: "hidden", height: 34,
      display: "flex", alignItems: "center",
      borderRadius: "0 0 12px 12px",
    }}>
      <div style={{
        whiteSpace: "nowrap",
        animation: "tickerScroll 28s linear infinite",
        display: "inline-block",
        fontSize: 11, fontWeight: 600,
        color: "#fecaca", paddingLeft: "100%",
      }}>
        {doubled}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   E. TALİMAT MODAL
════════════════════════════════════════════════════════════════════════════ */
function InstructionModal({ target, text, onChange, onSend, onClose, sending }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(15,23,42,0.55)",
        zIndex:     300,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    16,
      }}
    >
      <div
        style={{
          background:   "#ffffff",
          borderRadius: 16,
          padding:      24,
          width:        420,
          maxWidth:     "100%",
          boxShadow:    "0 24px 48px rgba(15,23,42,0.28)",
        }}
      >
        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              ⚡ Anlık Talimat Gönder
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
              Alıcı: <strong>{target.adSoyad}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#f8fafc", color: "#64748b",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Mesaj alanı */}
        <textarea
          autoFocus
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Talimat mesajını yazın… (maks. 500 karakter)"
          maxLength={500}
          rows={4}
          style={{
            width:        "100%",
            resize:       "vertical",
            border:       "1.5px solid rgba(139,92,246,0.3)",
            borderRadius: 10,
            padding:      "10px 12px",
            fontSize:     13,
            color:        "#0f172a",
            fontFamily:   "inherit",
            outline:      "none",
            background:   "#fafbff",
            boxSizing:    "border-box",
            lineHeight:   1.5,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
          onBlur={(e)  => (e.target.style.borderColor = "rgba(139,92,246,0.3)")}
        />
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 3 }}>
          {text.length} / 500
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              padding:    "8px 18px", borderRadius: 9,
              border:     "1px solid rgba(0,0,0,0.1)",
              background: "#fff", color: "#475569",
              fontSize:   12, fontWeight: 600, cursor: "pointer",
            }}
          >
            İptal
          </button>
          <button
            onClick={onSend}
            disabled={!text.trim() || sending}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        6,
              padding:    "8px 18px", borderRadius: 9,
              border:     "none",
              background: !text.trim() || sending ? "#c4b5fd" : "#8b5cf6",
              color:      "#fff",
              fontSize:   12, fontWeight: 700,
              cursor:     !text.trim() || sending ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            <Send size={12} style={{ animation: sending ? "spin 1s linear infinite" : "none" }} />
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   F. KPI ÖZET ŞERİDİ  (GET /admin/operations/summary)
════════════════════════════════════════════════════════════════════════════ */
const T = ADMIN_THEME;

function SummaryStrip({ data, loading }) {
  if (loading) {
    return (
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        padding: "10px 0", marginBottom: 4,
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            flex: "1 1 120px", height: 64, borderRadius: 12,
            background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
            backgroundSize: "200% 100%", animation: "opShim 1.4s infinite",
          }} />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { kapasite, abandon, verimlilik, csat } = data;
  const abandonKritik = abandon?.kritik;

  const chips = [
    {
      label:   "Toplam Çağrı",
      value:   abandon?.bugun_toplam ?? "—",
      color:   T.busy,
    },
    {
      label:   "Aktif Görüşme",
      value:   kapasite?.aktif_cagri != null
        ? `${kapasite.aktif_cagri} / ${kapasite.max_kapasite}`
        : "—",
      sub:     kapasite?.yuzde != null ? `%${kapasite.yuzde} kapasite` : null,
      color:   T.active,
    },
    {
      label:   "Kaçan Çağrı",
      value:   abandon?.bugun_kacan ?? "—",
      sub:     abandon?.yuzde != null ? `%${abandon.yuzde} abandon` : null,
      color:   abandonKritik ? T.alarm : T.break,
    },
    {
      label:   "XP / Çağrı",
      value:   verimlilik?.xp_per_cagri != null
        ? verimlilik.xp_per_cagri.toFixed(1)
        : "—",
      sub:     verimlilik?.toplam_xp_bugun != null
        ? `${verimlilik.toplam_xp_bugun} XP bugün`
        : null,
      color:   T.purple,
    },
    {
      label:   "CSAT Ortalaması",
      value:   csat?.bugun_ortalama ? csat.bugun_ortalama.toFixed(1) : "—",
      sub:     "5 üzerinden",
      color:   (csat?.bugun_ortalama ?? 0) >= 4 ? T.active
             : (csat?.bugun_ortalama ?? 0) >= 3 ? T.break
             : T.alarm,
    },
  ];

  return (
    <>
      <style>{`
        @keyframes opShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        {chips.map(({ label, value, sub, color }) => (
          <div key={label} style={{
            flex: "1 1 120px", minWidth: 110,
            background: "#ffffff",
            border: `1px solid ${color}20`,
            borderTop: `3px solid ${color}`,
            borderRadius: 12,
            padding: "10px 14px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              fontSize: 18, fontWeight: 800, color,
              lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}>
              {value}
            </div>
            {sub && (
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{sub}</div>
            )}
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.muted,
              letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   G. EKİP KARŞILAŞTIRMA PANELİ  (GET /admin/operations/team-comparison)
════════════════════════════════════════════════════════════════════════════ */
function TeamCompPanel({ teams }) {
  if (!teams?.length) return null;

  const maxCagri = Math.max(...teams.map(t => t.bugun_cagri), 1);

  return (
    <Panel title="Ekip Karşılaştırması — Bugün" accentColor={T.busy} badge={`${teams.length} ekip`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.map((team) => {
          const cevapOrani = team.bugun_cagri > 0
            ? Math.round((team.bugun_cevaplanan / team.bugun_cagri) * 100)
            : 0;
          const barPct = Math.round((team.bugun_cagri / maxCagri) * 100);

          return (
            <div key={team.ekip_id} style={{
              background: "#f8fafc",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 10, padding: "12px 16px",
            }}>
              {/* Ekip başlığı */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{team.ekip_ad}</span>
                  {team.supervisor_ad && (
                    <span style={{ fontSize: 10, color: T.muted, marginLeft: 8 }}>
                      Süpervizör: {team.supervisor_ad}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    color: cevapOrani >= 80 ? T.active : cevapOrani >= 60 ? T.break : T.alarm,
                    background: cevapOrani >= 80 ? `${T.active}12` : cevapOrani >= 60 ? `${T.break}12` : `${T.alarm}12`,
                    border: `1px solid ${cevapOrani >= 80 ? T.active : cevapOrani >= 60 ? T.break : T.alarm}25`,
                    padding: "2px 8px", borderRadius: 99,
                  }}>
                    %{cevapOrani} cevap
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: T.muted,
                    background: "rgba(0,0,0,0.04)", padding: "2px 7px", borderRadius: 99,
                  }}>
                    {team.personel_sayisi} personel
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div style={{
                height: 6, background: "rgba(0,0,0,0.06)",
                borderRadius: 999, overflow: "hidden", marginBottom: 8,
              }}>
                <div style={{
                  height: "100%", width: `${barPct}%`,
                  background: `linear-gradient(90deg, ${T.busy}, ${T.purple})`,
                  borderRadius: 999, transition: "width 0.6s ease",
                }} />
              </div>

              {/* Metrik chiplerI */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { label: "Toplam",     value: team.bugun_cagri,      color: T.busy   },
                  { label: "Cevaplanan", value: team.bugun_cevaplanan,  color: T.active },
                  { label: "Kaçan",      value: team.bugun_kacan,       color: T.alarm  },
                  { label: "CSAT",       value: team.ortalama_csat ? team.ortalama_csat.toFixed(1) : "—", color: T.break },
                  { label: "XP",         value: team.toplam_xp?.toLocaleString("tr-TR"), color: T.purple },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {value ?? "—"}
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: T.muted,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   ANA SAYFA
════════════════════════════════════════════════════════════════════════════ */
export default function Operations() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const [calls,         setCalls]         = useState([]);
  const [queues,        setQueues]        = useState([]);
  const [staff,         setStaff]         = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [summaryLoading,setSummaryLoading]= useState(true);
  const [teamComp,      setTeamComp]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [nowMs,         setNowMs]         = useState(Date.now());
  const [clockStr,      setClockStr]      = useState(nowHMS());
  const [toast,         setToast]         = useState(null);

  /* Talimat modal state */
  const [instrModal,   setInstrModal]   = useState(null);   // { userId, adSoyad }
  const [instrText,    setInstrText]    = useState("");
  const [instrSending, setInstrSending] = useState(false);

  /* End-break loading set (hangi user_id işleniyorsa) */
  const [endBreakLoading, setEndBreakLoading] = useState(new Set());

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  /* ── Veri çekimi ──────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const results = await Promise.allSettled([
      warRoomApi.getActiveCalls(),
      warRoomApi.getQueues(),
      warRoomApi.getStaff(),
      operationsApi.getSummary(),
      operationsApi.getTeamComparison(),
    ]);
    const get = (i) =>
      results[i]?.status === "fulfilled" ? results[i].value.data : null;

    if (get(0) !== null) setCalls(get(0));
    if (get(1) !== null) setQueues(get(1));
    if (get(2) !== null) setStaff(get(2));
    if (get(3) !== null) setSummary(get(3));
    if (get(4) !== null) setTeamComp(Array.isArray(get(4)) ? get(4) : []);
    setSummaryLoading(false);
    setLoading(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  /* ── 1 sn tick ──────────────────────────────────────────────────────── */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNowMs(Date.now());
      setClockStr(nowHMS());
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── Toast ──────────────────────────────────────────────────────────── */
  const showToast = (kind, msg) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Whisper / Barge ────────────────────────────────────────────────── */
  const handleCallAction = async (callId, action) => {
    try {
      const { data } = await warRoomApi.callAction(callId, { action });
      showToast("ok", data.message);
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Aksiyon başarısız");
    }
  };

  /* ── Kapasite güncelle (optimistik) ─────────────────────────────────── */
  const handleCapacityChange = async (queueId, newCap) => {
    if (newCap < 1 || newCap > 200) return;
    setQueues((prev) =>
      prev.map((q) => q.id === queueId ? { ...q, max_kapasite: newCap } : q)
    );
    try {
      await warRoomApi.updateCapacity(queueId, newCap);
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Kapasite güncellenemedi");
      fetchAll();
    }
  };

  /* ── Kuyruk toggle (optimistik) ─────────────────────────────────────── */
  const handleToggleQueue = async (queueId) => {
    const prev = queues.find((q) => q.id === queueId);
    if (!prev) return;

    /* Optimistik: aktif durumunu tersine çevir */
    setQueues((qs) =>
      qs.map((q) => q.id === queueId ? { ...q, aktif: !q.aktif } : q)
    );

    try {
      const { data } = await warRoomApi.toggleQueue(queueId);
      showToast(
        "ok",
        `${data.kuyruk_adi} — ${data.aktif ? "✅ Aktifleştirildi" : "⏸️ Duraklatıldı"}`
      );
    } catch (err) {
      /* Rollback */
      setQueues((qs) =>
        qs.map((q) => q.id === queueId ? { ...q, aktif: prev.aktif } : q)
      );
      showToast("err", err?.response?.data?.detail || "Kuyruk durumu değiştirilemedi");
    }
  };

  /* ── Mola zorla bitir ────────────────────────────────────────────────── */
  const handleEndBreak = async (userId) => {
    setEndBreakLoading((s) => new Set([...s, userId]));

    /* Optimistik */
    setStaff((prev) =>
      prev.map((s) =>
        s.id === userId ? { ...s, mola_asimi: false, anlik_durum: "aktif" } : s
      )
    );

    try {
      const { data } = await warRoomApi.endBreak(userId);
      showToast("ok", `Mola sonlandırıldı (${data.kapanan_mola_sayisi} kayıt)`);
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Mola sonlandırılamadı");
      fetchAll(); /* rollback */
    } finally {
      setEndBreakLoading((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  /* ── Talimat gönder ──────────────────────────────────────────────────── */
  const openInstruction = (userId, adSoyad) => {
    setInstrModal({ userId, adSoyad });
    setInstrText("");
  };

  const closeInstruction = () => {
    if (instrSending) return;
    setInstrModal(null);
    setInstrText("");
  };

  const handleSubmitInstruction = async () => {
    if (!instrText.trim() || !instrModal) return;
    setInstrSending(true);
    try {
      await warRoomApi.sendInstruction(instrModal.userId, instrText.trim());
      showToast("ok", `Talimat gönderildi → ${instrModal.adSoyad}`);
      setInstrModal(null);
      setInstrText("");
    } catch (err) {
      showToast("err", err?.response?.data?.detail || "Talimat gönderilemedi");
    } finally {
      setInstrSending(false);
    }
  };

  /* ── Özet sayılar ───────────────────────────────────────────────────── */
  const totalQueued = queues.reduce((s, q) => s + (q.bekleyen_sayi || 0), 0);
  const onlineCount = staff.filter(
    (s) => s.anlik_durum === "aktif" || s.anlik_durum === "mesgul"
  ).length;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 0 }}>

      {/* ── BAŞLIK ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 14, borderBottom: "1px solid rgba(0,0,0,0.06)",
        gap: 12, flexWrap: "wrap", marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.28) 100%)",
            border: "1px solid rgba(239,68,68,0.32)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(239,68,68,0.18)",
            flexShrink: 0,
          }}>
            <Radio
              size={20} color="#ef4444"
              strokeWidth={2.4}
              style={{ animation: "liveGlow 2s ease-in-out infinite" }}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{
                margin: 0, fontSize: 20, fontWeight: 800,
                color: "#0f172a", letterSpacing: "-0.02em",
              }}>
                Canlı Operasyon
              </h1>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 99,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.28)",
                fontSize: 9.5, fontWeight: 800,
                color: "#10b981", letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#10b981",
                  animation: "livePulse 1.5s ease-in-out infinite",
                }} />
                Canlı
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              {loading ? "Yükleniyor…" : (
                `${calls.length} aktif görüşme · ${totalQueued} kuyrukta bekleyen · ${onlineCount} çevrimiçi personel`
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 12px",
            background: "linear-gradient(135deg, #fff 0%, rgba(16,185,129,0.06) 100%)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 10,
            boxShadow: "0 1px 4px rgba(16,185,129,0.08)",
          }}>
            <Activity size={12} color="#10b981" strokeWidth={2.6} />
            <span style={{
              fontSize: 12, fontWeight: 800, color: "#10b981",
              letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
            }}>
              {clockStr}
            </span>
          </div>

          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 10, padding: "8px 16px",
              fontSize: 12, fontWeight: 700, color: "#0f172a",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                e.currentTarget.style.color = "#ef4444";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
              e.currentTarget.style.color = "#0f172a";
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
            />
            Yenile
          </button>
        </div>
      </div>

      {/* ── KPI ŞERİDİ ──────────────────────────────────────────────────── */}
      <SummaryStrip data={summary} loading={summaryLoading} />

      {/* ── ANA GRID ────────────────────────────────────────────────────── */}
      <div
        className="wr-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gridTemplateRows: "auto 1fr",
          gap: 14,
        }}
      >
        <div>
          <ActiveCallsPanel
            calls={calls}
            nowMs={nowMs}
            isAdmin={isAdmin}
            onAction={handleCallAction}
          />
        </div>

        <div style={{ gridRow: "1 / 3", gridColumn: 2 }}>
          <StaffPanel
            staff={staff}
            onEndBreak={handleEndBreak}
            onInstruction={openInstruction}
            endBreakLoading={endBreakLoading}
          />
        </div>

        <div>
          <QueuesPanel
            queues={queues}
            onCapacityChange={handleCapacityChange}
            onToggle={handleToggleQueue}
          />
        </div>
      </div>

      {/* ── EKİP KARŞILAŞTIRMA ───────────────────────────────────────────── */}
      {teamComp.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <TeamCompPanel teams={teamComp} />
        </div>
      )}

      {/* ── ALERT TICKER ────────────────────────────────────────────────── */}
      <AlertTicker staff={staff} queues={queues} calls={calls} nowMs={nowMs} />

      {/* ── TOAST ───────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 52, right: 24, zIndex: 200,
          padding: "12px 16px", borderRadius: 10,
          background: "#ffffff",
          border: `1px solid ${toast.kind === "ok" ? "#10b981" : "#ef4444"}40`,
          borderLeft: `3px solid ${toast.kind === "ok" ? "#10b981" : "#ef4444"}`,
          boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
          fontSize: 12.5, fontWeight: 600,
          color: toast.kind === "ok" ? "#10b981" : "#ef4444",
          display: "flex", alignItems: "center", gap: 8, maxWidth: 360,
        }}>
          {toast.kind === "ok"
            ? <CheckCircle2 size={14} />
            : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── TALİMAT MODAL ──────────────────────────────────────────────── */}
      {instrModal && (
        <InstructionModal
          target={instrModal}
          text={instrText}
          onChange={setInstrText}
          onSend={handleSubmitInstruction}
          onClose={closeInstruction}
          sending={instrSending}
        />
      )}

      {/* ── KEYFRAMES + CSS ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(0.8); }
        }
        @keyframes liveGlow {
          0%, 100% { opacity: 1; }
          50%       { opacity: .6; }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes queuePulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.22), 0 2px 8px rgba(0,0,0,0.04); }
        }
        @keyframes molaAlarm {
          0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
          50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0.28), 0 1px 4px rgba(0,0,0,0.03); }
        }
        .queue-pulse { animation: queuePulse 1.5s ease-in-out infinite; }
        .mola-alarm  { animation: molaAlarm  1.8s ease-in-out infinite; }
        @media (max-width: 1100px) {
          .wr-main-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
          }
          .wr-main-grid > div[style*="grid-row"] { grid-row: auto !important; }
          .wr-main-grid > div[style*="grid-column"] { grid-column: auto !important; }
        }
      `}</style>
    </div>
  );
}
