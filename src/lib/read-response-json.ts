/**
 * Read a Response body as text and parse JSON. Safer than res.json() alone when
 * the server may return HTML (e.g. an unhandled error page) or an empty body.
 */
export async function readResponseJson<T extends Record<string, unknown>>(
  res: Response
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  bodyIsJson: boolean;
  /** First part of body when JSON parse failed or body was empty (for debugging). */
  rawPreview: string | null;
}> {
  const text = await res.text();
  const preview =
    text.trim().length > 0
      ? text.replace(/\s+/g, " ").slice(0, 280)
      : null;
  if (!text.trim()) {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      bodyIsJson: false,
      rawPreview: null,
    };
  }
  try {
    const value: unknown = JSON.parse(text);
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return {
        ok: res.ok,
        status: res.status,
        data: value as T,
        bodyIsJson: true,
        rawPreview: null,
      };
    }
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      bodyIsJson: false,
      rawPreview: preview,
    };
  } catch {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      bodyIsJson: false,
      rawPreview: preview,
    };
  }
}
