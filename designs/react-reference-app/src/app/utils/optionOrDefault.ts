export function optionOrDefault<Option extends string>(
  options: readonly Option[],
  value: string | null,
  fallback: Option,
): Option {
  return options.find((option) => option === value) ?? fallback;
}
