"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SESSION_ACTIVITY_CHANNEL,
  SESSION_ACTIVITY_STORAGE_KEY,
} from "@/lib/session-idle-config";
import { getIdleTimeoutMs, getIdleWarningMs } from "@/lib/session-idle";
import { SessionIdleWarningModal } from "@/components/session/session-idle-warning-modal";

type SessionActivityState = {
  lastActivityAt: number;
  expiresAt: number;
  msUntilExpiry: number;
  idleMs: number;
};

type ActivityMessage = {
  type: "activity";
  lastActivityAt: number;
};

const POLL_MS = 60_000;
const HEARTBEAT_DEBOUNCE_MS = 30_000;
const MIN_HEARTBEAT_INTERVAL_MS = 60_000;

const SessionIdleContext = createContext<{ touchActivity: () => void } | null>(
  null,
);

export function useSessionIdleTouch() {
  return useContext(SessionIdleContext);
}

/** UX-only idle tracking — server cookie is authoritative for enforcement. */
export function SessionIdleProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(5);

  const activityRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(0);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const performIdleLogout = useCallback(async () => {
    clearExpiryTimer();
    setWarningOpen(false);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // redirect anyway
    }
    window.location.assign("/login?reason=idle");
  }, [clearExpiryTimer]);

  const scheduleExpiryTimer = useCallback(
    (msUntilExpiry: number) => {
      clearExpiryTimer();
      if (msUntilExpiry <= 0) {
        void performIdleLogout();
        return;
      }
      expiryTimerRef.current = setTimeout(() => {
        void performIdleLogout();
      }, msUntilExpiry + 250);
    },
    [clearExpiryTimer, performIdleLogout],
  );

  const applyActivity = useCallback(
    (lastActivityAt: number, msUntilExpiry?: number) => {
      activityRef.current = lastActivityAt;
      try {
        localStorage.setItem(
          SESSION_ACTIVITY_STORAGE_KEY,
          String(lastActivityAt),
        );
      } catch {
        // ignore storage errors
      }

      const idleMs = Date.now() - lastActivityAt;
      const warningMs = getIdleWarningMs();
      const timeoutMs = getIdleTimeoutMs();
      const remaining =
        msUntilExpiry ?? Math.max(0, timeoutMs - idleMs);

      scheduleExpiryTimer(remaining);

      if (idleMs >= timeoutMs) {
        setWarningOpen(false);
        return;
      }

      if (idleMs >= warningMs) {
        setMinutesRemaining(
          Math.max(1, Math.ceil((timeoutMs - idleMs) / 60_000)),
        );
        setWarningOpen(true);
      } else {
        setWarningOpen(false);
      }
    },
    [scheduleExpiryTimer],
  );

  const broadcastActivity = useCallback((lastActivityAt: number) => {
    channelRef.current?.postMessage({
      type: "activity",
      lastActivityAt,
    } satisfies ActivityMessage);
  }, []);

  const syncFromServer = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/auth/session-activity", {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        const data = (await res.json()) as { sessionExpired?: boolean };
        if (data.sessionExpired) {
          await performIdleLogout();
        }
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as SessionActivityState & { ok?: boolean };
      if (data.lastActivityAt) {
        applyActivity(data.lastActivityAt, data.msUntilExpiry);
      }
      if (data.msUntilExpiry <= 0) {
        await performIdleLogout();
      }
    } catch {
      // network blip — rely on next poll
    }
  }, [applyActivity, enabled, performIdleLogout]);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastHeartbeatRef.current < MIN_HEARTBEAT_INTERVAL_MS) {
      applyActivity(now);
      broadcastActivity(now);
      return;
    }
    lastHeartbeatRef.current = now;
    try {
      const res = await fetch("/api/auth/session-activity", {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        await performIdleLogout();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as SessionActivityState;
      applyActivity(data.lastActivityAt ?? now, data.msUntilExpiry);
      broadcastActivity(data.lastActivityAt ?? now);
    } catch {
      applyActivity(now);
      broadcastActivity(now);
    }
  }, [applyActivity, broadcastActivity, enabled, performIdleLogout]);

  const scheduleHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setTimeout(() => {
      void sendHeartbeat();
    }, HEARTBEAT_DEBOUNCE_MS);
  }, [sendHeartbeat]);

  const touchActivity = useCallback(() => {
    if (!enabled) return;
    applyActivity(Date.now());
    scheduleHeartbeat();
  }, [applyActivity, enabled, scheduleHeartbeat]);

  const handleStayLoggedIn = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/session-activity", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        await performIdleLogout();
        return;
      }
      const data = (await res.json()) as SessionActivityState;
      const ts = data.lastActivityAt ?? Date.now();
      applyActivity(ts, data.msUntilExpiry);
      broadcastActivity(ts);
      setWarningOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleLogOut = async () => {
    setBusy(true);
    await performIdleLogout();
  };

  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          activityRef.current = parsed;
        }
      }
    } catch {
      // ignore
    }

    void syncFromServer();

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SESSION_ACTIVITY_CHANNEL);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<ActivityMessage>) => {
        if (event.data?.type === "activity" && event.data.lastActivityAt) {
          applyActivity(event.data.lastActivityAt);
        }
      };
    }

    const onActivity = () => touchActivity();
    const events: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "input",
      "touchstart",
    ];
    for (const name of events) {
      window.addEventListener(name, onActivity, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncFromServer();
    }, POLL_MS);

    return () => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearExpiryTimer();
      channelRef.current?.close();
      for (const name of events) {
        window.removeEventListener(name, onActivity);
      }
    };
  }, [applyActivity, clearExpiryTimer, enabled, syncFromServer, touchActivity]);

  return (
    <SessionIdleContext.Provider value={{ touchActivity }}>
      {children}
      {enabled ? (
        <SessionIdleWarningModal
          open={warningOpen}
          minutesRemaining={minutesRemaining}
          busy={busy}
          onStayLoggedIn={() => void handleStayLoggedIn()}
          onLogOut={() => void handleLogOut()}
        />
      ) : null}
    </SessionIdleContext.Provider>
  );
}
