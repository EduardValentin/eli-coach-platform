export function clientFullName(client: {
  firstName: string;
  lastName: string;
}): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

export function bundleLengthLabel(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}
