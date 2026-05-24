import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [incomingAlert,  setIncomingAlert]  = useState(null);
  const [incomingElapsed, setIncomingElapsed] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [devCallbacks, setDevCallbacks] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  // ── Softphone (sağdan açılır panel) ──
  const [softphoneOpen,    setSoftphoneOpen]    = useState(false);
  const [softphoneNumber,  setSoftphoneNumber]  = useState("");
  // Aktif çağrı (cevaplanmış / dış arama yapılmış). null = boşta.
  const [softphoneCall,    setSoftphoneCall]    = useState(null);
  const [softphoneMuted,   setSoftphoneMuted]   = useState(false);
  const [softphoneOnHold,  setSoftphoneOnHold]  = useState(false);

  const openSoftphone  = () => setSoftphoneOpen(true);
  const closeSoftphone = () => setSoftphoneOpen(false);
  const toggleSoftphone= () => setSoftphoneOpen((o) => !o);

  // Numarayı çevir → çağrı başlat (mock)
  const dial = (number) => {
    const num = (number || softphoneNumber).trim();
    if (!num) return;
    setSoftphoneCall({
      number: num,
      name: null,
      direction: "outbound",
      startedAt: Date.now(),
    });
    setSoftphoneMuted(false);
    setSoftphoneOnHold(false);
  };

  const hangupSoftphone = () => {
    setSoftphoneCall(null);
    setSoftphoneMuted(false);
    setSoftphoneOnHold(false);
    setSoftphoneNumber("");
  };

  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    if (loading || !token || !user) {
      setRecentCalls([]);
      return;
    }

    let cancelled = false;

    import("../services/api")
      .then(({ cdrApi }) => cdrApi.getRecent(10))
      .then((res) => {
        if (cancelled) return;
        const calls = (res.data || []).map((c, i) => ({
          id: c.uniqueid || i,
          number: c.src,
          name: "Bilinmeyen",
          at: new Date(c.calldate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          dir: "in",
        }));
        setRecentCalls(calls);
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, token, user]);

  // ── timer while ringing ──
  useEffect(() => {
    if (!incomingAlert) return;
    const id = setInterval(() => setIncomingElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!incomingAlert]);

  // ── auto-reject after 30 s ──
  useEffect(() => {
    if (incomingElapsed >= 30 && incomingAlert) dismissIncoming();
  }, [incomingElapsed]); // eslint-disable-line

  // ── WebSocket Listener (Gerçek Zamanlı Çağrılar) ──
  useEffect(() => {
    if (loading || !token || !user) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : `${window.location.hostname}:5000`;
    const wsUrl = `${wsProtocol}://${host}/ws/queue?token=${encodeURIComponent(token)}`;

    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("WebSocket bağlantısı başarılı.");
        setWsConnected(true);
        // İsterseniz bağlandıktan sonra kimlik doğrulama mesajı gönderebilirsiniz:
        // wsRef.current.send(JSON.stringify({ type: "auth", token: token, extension: user.extension }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Gelen her şeyi konsola yazdıralım ki ne olduğunu görelim
          console.log("📡 WEBSOCKET MESAJI GELDİ:", data);

          const eventType = data.type || data.event;

          if (eventType === "AgentConnect") {
            console.log("✅ AgentConnect YAKALANDI!");
            console.log("Beklenen Kullanıcı:", user.extension, "| Asterisk'ten Gelen:", data.extension);

            // Dahili no kontrolünü şimdilik "içeriyorsa" şeklinde esnetelim (örn: "PJSIP/100" içinde "100" var mı?)
            if (data.extension && user.extension && !data.extension.includes(user.extension)) {
                console.log("❌ Dahili eşleşmedi, yönlendirme iptal.");
                return;
            }

            setPendingAnswer({
               number: data.callerid || data.callerId || "Gizli Numara",
               name: data.callerName || "Bilinmeyen",
               ivr: data.queueName || "Kuyruk",
               id: data.uniqueid,
               elapsed: 0,
               rawPayload: data,
            });
            
            console.log("🚀 Yönlendirme tetikleniyor...");
            navigate("/active-calls"); // veya sayfa adın neyse
          }

          if (eventType === "Hangup") {
            // Çağrı kapandığında alert'i temizle
            setIncomingAlert(null);
          }
        } catch (err) {
          console.error("WS mesaj parse hatası:", err);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket bağlantısı koptu.");
        setWsConnected(false);
      };

      wsRef.current.onerror = (err) => {
        console.error("WebSocket hatası:", err);
      };

    } catch (err) {
      console.error("WS başlatma hatası:", err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loading, token, user, navigate]);

  const signalAnswer = () => {
    if (!incomingAlert) return;
    setPendingAnswer({ ...incomingAlert, elapsed: incomingElapsed });
    setIncomingAlert(null);
    setIncomingElapsed(0);
  };

  const dismissIncoming = () => {
    setIncomingAlert(null);
    setIncomingElapsed(0);
  };

  // ActiveCalls calls this once to consume and clear pendingAnswer
  const consumeAnswer = () => {
    const data = pendingAnswer;
    setPendingAnswer(null);
    return data;
  };

  const registerDevCallbacks = (cbs) => setDevCallbacks(cbs);
  const unregisterDevCallbacks = () => setDevCallbacks(null);

  return (
    <CallContext.Provider
      value={{
        incomingAlert,
        incomingElapsed,
        pendingAnswer,
        devCallbacks,
        wsConnected,
        signalAnswer,
        dismissIncoming,
        consumeAnswer,
        registerDevCallbacks,
        unregisterDevCallbacks,

        // softphone
        softphoneOpen,
        softphoneNumber,
        softphoneCall,
        softphoneMuted,
        softphoneOnHold,
        openSoftphone,
        closeSoftphone,
        toggleSoftphone,
        setSoftphoneNumber,
        setSoftphoneMuted,
        setSoftphoneOnHold,
        dial,
        hangupSoftphone,
        recentCalls,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
