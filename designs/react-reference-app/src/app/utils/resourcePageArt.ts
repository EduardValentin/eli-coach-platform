import type { ResourceFileKind } from '../domain/resources';

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;
const MARGIN = 64;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Palette = {
  sans: string;
  serif: string;
  paper: string;
  ink: string;
  quiet: string;
  rule: string;
  accent: string;
  accentSoft: string;
};

const ACCENT_TOKEN: Record<ResourceFileKind, string> = {
  pdf: '--brand',
  word: '--brand-secondary',
  excel: '--success',
  image: '--brand',
};

const ACCENT_SOFT_TOKEN: Record<ResourceFileKind, string> = {
  pdf: '--surface-brand-soft',
  word: '--brand-secondary-surface',
  excel: '--success-surface',
  image: '--surface-brand-soft',
};

function tokenValue(token: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();

  return value.length > 0 ? value : fallback;
}

function tokenColor(token: string): string {
  return tokenValue(token, 'currentColor');
}

function tokenFont(token: string, fallback: string): string {
  return escapeXml(tokenValue(token, fallback));
}

function paletteFor(kind: ResourceFileKind): Palette {
  return {
    sans: tokenFont('--font-sans', 'sans-serif'),
    serif: tokenFont('--font-serif', 'serif'),
    paper: tokenColor('--surface-base'),
    ink: tokenColor('--text-primary'),
    quiet: tokenColor('--control-border-soft'),
    rule: tokenColor('--border-subtle'),
    accent: tokenColor(ACCENT_TOKEN[kind]),
    accentSoft: tokenColor(ACCENT_SOFT_TOKEN[kind]),
  };
}

function seededRandom(seed: string): () => number {
  let state = [...seed].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapWords(text: string, maxCharacters: number): string[] {
  return text.split(/\s+/).reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= maxCharacters) {
      return [...lines.slice(0, -1), `${last} ${word}`];
    }
    return [...lines, word];
  }, []);
}

function svgDataUrl(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}">${body}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function textLines(options: {
  top: number;
  count: number;
  palette: Palette;
  random: () => number;
}): { svg: string; bottom: number } {
  const { top, count, palette, random } = options;
  const lineGap = 22;
  const lines = Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const width = TEXT_WIDTH * (isLast ? 0.35 + random() * 0.3 : 0.82 + random() * 0.18);

    return `<rect x="${MARGIN}" y="${top + index * lineGap}" width="${width.toFixed(0)}" height="9" rx="4.5" fill="${palette.quiet}"/>`;
  });

  return { svg: lines.join(''), bottom: top + count * lineGap };
}

function pageFooter(page: number, pageCount: number, palette: Palette): string {
  return `<line x1="${MARGIN}" y1="${PAGE_HEIGHT - 56}" x2="${PAGE_WIDTH - MARGIN}" y2="${PAGE_HEIGHT - 56}" stroke="${palette.rule}" stroke-width="2"/><text x="${PAGE_WIDTH - MARGIN}" y="${PAGE_HEIGHT - 28}" text-anchor="end" font-family="${palette.sans}" font-size="16" fill="${palette.ink}" fill-opacity="0.55">${page} / ${pageCount}</text>`;
}

function coverBlock(title: string, palette: Palette): { svg: string; bottom: number } {
  const titleLines = wrapWords(title, 22).slice(0, 3);
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="${MARGIN}" y="${150 + index * 46}" font-family="${palette.serif}" font-size="38" fill="${palette.ink}">${escapeXml(line)}</text>`,
    )
    .join('');
  const bottom = 150 + (titleLines.length - 1) * 46 + 36;

  return {
    svg: `<rect width="${PAGE_WIDTH}" height="12" fill="${palette.accent}"/><rect x="${MARGIN}" y="84" width="96" height="10" rx="5" fill="${palette.accent}"/>${titleSvg}<rect x="${MARGIN}" y="${bottom}" width="${TEXT_WIDTH}" height="2" fill="${palette.rule}"/>`,
    bottom: bottom + 40,
  };
}

function sectionHeading(top: number, palette: Palette, random: () => number): string {
  const width = 140 + random() * 140;

  return `<rect x="${MARGIN}" y="${top}" width="${width.toFixed(0)}" height="16" rx="8" fill="${palette.ink}" fill-opacity="0.82"/>`;
}

function figure(top: number, palette: Palette): string {
  return `<rect x="${MARGIN}" y="${top}" width="${TEXT_WIDTH}" height="150" rx="16" fill="${palette.accentSoft}"/><circle cx="${MARGIN + 80}" cy="${top + 75}" r="38" fill="${palette.accent}" fill-opacity="0.35"/><rect x="${MARGIN + 150}" y="${top + 52}" width="${TEXT_WIDTH - 190}" height="10" rx="5" fill="${palette.accent}" fill-opacity="0.45"/><rect x="${MARGIN + 150}" y="${top + 84}" width="${(TEXT_WIDTH - 190) * 0.6}" height="10" rx="5" fill="${palette.accent}" fill-opacity="0.3"/>`;
}

function bulletList(top: number, palette: Palette, random: () => number): { svg: string; bottom: number } {
  const items = Array.from({ length: 4 }, (_, index) => {
    const y = top + index * 30;
    const width = (TEXT_WIDTH - 28) * (0.55 + random() * 0.4);

    return `<circle cx="${MARGIN + 6}" cy="${y + 5}" r="5" fill="${palette.accent}"/><rect x="${MARGIN + 24}" y="${y}" width="${width.toFixed(0)}" height="9" rx="4.5" fill="${palette.quiet}"/>`;
  });

  return { svg: items.join(''), bottom: top + 4 * 30 };
}

function documentPage(options: {
  title: string;
  page: number;
  pageCount: number;
  kind: ResourceFileKind;
}): string {
  const { title, page, pageCount, kind } = options;
  const palette = paletteFor(kind);
  const random = seededRandom(`${title}-${page}`);
  const parts = [`<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="${palette.paper}"/>`];
  let cursor = MARGIN + 8;

  if (page === 1) {
    const cover = coverBlock(title, palette);
    parts.push(cover.svg);
    cursor = cover.bottom;
  }

  const contentBottom = PAGE_HEIGHT - 96;
  let block = 0;

  while (cursor < contentBottom - 80) {
    parts.push(sectionHeading(cursor, palette, random));
    cursor += 40;
    const showFigure = block % 3 === 1 && cursor + 170 < contentBottom;
    const showList = block % 3 === 2 && cursor + 130 < contentBottom;

    if (showFigure) {
      parts.push(figure(cursor, palette));
      cursor += 186;
    } else if (showList) {
      const list = bulletList(cursor, palette, random);
      parts.push(list.svg);
      cursor = list.bottom + 20;
    } else {
      const lineCount = Math.min(
        3 + Math.floor(random() * 4),
        Math.floor((contentBottom - cursor) / 22),
      );
      const lines = textLines({ top: cursor, count: lineCount, palette, random });
      parts.push(lines.svg);
      cursor = lines.bottom + 26;
    }
    block += 1;
  }

  parts.push(pageFooter(page, pageCount, palette));

  return svgDataUrl(parts.join(''));
}

function spreadsheetPage(options: {
  title: string;
  page: number;
  pageCount: number;
}): string {
  const { title, page, pageCount } = options;
  const palette = paletteFor('excel');
  const random = seededRandom(`${title}-${page}`);
  const columns = 5;
  const rows = 17;
  const tableTop = 168;
  const rowHeight = 32;
  const columnWidth = TEXT_WIDTH / columns;
  const tableBottom = tableTop + rows * rowHeight;
  const heading = `<rect width="${PAGE_WIDTH}" height="12" fill="${palette.accent}"/><text x="${MARGIN}" y="104" font-family="${palette.sans}" font-size="26" font-weight="600" fill="${palette.ink}">${escapeXml(wrapWords(title, 30)[0] ?? '')}</text><text x="${MARGIN}" y="136" font-family="${palette.sans}" font-size="16" fill="${palette.ink}" fill-opacity="0.55">Sheet ${page}</text>`;
  const headerRow = `<rect x="${MARGIN}" y="${tableTop}" width="${TEXT_WIDTH}" height="${rowHeight}" fill="${palette.accentSoft}"/>`;
  const rowLines = Array.from({ length: rows + 1 }, (_, index) => {
    const y = tableTop + index * rowHeight;
    return `<line x1="${MARGIN}" y1="${y}" x2="${PAGE_WIDTH - MARGIN}" y2="${y}" stroke="${palette.rule}" stroke-width="1.5"/>`;
  });
  const columnLines = Array.from({ length: columns + 1 }, (_, index) => {
    const x = MARGIN + index * columnWidth;
    return `<line x1="${x}" y1="${tableTop}" x2="${x}" y2="${tableBottom}" stroke="${palette.rule}" stroke-width="1.5"/>`;
  });
  const cells = Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = MARGIN + column * columnWidth + 10;
    const y = tableTop + row * rowHeight + 12;
    const width = (columnWidth - 20) * (row === 0 ? 0.7 : 0.3 + random() * 0.6);
    const fill = row === 0 ? palette.accent : palette.quiet;

    return `<rect x="${x.toFixed(0)}" y="${y}" width="${width.toFixed(0)}" height="8" rx="4" fill="${fill}"/>`;
  });

  return svgDataUrl(
    [
      `<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="${palette.paper}"/>`,
      heading,
      headerRow,
      ...cells,
      ...rowLines,
      ...columnLines,
      pageFooter(page, pageCount, palette),
    ].join(''),
  );
}

const PLATE_SEGMENTS: { token: string; label: string; share: number }[] = [
  { token: '--nutrition-legume', label: 'Vegetables', share: 0.5 },
  { token: '--nutrition-protein', label: 'Protein', share: 0.25 },
  { token: '--nutrition-carb', label: 'Carbs', share: 0.25 },
];

function plateSegmentPath(start: number, share: number): string {
  const centre = { x: PAGE_WIDTH / 2, y: 360 };
  const radius = 190;
  const point = (fraction: number) => {
    const angle = fraction * Math.PI * 2 - Math.PI / 2;
    return `${(centre.x + radius * Math.cos(angle)).toFixed(1)} ${(centre.y + radius * Math.sin(angle)).toFixed(1)}`;
  };
  const largeArc = share > 0.5 ? 1 : 0;

  return `M ${centre.x} ${centre.y} L ${point(start)} A ${radius} ${radius} 0 ${largeArc} 1 ${point(start + share)} Z`;
}

export function plateGuideArt(): string {
  const palette = paletteFor('image');
  let start = 0;
  const segments = PLATE_SEGMENTS.map((segment) => {
    const path = `<path d="${plateSegmentPath(start, segment.share)}" fill="${tokenColor(segment.token)}" fill-opacity="0.85" stroke="${palette.paper}" stroke-width="6"/>`;
    start += segment.share;
    return path;
  });
  const legend = PLATE_SEGMENTS.map(
    (segment, index) =>
      `<circle cx="${MARGIN + 12}" cy="${640 + index * 40}" r="10" fill="${tokenColor(segment.token)}"/><text x="${MARGIN + 34}" y="${646 + index * 40}" font-family="${palette.sans}" font-size="20" fill="${palette.ink}">${segment.label}</text>`,
  ).join('');

  return svgDataUrl(
    [
      `<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="${palette.accentSoft}"/>`,
      `<circle cx="${PAGE_WIDTH / 2}" cy="360" r="236" fill="${palette.paper}"/>`,
      `<circle cx="${PAGE_WIDTH / 2}" cy="360" r="236" fill="none" stroke="${palette.rule}" stroke-width="4"/>`,
      ...segments,
      legend,
    ].join(''),
  );
}

export function documentPageArt(options: {
  title: string;
  kind: ResourceFileKind;
  pageCount: number;
}): string[] {
  const { title, kind, pageCount } = options;

  return Array.from({ length: pageCount }, (_, index) =>
    kind === 'excel'
      ? spreadsheetPage({ title, page: index + 1, pageCount })
      : documentPage({ title, page: index + 1, pageCount, kind }),
  );
}
