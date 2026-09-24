export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function trainingClientIdFor(clientId: string): string {
  return clientId === 'c1' ? 'client-1' : clientId;
}
