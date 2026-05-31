export class ClientFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientFetchError";
    this.status = status;
  }
}

/** JSON fetcher for SWR — credentials included for auth cookies. */
export async function clientJsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new ClientFetchError(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
      res.status,
    );
  }
  return data;
}
