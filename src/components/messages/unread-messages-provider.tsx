"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/** Minimum time between unread-count API calls (poll, focus, visibility). */
const MIN_REFRESH_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 30_000;

type RefreshOptions = { force?: boolean };

type UnreadMessagesContextValue = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: (options?: RefreshOptions) => Promise<void>;
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
  const lastRefreshAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const setUnreadCount = useCallback((count: number) => {
    clientUpdatedAtRef.current = Date.now();
    setUnreadCountState(count);
  }, []);

  const refreshUnreadCount = useCallback(
    async (options?: RefreshOptions) => {
      if (!enabled) return;

      const now = Date.now();
      if (
        !options?.force &&
        now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS
      ) {
        return;
      }
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      try {
        const res = await fetch("/api/messages/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        setUnreadCount(typeof data.count === "number" ? data.count : 0);
        lastRefreshAtRef.current = Date.now();
      } catch {
        // ignore network errors
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, setUnreadCount],
  );

  const refreshRef = useRef(refreshUnreadCount);
  refreshRef.current = refreshUnreadCount;

  useEffect(() => {
    if (Date.now() - clientUpdatedAtRef.current < 3000) return;
    setUnreadCountState(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!enabled) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshRef.current();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [enabled]);

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
