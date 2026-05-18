/**
 * Placeholder until a QR library (e.g. qrcode) encodes a full vote URL.
 * Swap for <Image src={dataUrl} /> when generating server- or client-side.
 */
export function DashCardQrPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex aspect-square w-full max-w-[5.5rem] flex-col items-center justify-center border-2 border-dashed border-[#94a3b8] bg-white sm:max-w-[6.5rem]"
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-[70%] w-[70%] text-[#142047]">
        <rect x="4" y="4" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="42" y="4" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="4" y="42" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="26" y="26" width="6" height="6" fill="currentColor" />
        <rect x="36" y="26" width="6" height="6" fill="currentColor" />
        <rect x="26" y="36" width="6" height="6" fill="currentColor" />
        <rect x="48" y="26" width="6" height="6" fill="currentColor" />
        <rect x="26" y="48" width="6" height="6" fill="currentColor" />
      </svg>
      <span className="px-1 text-center text-[0.6rem] font-medium uppercase tracking-wide text-[#64748b]">
        {label}
      </span>
    </div>
  );
}
