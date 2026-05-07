import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const CallContext = createContext(null);

const TEST_SCENARIOS = [
  { number: "0532 411 22 18", name: "Ahmet Yılmaz",  ivr: "1 > Muhasebe", vip: true  },
  { number: "0541 233 88 44", name: "Fatma Şahin",   ivr: "2 > Satış",    vip: false },
  { number: "0505 671 34 12", name: "Kemal Erdoğan", ivr: "1 > Destek",   vip: false },
  { number: "0530 988 11 22", name: "Ayşe Kılıç",    ivr: "3 > İade",     vip: true  },
];

export function CallProvider({ children }) {
  const { user, token, loading } = useAuth();
  const [incomingAlert,  setIncomingAlert]  = useState(null);
  const [incomingElapsed, setIncomingElapsed] = useState(0);
  // set by signalAnswer(); consumed (once) by ActiveCalls on mount/change
  const [pendingAnswer, setPendingAnswer] = useState(null);
  // dev tool callbacks registered by active pages
  const [devCallbacks, setDevCallbacks] = useState(null);

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

  const simulateIncomingCall = () => {
    if (incomingAlert) return;           // already ringing
    const s = TEST_SCENARIOS[Math.floor(Math.random() * TEST_SCENARIOS.length)];
    setIncomingElapsed(0);
    setPendingAnswer(null);
    setIncomingAlert(s);
  };

  // User answered from Layout (any page except /active-calls)
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
        simulateIncomingCall,
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
