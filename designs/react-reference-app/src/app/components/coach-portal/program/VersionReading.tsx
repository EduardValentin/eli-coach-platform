import type { ProgramVersion } from '../../../domain/program';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { Reading } from '../../Reading';

export function publishedText(version: ProgramVersion): string | null {
  return version.publishedAt ? `published ${formatJourneyDate(version.publishedAt)}` : null;
}

export function VersionReading({ version }: { version: ProgramVersion }) {
  return <Reading as="dl-item" size="md" label="Version" valueParity="plan-version-reading" value={`Version ${version.number}`} detail={publishedText(version)} />;
}
