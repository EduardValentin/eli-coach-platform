export function describedByOf(
  ...ids: (string | undefined)[]
): string | undefined {
  const described = ids.filter((id): id is string => id !== undefined);

  return described.length > 0 ? described.join(" ") : undefined;
}
