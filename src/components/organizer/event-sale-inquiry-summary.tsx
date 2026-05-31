type Props = {
  forSaleVehicleCount: number;
  inquiryCount: number;
};

export function EventSaleInquirySummary({
  forSaleVehicleCount,
  inquiryCount,
}: Props) {
  return (
    <section className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Vehicle sale inquiries</p>
      <p className="mt-1 text-muted-foreground">
        {forSaleVehicleCount} vehicle
        {forSaleVehicleCount === 1 ? "" : "s"} listed for sale · {inquiryCount}{" "}
        buyer inquir{inquiryCount === 1 ? "y" : "ies"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Buyer contact details are forwarded to vehicle owners only. Organizers
        see counts here, not buyer names or contact information.
      </p>
    </section>
  );
}
