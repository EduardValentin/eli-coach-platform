import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ProgramSetupSheet } from '../../components/coach-portal/program/ProgramSetupSheet';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import { usePrograms } from '../../context/ProgramContext';
import { useJourneyClient } from '../../hooks/useJourneyClient';

export function ProgramEditorPage() {
  useCoachPortalScope();
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);
  const { programFor } = usePrograms();
  const navigate = useNavigate();
  const isSetup = useLocation().pathname.endsWith('/new');
  const draftPath = `/coach/clients/${id}/program/draft`;

  if (!journey) return <Navigate to="/coach/clients" replace />;
  if (!isSetup) return <h1>Program editor</h1>;
  if (programFor(journey.callId)) return <Navigate to={draftPath} replace />;

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-10">
      <ProgramSetupSheet journey={journey} onCreated={() => navigate(draftPath)} />
    </main>
  );
}
