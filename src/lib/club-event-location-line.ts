/** Venue · City, ST for upcoming-activities list rows. */
export function formatClubEventLocationLine(ev: {
  venue: string | null;
  city: string | null;
  state: string | null;
}) {
  const place = [ev.city, ev.state].filter(Boolean).join(", ");
  const parts = [ev.venue?.trim() || "", place].filter(Boolean);
  return parts.join(" · ") || null;
}
