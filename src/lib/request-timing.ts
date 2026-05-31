/** Dev-only request timing — set REQUEST_TIMING=1 in .env.local to enable. */
export function isRequestTimingEnabled(): boolean {
  return process.env.REQUEST_TIMING === "1";
}

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isRequestTimingEnabled()) return fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    console.info(`[request-timing] ${label} ${ms}ms`);
  }
}
