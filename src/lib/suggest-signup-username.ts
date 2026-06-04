/** Classic-car themed username parts for signup prefill (letters, numbers, underscores). */

const THEMES = [
  "roadster",
  "coupe",
  "mustang",
  "corvette",
  "impala",
  "belair",
  "charger",
  "camaro",
  "falcon",
  "galaxie",
  "chevelle",
  "riviera",
  "barracuda",
  "ranchero",
  "hotrod",
  "tailfin",
  "cruiser",
  "garage",
  "showroom",
  "chrome",
  "vintage",
  "classic",
  "cruisin",
  "lowrider",
  "muscle",
  "woodie",
  "deuce",
  "gto",
  "cuda",
  "tbird",
] as const;

const FLAIR = [
  "driver",
  "cruiser",
  "fan",
  "club",
  "show",
  "lane",
  "pit",
  "garage",
  "ride",
  "wheels",
] as const;

const USERNAME_MAX = 30;
const USERNAME_MIN = 3;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomDigits(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fitsRules(value: string): boolean {
  return (
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    /^[a-z0-9_]+$/.test(value)
  );
}

/**
 * Random signup username: classic car theme + number (e.g. mustang_driver_427).
 * Lowercase to match signup normalization.
 */
export function suggestClassicCarUsername(): string {
  for (let attempt = 0; attempt < 12; attempt++) {
    const theme = pick(THEMES);
    const flair = pick(FLAIR);
    const num = randomDigits(10, 999);
    const candidates = [
      `${theme}_${flair}_${num}`,
      `${theme}_${num}`,
      `${flair}_${theme}_${num}`,
    ];
    for (const c of candidates) {
      if (fitsRules(c)) return c;
    }
  }
  return `classic_driver_${randomDigits(100, 999)}`;
}
