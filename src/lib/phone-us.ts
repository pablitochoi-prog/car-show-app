/** US display mask: (###) ###-#### — max 10 digits. */
export function formatUSPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function digitsFromPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}
