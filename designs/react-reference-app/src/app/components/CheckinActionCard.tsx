import { motion } from 'motion/react';
import { CalendarPlus, CalendarDays, Clock, RefreshCw } from 'lucide-react';
import { type CheckIn, MAX_RESCHEDULES } from '../context/CheckinContext';
import { formatCheckinDate, formatCheckinTime } from '../utils/dateFormatters';

interface CheckinActionCardProps {
  checkin: CheckIn;
  role: 'coach' | 'client';
  onApprove?: () => void;
  onDecline?: () => void;
  onReschedule?: () => void;
  onAcceptReschedule?: () => void;
}

export function CheckinActionCard({
  checkin,
  role,
  onApprove,
  onDecline,
  onReschedule,
  onAcceptReschedule,
}: CheckinActionCardProps) {
  const isRescheduling = checkin.status === 'rescheduling';
  const isPending = checkin.status === 'pending';
  const canReschedule = checkin.rescheduleCount < MAX_RESCHEDULES;
  const proposedByOther = checkin.proposedBy !== role;

  const proposerLabel = checkin.proposedBy === 'coach' ? 'Coach' : checkin.clientName;
  const headerLabel = isRescheduling ? 'Reschedule Proposal' : 'Check-in Request';
  const accentColor = isRescheduling ? 'var(--brand)' : 'var(--status-pending)';
  const HeaderIcon = isRescheduling ? RefreshCw : CalendarPlus;

  const message = checkin.rescheduleMessage || checkin.note;
  const primaryAction = isRescheduling ? onAcceptReschedule : onApprove;
  const primaryLabel = isRescheduling ? 'Accept' : 'Approve';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full sm:max-w-[85%]"
    >
      <div
        className={`rounded-2xl rounded-bl-sm border-2 p-4 space-y-2.5 ${
          isRescheduling
            ? 'border-brand/30 bg-brand/5'
            : 'border-status-pending/30 bg-status-pending/5'
        }`}
      >
        {/* Eyebrow — label + count */}
        <div className="flex items-center gap-1.5">
          <HeaderIcon size={13} style={{ color: accentColor }} aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
            {headerLabel}
            {checkin.rescheduleCount > 0 && (
              <span className="text-neutral-400 font-medium ml-1.5">
                · {checkin.rescheduleCount} of {MAX_RESCHEDULES}
              </span>
            )}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm text-text-primary">
          {isPending && !isRescheduling
            ? `${proposerLabel} requested a check-in`
            : `${proposerLabel} proposed a new time`
          }
        </p>

        {/* Times */}
        <div className="space-y-0.5">
          {isRescheduling && checkin.previousDate && checkin.previousTime && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 line-through">
              <CalendarDays size={12} aria-hidden="true" />
              {formatCheckinDate(checkin.previousDate)} at {formatCheckinTime(checkin.previousTime)}
            </div>
          )}
          <div className="flex items-center gap-x-3 gap-y-0.5 text-sm font-medium text-text-primary flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" />
              {formatCheckinDate(checkin.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              {formatCheckinTime(checkin.time)}
            </span>
          </div>
        </div>

        {/* Note / reschedule message */}
        {message && (
          <p className="text-xs text-neutral-500 italic">
            &ldquo;{message}&rdquo;
          </p>
        )}

        {/* Actions */}
        {proposedByOther && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={primaryAction}
              className="flex-1 sm:flex-none min-h-10 px-3 bg-text-primary text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
            >
              {primaryLabel}
            </button>
            {canReschedule && (
              <button
                type="button"
                onClick={onReschedule}
                className="flex-1 sm:flex-none min-h-10 px-3 bg-white border border-brand/30 text-brand text-xs font-semibold rounded-lg hover:bg-brand/5 transition-colors"
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              onClick={onDecline}
              className="flex-1 sm:flex-none min-h-10 px-3 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
