import type { EmailAttachment } from "./product-email-contract.server";

export type CalendarEvent = {
  description: string;
  endsAt: Date;
  id: string;
  joinUrl: string;
  startsAt: Date;
  title: string;
};

type CalendarInviteOptions = {
  issuedAt: Date;
  organizerEmail: string;
  productName: string;
  uidHost: string;
};

const ORGANIZER_NAME = "Evoa Fitness";
const INVITE_CONTENT_TYPE = "text/calendar; charset=utf-8; method=PUBLISH";
const INVITE_FILENAME = "invite.ics";
const LINE_BREAKS_IN_TEXT = /\r\n|\r|\n/g;
const LINE_BREAK = "\r\n";
const MAX_LINE_OCTETS = 75;

export function buildCalendarInvite(
  event: CalendarEvent,
  options: CalendarInviteOptions,
): EmailAttachment {
  const contentLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${ORGANIZER_NAME}//${options.productName}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${options.uidHost}`,
    `DTSTAMP:${toUtcStamp(options.issuedAt)}`,
    `ORGANIZER;CN=${ORGANIZER_NAME}:mailto:${options.organizerEmail}`,
    `DTSTART:${toUtcStamp(event.startsAt)}`,
    `DTEND:${toUtcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.joinUrl)}`,
    `URL:${event.joinUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return {
    content: new TextEncoder().encode(
      contentLines.map(foldContentLine).join(LINE_BREAK) + LINE_BREAK,
    ),
    contentType: INVITE_CONTENT_TYPE,
    filename: INVITE_FILENAME,
  };
}

export function buildGoogleCalendarUrl(
  event: CalendarEvent,
  timeZone: string,
): string {
  const url = new URL("https://calendar.google.com/calendar/render");

  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set(
    "dates",
    `${toUtcStamp(event.startsAt)}/${toUtcStamp(event.endsAt)}`,
  );
  url.searchParams.set("details", event.description);
  url.searchParams.set("location", event.joinUrl);
  url.searchParams.set("ctz", timeZone);

  return url.toString();
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
    .replace(LINE_BREAKS_IN_TEXT, "\\n");
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
