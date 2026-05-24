import { describe, expect, it } from "vitest";
import {
  buildCalendarEventDetails,
  buildGoogleCalendarUrl,
  buildIcsContent,
  zonedLocalDateTimeToUtc,
} from "@/lib/event-calendar";

describe("event-calendar", () => {
  it("converts zoned local time to UTC", () => {
    const utc = zonedLocalDateTimeToUtc(
      "2026-06-15",
      "09:00",
      "America/New_York",
    );
    expect(utc.toISOString()).toBe("2026-06-15T13:00:00.000Z");
  });

  it("builds all-day calendar details when no start time", () => {
    const details = buildCalendarEventDetails({
      eventId: "evt-1",
      name: "Rad Wood",
      showNumber: 1001,
      startDate: new Date(Date.UTC(2026, 5, 15, 12, 0, 0)),
      endDate: null,
      startTime: null,
      endTime: null,
    });
    expect(details.allDay).toBe(true);
    expect(details.startYmd).toBe("2026-06-15");
  });

  it("builds Google Calendar URL with timed event", () => {
    const details = buildCalendarEventDetails({
      eventId: "evt-1",
      name: "Rad Wood",
      showNumber: 1001,
      startDate: new Date(Date.UTC(2026, 5, 15, 12, 0, 0)),
      startTime: "09:00",
      endTime: "17:00",
      dailyHours: [
        {
          date: "2026-06-15",
          startTime: "09:00",
          endTime: "17:00",
          timeZone: "America/New_York",
        },
      ],
    });
    const url = buildGoogleCalendarUrl(details);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("EVT-1001");
    expect(url).toContain("dates=");
  });

  it("builds ICS with TZID for timed events", () => {
    const details = buildCalendarEventDetails({
      eventId: "evt-1",
      name: "Rad Wood",
      showNumber: 1001,
      startDate: new Date(Date.UTC(2026, 5, 15, 12, 0, 0)),
      startTime: "09:00",
      endTime: "17:00",
      dailyHours: [
        {
          date: "2026-06-15",
          startTime: "09:00",
          endTime: "17:00",
          timeZone: "America/New_York",
        },
      ],
    });
    const ics = buildIcsContent(details, "evt-1@carshowscout");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;TZID=America/New_York:");
    expect(ics).toContain("SUMMARY:EVT-1001 Rad Wood");
  });
});
