import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion, useReducedMotion } from 'motion/react';
import { ClipboardCheck, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { RowActionLink } from '../../components/RowActionButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { getInitials } from '../../utils/clientHelpers';
import { DashboardAppointmentRow } from '../../components/coach-portal/DashboardAppointmentRow';
import { AssessmentCallsUnavailable } from '../../components/coach-portal/AssessmentCallsUnavailable';
import { UpcomingAssessmentCalls } from '../../components/coach-portal/UpcomingAssessmentCalls';
import { useAppState } from '../../context/AppContext';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { useCheckins } from '../../context/CheckinContext';
import { readCoachCallListing } from '../../services/assessmentCallService';
import {
  classifyCalls,
  countCallsLeftToday,
} from '../../utils/assessmentCallListing';
import {
  browserTimeZone,
  formatCheckinDate,
  formatCheckinTime,
} from '../../utils/dateFormatters';

const MOCK_CLIENTS = [
  {
    id: 'c1',
    name: 'Jane Doe',
    phase: 'Luteal',
    goal: 'Recomp',
    compliance: '95%',
  },
  {
    id: 'c2',
    name: 'Jessica Alba',
    phase: 'Follicular',
    goal: 'Fat Loss',
    compliance: '88%',
  },
  {
    id: 'c3',
    name: 'Emma Stone',
    phase: 'Ovulatory',
    goal: 'Hypertrophy',
    compliance: '100%',
  },
];

type ActiveClient = (typeof MOCK_CLIENTS)[number];

function ActiveClientRow({
  client,
  showsCompliance,
}: {
  client: ActiveClient;
  showsCompliance: boolean;
}) {
  const navigate = useNavigate();
  const detailPath = `/coach/clients/${client.id}`;

  return (
    <TableRow
      className="group cursor-pointer"
      onClick={() => navigate(detailPath)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-quiet flex items-center justify-center font-serif text-text-primary font-semibold shrink-0">
            {getInitials(client.name)}
          </div>
          <p className="font-semibold text-sm text-text-primary">
            {client.name}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {client.phase}
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {client.goal}
      </TableCell>
      {showsCompliance && (
        <TableCell>
          <span className="inline-flex items-center px-2 py-1 rounded-field bg-success-soft text-success text-xs font-bold">
            {client.compliance}
          </span>
        </TableCell>
      )}
    </TableRow>
  );
}

export function CoachDashboard() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { getPendingCheckins } = useCheckins();
  const { bookings } = useAssessmentCalls();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const listing = readCoachCallListing(bookings, appState.coachCallsOutcome);

  if (listing.status === 'unavailable') {
    return <AssessmentCallsUnavailable />;
  }

  const pendingCheckins = getPendingCheckins();
  const now = new Date();
  const timeZone = browserTimeZone();
  const callsLeftToday = countCallsLeftToday(
    classifyCalls(listing.bookings, { now, timeZone }),
  );

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Good morning, Coach."
        subtitle={
          <>
            <span data-parity="today-count">
              You have {callsLeftToday} assessment call
              {callsLeftToday !== 1 ? 's' : ''} today.
            </span>
            <span>
              {' '}
              {pendingCheckins.length} check-in
              {pendingCheckins.length !== 1 ? 's' : ''} to review.
            </span>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        <UpcomingAssessmentCalls
          bookings={listing.bookings}
          now={now}
          timeZone={timeZone}
        />

        {/* Pending Check-ins */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 }}
          className="bg-card p-8 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-status-pending-soft text-status-pending flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <h2 className="font-serif text-xl text-foreground font-semibold">
              Pending Check-ins
            </h2>
          </div>

          <div className="space-y-4">
            {pendingCheckins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending check-ins
              </p>
            ) : (
              pendingCheckins.map((checkin) => (
                <DashboardAppointmentRow
                  key={checkin.id}
                  attendeeName={checkin.clientName}
                  when={{
                    date: formatCheckinDate(checkin.date),
                    time: formatCheckinTime(checkin.time),
                  }}
                  action={
                    <RowActionLink to="/coach/checkins">Review</RowActionLink>
                  }
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Active Clients Table */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
        className="bg-card p-8 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center">
              <User size={20} />
            </div>
            <h2 className="font-serif text-xl text-foreground font-semibold">
              Active Clients
            </h2>
          </div>
          <Link
            to="/coach/clients"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="-mx-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Cycle phase</TableHead>
                <TableHead>Primary goal</TableHead>
                {isPostMvp && <TableHead>Compliance</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CLIENTS.map((client) => (
                <ActiveClientRow
                  key={client.id}
                  client={client}
                  showsCompliance={isPostMvp}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
