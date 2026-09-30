import { useState } from 'react';
import type { ClientJourney } from '../../domain/journey';
import { hasPregnancyContext } from '../../domain/onboardingAnswers';
import { noMeasurementsYetLine } from '../../utils/journeyLabels';
import { MeasurementsTable } from '../MeasurementsTable';
import type { MeasureUnits } from '../client-portal/measureUnits';
import { PhotoViewDialog } from '../client-portal/PhotoViewDialog';

export function JourneyMeasurements({
  journey,
  heightCm,
  units,
}: {
  journey: ClientJourney;
  heightCm: number;
  units: MeasureUnits;
}) {
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const viewing = journey.measurements.find(
    (entry) => entry.id === viewingEntryId,
  );

  return (
    <MeasurementsTable
      className="mb-8"
      emptyMessage={noMeasurementsYetLine(journey.identity.gender)}
      headingId="measurements-panel-heading"
      heightCm={heightCm}
      measurements={journey.measurements}
      onViewPhotos={(entry) => setViewingEntryId(entry.id)}
      perspective="coach"
      ratioHidden={hasPregnancyContext(journey.onboarding)}
      units={units}
    >
      <PhotoViewDialog
        entry={viewing}
        onClose={() => setViewingEntryId(null)}
        viewer={{ role: 'coach', clientFirstName: journey.identity.firstName }}
      />
    </MeasurementsTable>
  );
}
