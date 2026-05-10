import { redirect } from "next/navigation";

/** `/organizer` is deprecated; Managing events live under Dashboard → Events. */
export default async function OrganizerHomeRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["created", "updated", "archived", "deleted"] as const) {
    const raw = sp[key];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (val) params.set(key, val);
  }
  const q = params.toString();
  redirect(`/dashboard/events${q ? `?${q}` : ""}`);
}
