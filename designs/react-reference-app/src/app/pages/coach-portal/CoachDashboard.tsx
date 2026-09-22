import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion, useReducedMotion } from 'motion/react';
import { ClipboardCheck, ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router';
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
  { id: 'c1', name: 'Jane Doe', phase: 'Luteal', goal: 'Recomp', compliance: '95%' },
  { id: 'c2', name: 'Jessica Alba', phase: 'Follicular', goal: 'Fat Loss', compliance: '88%' },
  { id: 'c3', name: 'Emma Stone', phase: 'Ovulatory', goal: 'Hypertrophy', compliance: '100%' },
];

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
              You have {callsLeftToday} assessment call{callsLeftToday !== 1 ? 's' : ''} today.
            </span>
            <span> {pendingCheckins.length} check-in{pendingCheckins.length !== 1 ? 's' : ''} to review.</span>
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
            <h2 className="font-serif text-xl text-foreground font-semibold">Pending Check-ins</h2>
          </div>

          <div className="space-y-4">
            {pendingCheckins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending check-ins</p>
            ) : (
              pendingCheckins.map(checkin => (
                <DashboardAppointmentRow
                  key={checkin.id}
                  attendeeName={checkin.clientName}
                  when={{
                    date: formatCheckinDate(checkin.date),
                    time: formatCheckinTime(checkin.time),
                  }}
                  action={
                    <Link to="/coach/checkins" className="px-4 py-2 bg-card border border-border text-foreground text-xs font-semibold rounded-control hover:bg-muted transition-colors">
                      Review
                    </Link>
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
            <h2 className="font-serif text-xl text-foreground font-semibold">Active Clients</h2>
          </div>
          <button className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="px-3 border-b border-border rounded-field">
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Name</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycle Phase</th>
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Goal</th>
                {isPostMvp && (
                  <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compliance</th>
                )}
                <th className="pb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CLIENTS.map(client => (
                <tr key={client.id} className="px-3 border-b border-neutral-50 rounded-field hover:bg-muted/50 transition-colors group">
                  <td className="py-4 font-semibold text-sm text-foreground">{client.name}</td>
                  <td className="py-4 text-sm text-muted-foreground">{client.phase}</td>
                  <td className="py-4 text-sm text-muted-foreground">{client.goal}</td>
                  {isPostMvp && <td className="py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-field bg-success-soft text-success text-xs font-bold">
                      {client.compliance}
                    </span>
                  </td>}
                  <td className="py-4 text-right">
                    <Link 
                      to={`/coach/clients/${client.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border text-muted-foreground group-hover:bg-surface-inverted group-hover:text-white group-hover:border-surface-inverted transition-all"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
