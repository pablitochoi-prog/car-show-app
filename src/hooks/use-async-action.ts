"use client";

import { useCallback, useState } from "react";

/**
 * Wraps an async handler with a pending flag so buttons can disable and show spinners.
 * Ignores duplicate clicks while a request is in flight.
 */
export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
) {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: T) => {
      if (pending) return;
      setPending(true);
      try {
        await action(...args);
      } finally {
        setPending(false);
      }
    },
    [action, pending],
  );

  return { pending, run };
}
