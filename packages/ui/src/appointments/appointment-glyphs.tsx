import type { SVGProps } from "react";

const DEFAULT_GLYPH_SIZE = 13;

type GlyphProps = {
  size?: number;
};

function glyphAttributes(size: number): SVGProps<SVGSVGElement> {
  return {
    className: "shrink-0",
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: size,
    xmlns: "http://www.w3.org/2000/svg",
  };
}

export function CalendarDaysGlyph({ size = DEFAULT_GLYPH_SIZE }: GlyphProps) {
  return (
    <svg aria-hidden="true" {...glyphAttributes(size)}>
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
    <svg aria-hidden="true" {...glyphAttributes(DEFAULT_GLYPH_SIZE)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function MailGlyph() {
  return (
    <svg aria-hidden="true" {...glyphAttributes(DEFAULT_GLYPH_SIZE)}>
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect height="16" rx="2" width="20" x="2" y="4" />
    </svg>
  );
}
