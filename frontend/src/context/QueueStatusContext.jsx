import { createContext, useContext, useEffect, useMemo, useState } from "react";

const QueueStatusContext = createContext(undefined);

const DEFAULT_QUEUE = {
  waiting: 0,
  longestWait: 0,
  avgWait: 0,
  estimatedPickup: 0,
  queuedNumbers: [],
};

export function QueueStatusProvider({ children }) {
  const [queue, setQueue] = useState(DEFAULT_QUEUE);
  const [connectionState, setConnectionState] = useState("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const ticker = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setConnectionState("disconnected");
      return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : `${window.location.hostname}:8000`;
    const wsUrl = `${wsProtocol}://${host}/ws/queue?token=${encodeURIComponent(token)}`;

    let isUnmounted = false;
    let socket = null;
    let reconnectTimer = null;

    const connect = () => {
      if (isUnmounted) return;

      setConnectionState((prev) => (prev === "live" ? "connecting" : prev));
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (isUnmounted) return;
        setConnectionState("live");
      };

      socket.onmessage = (event) => {
        if (isUnmounted) return;

        try {
          const payload = JSON.parse(event.data);
          if (payload.type !== "queue_update") return;

          const waiting = Number(payload.waitingCalls || 0);
          const longestWait = Number(payload.longestWaitSeconds || 0);
          const avgWait = Number(payload.avgWaitSeconds || 0);
          const estimatedPickup = Number(payload.estimatedPickupSeconds || 0);

          setQueue({
            waiting,
            longestWait,
            avgWait,
            estimatedPickup,
            queuedNumbers: Array.isArray(payload.queuedNumbers) ? payload.queuedNumbers : [],
          });

          setLastUpdatedAt(payload.updatedAt || new Date().toISOString());
          setConnectionState("live");
        } catch {
          // Ignore malformed messages.
        }
      };

      socket.onerror = () => {
        if (isUnmounted) return;
        setConnectionState("disconnected");
      };

      socket.onclose = () => {
        if (isUnmounted) return;
        setConnectionState("disconnected");
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState < 2) socket.close();
    };
  }, []);

  const value = useMemo(
    () => ({
      queue,
      connectionState,
      lastUpdatedAt,
      clock,
    }),
    [queue, connectionState, lastUpdatedAt, clock]
  );

  return <QueueStatusContext.Provider value={value}>{children}</QueueStatusContext.Provider>;
}

export function useQueueStatus() {
  const context = useContext(QueueStatusContext);
  if (!context) {
    throw new Error("useQueueStatus must be used within QueueStatusProvider");
  }

  return context;
}