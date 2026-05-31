"use client";

import { SWRConfig } from "swr";
import { clientJsonFetcher } from "@/lib/client-fetcher";
import { EVENT_SETUP_STALE_MS } from "@/lib/event-api-cache-keys";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: clientJsonFetcher,
        dedupingInterval: EVENT_SETUP_STALE_MS,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
