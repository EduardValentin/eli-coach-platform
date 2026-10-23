import { Link, useNavigate } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import type { ClientJourney } from '../../../domain/journey';
import { draftOf, type Program } from '../../../domain/program';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { Button } from '../../ui/button';
import { coachingHasEnded } from './ProgramSummary';

export function NextVersionAction({ journey, program }: { journey: ClientJourney; program: Program }) {
  const { startDraft } = usePrograms();
  const navigate = useNavigate();
  const draftPath = `${clientDetailPathForJourney(journey)}/program/draft`;

  if (draftOf(program)) {
    return (
      <Button variant="primary" asChild>
        <Link to={draftPath}>Continue draft</Link>
      </Button>
    );
  }
  if (coachingHasEnded(journey, new Date())) return null;
  return (
    <Button
      variant="primary"
      onClick={() => {
        startDraft(journey.callId);
        navigate(draftPath);
      }}
    >
      New version
    </Button>
  );
}
