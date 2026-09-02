/**
 * Some libraries parse colour strings themselves and never hand them to CSS, so a
 * `var(--token)` reference would reach them uninterpreted. Reading the token off the
 * document keeps those call sites on the design system instead of on literal values.
 *
 * Each value goes back through the browser's own colour parser and comes out as
 * `#rrggbb`. That is not cosmetic: a custom property holds whatever text survived
 * minification, and the minifier rewrites colours to their shortest equivalent — it
 * ships `#FFD700` as `gold`. Libraries that only understand hex silently drop such a
 * colour, so normalising here is what keeps a token swap from breaking one.
 *
 * Returns only the tokens that resolved to a colour the browser recognises. Callers
 * should treat an empty result as "no colours available" and fall back to the
 * library's own defaults — that is what happens under jsdom with no stylesheet.
 */
export function resolveTokenColors(tokenNames: string[]): string[] {
  if (typeof document === 'undefined') return [];
  const rootStyles = getComputedStyle(document.documentElement);
  return tokenNames
    .map(name => toHexColor(rootStyles.getPropertyValue(name).trim()))
    .filter((color): color is string => color !== null);
}

function toHexColor(value: string): string | null {
  if (!value) return null;

  const probe = document.createElement('span');
  probe.style.color = value;
  // Assigning an unparseable colour leaves the property empty, which is the cheapest
  // way to reject one without reaching for a colour grammar of our own.
  if (!probe.style.color) return null;

  probe.style.display = 'none';
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const channels = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed);
  if (!channels) return null;

  return `#${channels.slice(1, 4).map(toHexChannel).join('')}`;
}

function toHexChannel(channel: string): string {
  return Number(channel).toString(16).padStart(2, '0');
}
