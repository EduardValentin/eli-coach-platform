import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  measurementDueLine,
  type MeasurementDueLine,
} from '../../domain/measurements';
import { WidgetLink } from '../WidgetLink';

const NUDGE_LINES: Record<MeasurementDueLine, string> = {
  'weigh-in': 'Your weekly weigh-in is due',
  measurements: 'Time for your measurements and photos',
};

export function MeasurementsNudge() {
  const { demoJourney } = useClientJourneys();
  const due = measurementDueLine(demoJourney.measurements, new Date());
  if (!due) return null;

  return (
    <p className="mb-8" data-parity-root="MeasurementsNudge">
      <WidgetLink to="/portal/profile" trailing="arrow">
        {NUDGE_LINES[due]}
      </WidgetLink>
    </p>
  );
}
