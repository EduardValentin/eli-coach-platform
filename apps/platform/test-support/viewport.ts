const PIXELS_PER_EM = 16;

export function matchesNarrowerThan(query: string, width: number): boolean {
  const match = /width < ([\d.]+)em/.exec(query);

  return match !== null && width < Number(match[1]) * PIXELS_PER_EM;
}
