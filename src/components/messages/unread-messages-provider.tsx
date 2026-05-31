"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const POLL_INTERVAL_MS = 60_000;

type UnreadMessagesContextValue = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(
  null,
);

export function UnreadMessagesProvider({
  children,
  initialCount,
  enabled,
}: {
  children: React.ReactNode;
  initialCount: number;
  enabled: boolean;
}) {
  const [unreadCount, setUnreadCountState] = useState(initialCount);
  const clientUpdatedAtRef = useRef(0);

  const setUnreadCount = useCallback((count: number) => {
    clientUpdatedAtRef.current = Date.now();
    setUnreadCountState(count);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/messages/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setUnreadCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      // ignore network errors
    }
  }, [enabled, setUnreadCount]);

  useEffect(() => {
    if (Date.now() - clientUpdatedAtRef.current < 3000) return;
    setUnreadCountState(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!enabled) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshUnreadCount]);

  return (
    <UnreadMessagesContext.Provider
      value={{ unreadCount, setUnreadCount, refreshUnreadCount }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages(): UnreadMessagesContextValue {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      setUnreadCount: () => {},
      refreshUnreadCount: async () => {},
    };
  }
  return ctx;
}
