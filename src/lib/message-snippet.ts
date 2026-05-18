/** Single-line preview of message body for inbox rows. */
export function messageBodySnippet(body: string, maxLength = 96): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength)}…`;
}
