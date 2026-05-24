/** Placeholder QR blocks when generation has not run yet. */
export function DashCardQrPlaceholder() {
  return (
    <div className="dash-card-qr-placeholder" aria-hidden>
      <svg viewBox="0 0 64 64" className="h-[1.4cm] w-[1.4cm] text-[#142047]">
        <rect x="4" y="4" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="42" y="4" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="4" y="42" width="18" height="18" fill="currentColor" rx="1" />
        <rect x="26" y="26" width="6" height="6" fill="currentColor" />
        <rect x="36" y="26" width="6" height="6" fill="currentColor" />
        <rect x="26" y="36" width="6" height="6" fill="currentColor" />
        <rect x="48" y="26" width="6" height="6" fill="currentColor" />
        <rect x="26" y="48" width="6" height="6" fill="currentColor" />
      </svg>
    </div>
  );
}
