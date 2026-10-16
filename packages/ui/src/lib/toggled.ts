export function toggled<Value>(
  values: readonly Value[],
  value: Value,
): Value[] {
  return values.includes(value)
    ? values.filter((other) => other !== value)
    : [...values, value];
}
