/** Display-friendly SMS number for dash cards and instructions. */
export function formatSmsNumberForDisplay(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length === 5 || digits.length === 6) return digits;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phoneNumber;
}

/** Dash card Vote panel: "Text AXY-004 to 888-382-1956" */
export function buildDashCardSmsLine(
  vehicleEntryCode: string,
  phoneNumber: string,
): string {
  return `Text ${vehicleEntryCode} to ${formatSmsNumberForDisplay(phoneNumber)}`;
}
