import type { Metadata } from "next";
import { DashCardPreview } from "@/components/dash-card/dash-card-preview";
import { DashCardPrintButton } from "@/components/dash-card/dash-card-print-button";
import { SAMPLE_DASH_CARD_DATA } from "@/components/dash-card/sample-dash-card-data";

export const metadata: Metadata = {
  title: "Dash card preview (sample) | CarShowApp",
  robots: { index: false, follow: false },
};

/**
 * Sample printable dash card — open `/dash-card-preview`, then use “Print dash card”.
 * TODO: Add a parameterized route (e.g. under organizer dashboard) that loads `DashCardModel`
 * from the DB using `eventId` + `registrationVehicleId` (or similar).
 */
export default function DashCardPreviewPage() {
  return (
    <div className="page-shell bg-slate-100 print:bg-white print:py-0">
      <div className="layout-bar mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="max-w-2xl">
          <h1 className="text-lg font-semibold text-foreground">
            Dash card (sample)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sized for US Letter (8.5&quot; × 11&quot;) landscape — one card per page.
            In the print dialog, choose <strong>Landscape</strong> and confirm paper
            size is Letter.
          </p>
        </div>
        <DashCardPrintButton />
      </div>
      <div className="dash-card-print-page">
        <DashCardPreview data={SAMPLE_DASH_CARD_DATA} />
      </div>
    </div>
  );
}
