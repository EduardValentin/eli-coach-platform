import { glyphAttributes } from "../lib/glyph";

const APPOINTMENT_GLYPH_SIZE = 13;

export function CalendarDaysGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      {...glyphAttributes(APPOINTMENT_GLYPH_SIZE)}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

export function ClockGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      {...glyphAttributes(APPOINTMENT_GLYPH_SIZE)}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function PhoneGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      {...glyphAttributes(APPOINTMENT_GLYPH_SIZE)}
    >
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

export function MailGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      {...glyphAttributes(APPOINTMENT_GLYPH_SIZE)}
    >
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect height="16" rx="2" width="20" x="2" y="4" />
    </svg>
  );
}
