import { Link, useNavigate } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { coachingHasEnded, type ClientJourney } from '../../../domain/journey';
import { draftOf, type Program } from '../../../domain/program';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { Button } from '../../ui/button';

type ActionSize = 'sm' | 'md';

export function NextVersionAction({ journey, program, size = 'sm' }: { journey: ClientJourney; program: Program; size?: ActionSize }) {
  const { startDraft } = usePrograms();
  const navigate = useNavigate();
  const draftPath = `${clientDetailPathForJourney(journey)}/program/draft`;

  if (draftOf(program)) {
    return (
      <Button variant="primary" size={size} asChild>
        <Link to={draftPath}>Continue draft</Link>
      </Button>
    );
  }
  if (coachingHasEnded(journey, new Date())) return null;
  return (
    <Button
      variant="primary"
      size={size}
      onClick={() => {
        startDraft(journey.callId);
        navigate(draftPath);
      }}
    >
      New version
    </Button>
  );
}
