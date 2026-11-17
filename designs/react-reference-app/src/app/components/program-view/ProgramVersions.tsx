import { History } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ProgramVersion, VersionState } from '../../domain/program';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { SettingsSection } from '../SettingsSection';
import { WIDGET_TITLE_CLASS } from '../typography';
import { Badge } from '../ui/badge';

const STATE_LABELS: Record<VersionState, string> = { published: 'Published', draft: 'Draft', superseded: 'Superseded' };

const STATE_TONES = { published: 'success', draft: 'pending', superseded: 'muted' } as const satisfies Record<VersionState, string>;

export type VersionStates = 'shown' | 'hidden';

type ProgramVersionsProps = { versions: readonly ProgramVersion[]; states: VersionStates; action: (version: ProgramVersion) => ReactNode };

export function ProgramVersions({ versions, states, action }: ProgramVersionsProps) {
  if (versions.length === 0) return null;
  return (
    <SettingsSection headingId="program-versions" title="Versions" icon={History}>
      <ol className="divide-y divide-border-subtle">
        {[...versions].reverse().map(version => (
          <li key={version.number} data-parity="version" className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
            <div className="grid min-w-0 gap-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className={WIDGET_TITLE_CLASS}>{`Version ${version.number}`}</span>
                {states === 'shown' && <Badge tone={STATE_TONES[version.state]}>{STATE_LABELS[version.state]}</Badge>}
                {version.publishedAt && <span className="text-text-secondary tabular-nums">{formatJourneyDate(version.publishedAt)}</span>}
                {version.state === 'draft' && version.number > 1 && <span className="text-text-secondary">{`from version ${version.number - 1}`}</span>}
              </p>
              {version.whatChanged && <p className="max-w-prose text-sm leading-relaxed text-text-secondary">{version.whatChanged}</p>}
            </div>
            {action(version)}
          </li>
        ))}
      </ol>
    </SettingsSection>
  );
}
