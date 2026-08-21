/**
 * Some libraries parse colour strings themselves and never hand them to CSS, so a
 * `var(--token)` reference would reach them uninterpreted. Reading the token off the
 * document keeps those call sites on the design system instead of on literal values.
 *
 * Returns only the tokens that actually resolved. Callers should treat an empty result
 * as "no colours available" and fall back to the library's own defaults — that is what
 * happens under jsdom, where no stylesheet is attached.
 */
export function resolveTokenColors(tokenNames: string[]): string[] {
  if (typeof document === 'undefined') return [];
  const rootStyles = getComputedStyle(document.documentElement);
  return tokenNames
    .map(name => rootStyles.getPropertyValue(name).trim())
    .filter(value => value.length > 0);
}
