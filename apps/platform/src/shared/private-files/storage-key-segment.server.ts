const STORAGE_KEY_SEGMENT = /^[A-Za-z0-9_-]+$/;

export function isStorageKeySegment(segment: string): boolean {
  return STORAGE_KEY_SEGMENT.test(segment);
}
