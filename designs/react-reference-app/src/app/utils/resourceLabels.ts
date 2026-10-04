import type { ResourceFileKind, UploadRefusal } from '../domain/resources';

export const RESOURCE_KIND_LABELS: Record<
  ResourceFileKind,
  { short: string; long: string }
> = {
  pdf: { short: 'PDF', long: 'PDF document' },
  word: { short: 'DOC', long: 'Word document' },
  excel: { short: 'XLS', long: 'Spreadsheet' },
  image: { short: 'IMG', long: 'Image' },
};

export const UPLOAD_REFUSAL_MESSAGES: Record<UploadRefusal, string> = {
  'unsupported-type': 'That file type can’t be added.',
  'too-large': 'That file is over 25 MB.',
};

export const RESOURCE_UPLOAD_HINT = 'PDF, Word, Excel or image · up to 25 MB';

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1)} MB`;
  if (bytes >= KILOBYTE) return `${Math.round(bytes / KILOBYTE)} KB`;

  return `${bytes} B`;
}

export function pageCountLabel(pageCount: number): string {
  return pageCount === 1 ? '1 page' : `${pageCount} pages`;
}

export function possessive(name: string): string {
  return `${name}’s`;
}
