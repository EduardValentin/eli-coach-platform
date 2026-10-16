import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ItemGlyph } from './ItemGlyph';

export function ItemIdentity({
  icon,
  title,
  summary,
  glyphParity,
  summaryParity,
}: {
  icon: LucideIcon;
  title: ReactNode;
  summary?: ReactNode;
  glyphParity?: string;
  summaryParity?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <ItemGlyph icon={icon} parity={glyphParity} />
      <div>
        <p className="font-semibold text-sm text-text-primary">{title}</p>
        {summary && (
          <p className="text-xs text-text-secondary mt-0.5" data-parity={summaryParity}>
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
