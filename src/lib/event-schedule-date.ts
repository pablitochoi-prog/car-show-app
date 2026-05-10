/** Today's calendar date in the user's local timezone (`YYYY-MM-DD`). */
export function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lexicographic compare for ISO calendar strings (`YYYY-MM-DD`). */
export function isYmdBeforeLocalToday(ymd: string): boolean {
  const t = ymd.trim();
  const today = todayLocalYmd();
  return t !== "" && t < today;
}
