export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function nextToken(existingCount: number): string {
  return `A-${127 + existingCount}`;
}
