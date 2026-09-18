import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";

type CalendarInviteOptions = {
  joinUrl: string;
  uidHost: string;
};

type GoogleCalendarOptions = {
  joinUrl: string;
  timeZone: string;
};

const CALENDAR_SUMMARY = "Free assessment call with Eli";
const PRODUCT_IDENTIFIER = "-//Evoa Fitness//Assessment Call//EN";
const LINE_BREAK = "\r\n";
const MAX_LINE_OCTETS = 75;

export function buildIcs(
  call: AssessmentCallSnapshot,
  options: CalendarInviteOptions,
): Uint8Array {
  const contentLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_IDENTIFIER}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${call.id}@${options.uidHost}`,
    `DTSTAMP:${toUtcStamp(call.bookedAt)}`,
    `DTSTART:${toUtcStamp(call.startsAt)}`,
    `DTEND:${toUtcStamp(call.endsAt)}`,
    `SUMMARY:${escapeText(CALENDAR_SUMMARY)}`,
    `DESCRIPTION:${escapeText(describeCall(call, options.joinUrl))}`,
    `LOCATION:${escapeText(options.joinUrl)}`,
    `URL:${options.joinUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new TextEncoder().encode(
    contentLines.map(foldContentLine).join(LINE_BREAK) + LINE_BREAK,
  );
}

export function buildGoogleCalendarUrl(
  call: AssessmentCallSnapshot,
  options: GoogleCalendarOptions,
): string {
  const url = new URL("https://calendar.google.com/calendar/render");

  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", CALENDAR_SUMMARY);
  url.searchParams.set(
    "dates",
    `${toUtcStamp(call.startsAt)}/${toUtcStamp(call.endsAt)}`,
  );
  url.searchParams.set("details", describeCall(call, options.joinUrl));
  url.searchParams.set("location", options.joinUrl);
  url.searchParams.set("ctz", options.timeZone);

  return url.toString();
}

function describeCall(call: AssessmentCallSnapshot, joinUrl: string): string {
  return [
    `A free ${ASSESSMENT_CALL_RULES.durationMinutes}-minute assessment call with Eli.`,
    `Booked by: ${call.visitorName}`,
    `Join the call: ${joinUrl}`,
  ].join("\n");
}

function toUtcStamp(instant: Date): string {
  const year = String(instant.getUTCFullYear()).padStart(4, "0");
  const month = String(instant.getUTCMonth() + 1).padStart(2, "0");
  const day = String(instant.getUTCDate()).padStart(2, "0");
  const hours = String(instant.getUTCHours()).padStart(2, "0");
  const minutes = String(instant.getUTCMinutes()).padStart(2, "0");
  const seconds = String(instant.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function foldContentLine(line: string): string {
  const encoder = new TextEncoder();
  const segments: string[] = [];
  let segment = "";
  let segmentOctets = 0;
  let segmentLimit = MAX_LINE_OCTETS;

  for (const character of line) {
    const characterOctets = encoder.encode(character).length;

    if (segmentOctets + characterOctets > segmentLimit) {
      segments.push(segment);
      segment = "";
      segmentOctets = 0;
      segmentLimit = MAX_LINE_OCTETS - 1;
    }

    segment += character;
    segmentOctets += characterOctets;
  }

  segments.push(segment);

  return segments.join(`${LINE_BREAK} `);
}
