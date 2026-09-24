import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ArrowRight, ClipboardCheck, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { PortalWidget } from '../../components/PortalWidget';
import { RowActionLink } from '../../components/RowActionButton';
import { buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
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
import { browserTimeZone, checkinInstant } from '../../utils/dateFormatters';

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
  const actionLabel = `View details for ${client.name}`;

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
      <TableCell>
        <div className="flex items-center justify-end">
          <Link
            to={detailPath}
            aria-label={actionLabel}
            title={actionLabel}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'opacity-0 hover:bg-text-primary hover:text-white hover:border-text-primary group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CoachDashboard() {
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

        <PortalWidget
          presentation="coach"
          title="Pending Check-ins"
          icon={
            <ClipboardCheck
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="pending-checkins-heading"
        >
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
                    startsAt: checkinInstant(checkin.date, checkin.time),
                    timeZone,
                  }}
                  action={
                    <RowActionLink
                      to="/coach/checkins"
                      icon={ClipboardCheck}
                      tone="primary"
                    >
                      Review
                    </RowActionLink>
                  }
                />
              ))
            )}
          </div>
        </PortalWidget>
      </div>

      <PortalWidget
        presentation="coach"
        title="Active Clients"
        icon={
          <Users
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        headingId="active-clients-heading"
        action={
          <Link
            to="/coach/clients"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        }
      >
        <div className="-mx-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Cycle phase</TableHead>
                <TableHead>Primary goal</TableHead>
                {isPostMvp && <TableHead>Compliance</TableHead>}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
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
      </PortalWidget>
    </div>
  );
}
