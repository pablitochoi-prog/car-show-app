/**
 * Lightweight structured timing logs for Vercel (JSON on stdout).
 * Safe fields only — no PII, payment data, or full vehicle entry codes.
 */

export type PerfTimingMeta = Record<
  string,
  string | number | boolean | null | undefined
>;

export function perfTimingStart(): number {
  return performance.now();
}

export function perfTimingElapsed(start: number): number {
  return Math.round(performance.now() - start);
}

function compactMeta(meta: PerfTimingMeta): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

/** Emit one JSON line per completed operation (Vercel log friendly). */
export function logPerfTiming(args: {
  name: string;
  durationMs: number;
  success: boolean;
} & PerfTimingMeta): void {
  const { name, durationMs, success, ...meta } = args;
  console.info(
    JSON.stringify({
      perf: true,
      name,
      durationMs,
      success,
      ...compactMeta(meta),
    }),
  );
}

/** Prefix only (e.g. AXY from AXY-004) — never log full entry codes. */
export function vehicleEntryCodePrefix(rawCode: string): string | undefined {
  const trimmed = rawCode.trim();
  if (!trimmed) return undefined;
  const prefix = trimmed.split("-")[0]?.trim();
  return prefix || undefined;
}

/** Wrap an API route handler; logs statusCode from the Response. */
export async function withPerfTimingResponse(
  name: string,
  meta: PerfTimingMeta | (() => PerfTimingMeta),
  fn: () => Promise<Response>,
): Promise<Response> {
  const start = perfTimingStart();
  const resolveMeta = () =>
    typeof meta === "function" ? meta() : meta;
  try {
    const res = await fn();
    logPerfTiming({
      name,
      durationMs: perfTimingElapsed(start),
      success: res.ok,
      statusCode: res.status,
      ...resolveMeta(),
    });
    return res;
  } catch (err) {
    logPerfTiming({
      name,
      durationMs: perfTimingElapsed(start),
      success: false,
      statusCode: 500,
      ...resolveMeta(),
    });
    throw err;
  }
}

/** Wrap an async function; caller supplies outcome metadata after completion. */
export async function withPerfTiming<T>(
  name: string,
  meta: PerfTimingMeta,
  fn: () => Promise<T>,
  outcome: (result: T) => PerfTimingMeta & { success: boolean },
): Promise<T> {
  const start = perfTimingStart();
  try {
    const result = await fn();
    const extra = outcome(result);
    const { success, ...rest } = extra;
    logPerfTiming({
      name,
      durationMs: perfTimingElapsed(start),
      success,
      ...meta,
      ...rest,
    });
    return result;
  } catch (err) {
    logPerfTiming({
      name,
      durationMs: perfTimingElapsed(start),
      success: false,
      ...meta,
    });
    throw err;
  }
}
