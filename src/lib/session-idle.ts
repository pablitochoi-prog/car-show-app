import {
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_WARNING_MINUTES,
} from "@/lib/session-idle-config";

const MS_PER_MINUTE = 60 * 1000;

/** Dev override via NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES (e.g. 2). */
export function getIdleTimeoutMinutes(): number {
  const raw = process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return SESSION_IDLE_TIMEOUT_MINUTES;
}

/** Warning threshold scales with dev override while keeping a sensible lead time. */
export function getIdleWarningMinutes(): number {
  const timeout = getIdleTimeoutMinutes();
  if (timeout === SESSION_IDLE_TIMEOUT_MINUTES) {
    return SESSION_WARNING_MINUTES;
  }
  const prodLead = SESSION_IDLE_TIMEOUT_MINUTES - SESSION_WARNING_MINUTES;
  const lead = Math.min(prodLead, Math.max(1, timeout - 1));
  return Math.max(0, timeout - lead);
}

export function getIdleTimeoutMs(): number {
  return getIdleTimeoutMinutes() * MS_PER_MINUTE;
}

export function getIdleWarningMs(): number {
  return getIdleWarningMinutes() * MS_PER_MINUTE;
}

export function getIdleWarningLeadMs(): number {
  return getIdleTimeoutMs() - getIdleWarningMs();
}

export function isIdleExpired(lastActivityAtMs: number, nowMs = Date.now()): boolean {
  if (!Number.isFinite(lastActivityAtMs) || lastActivityAtMs <= 0) {
    return false;
  }
  return nowMs - lastActivityAtMs >= getIdleTimeoutMs();
}

export function shouldShowIdleWarning(
  lastActivityAtMs: number,
  nowMs = Date.now(),
): boolean {
  if (!Number.isFinite(lastActivityAtMs) || lastActivityAtMs <= 0) {
    return false;
  }
  const idleMs = nowMs - lastActivityAtMs;
  return idleMs >= getIdleWarningMs() && idleMs < getIdleTimeoutMs();
}

export function msUntilIdleExpiry(lastActivityAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, getIdleTimeoutMs() - (nowMs - lastActivityAtMs));
}

export function parseActivityTimestamp(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
