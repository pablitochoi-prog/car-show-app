export const TROPHY_WINNERS_LIST_SIZE = 10;

export function normalizeAwardNameForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}
