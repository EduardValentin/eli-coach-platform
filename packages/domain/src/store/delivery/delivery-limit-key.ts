export function resolveDeliveryLimitKey(normalizedEmail: string): string {
  const domainIndex = normalizedEmail.lastIndexOf("@");

  if (domainIndex < 0) {
    return normalizedEmail;
  }

  const localPart = normalizedEmail.slice(0, domainIndex);
  const tagIndex = localPart.indexOf("+");

  return tagIndex < 0
    ? normalizedEmail
    : `${localPart.slice(0, tagIndex)}${normalizedEmail.slice(domainIndex)}`;
}
