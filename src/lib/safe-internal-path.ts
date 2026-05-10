/** Same-origin style paths only (prevents open redirects). */
export function safeInternalPath(path: string | null): string | null {
  if (!path || !path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  return path;
}
