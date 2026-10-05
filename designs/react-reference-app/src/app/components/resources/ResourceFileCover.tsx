import {
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import type { ResourceFileKind } from '../../domain/resources';
import { cn } from '../ui/utils';

export const RESOURCE_KIND_GLYPHS: Record<ResourceFileKind, LucideIcon> = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  image: FileImage,
};

type CoverPlacement = 'thumbnail' | 'stage';

const GLYPH_CLASS: Record<CoverPlacement, string> = {
  thumbnail: 'size-14 sm:size-16',
  stage: 'size-16 lg:size-20',
};

export function ResourceFileCover({
  kind,
  placement,
  fileName,
}: {
  kind: ResourceFileKind;
  placement: CoverPlacement;
  fileName?: string;
}) {
  const Glyph = RESOURCE_KIND_GLYPHS[kind];

  return (
    <span
      className={cn('flex size-full flex-col items-center justify-center gap-3 bg-surface-quiet px-4 text-center', {
        'py-8': placement === 'stage',
      })}
      data-parity="resource-cover"
    >
      <Glyph aria-hidden="true" className={cn('text-icon-muted', GLYPH_CLASS[placement])} strokeWidth={1.25} />
      {fileName && (
        <span className="max-w-full text-sm break-words text-text-secondary">{fileName}</span>
      )}
    </span>
  );
}
