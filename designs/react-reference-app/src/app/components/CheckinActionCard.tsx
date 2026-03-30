import { motion } from 'motion/react';
import { CalendarPlus, CalendarDays, Clock, RefreshCw } from 'lucide-react';
import { type CheckIn, MAX_RESCHEDULES } from '../context/CheckinContext';
import { formatCheckinDate, formatCheckinTime } from '../utils/dateFormatters';

const CLIENT_AVATARS: Record<string, string | null> = {
  c1: 'https://i.pravatar.cc/150?img=47',
  c2: 'https://i.pravatar.cc/150?img=45',
  c3: null,
  c4: null,
  c5: null,
};

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
  const avatar = CLIENT_AVATARS[checkin.clientId];

  const proposerLabel = checkin.proposedBy === 'coach' ? 'Coach' : checkin.clientName;
  const headerLabel = isRescheduling ? 'Reschedule Proposal' : 'Check-in Request';
  const headerColor = isRescheduling ? '#C81D6B' : '#FF7A45';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-start"
    >
      <div className={`max-w-[85%] p-5 rounded-2xl border-2 rounded-bl-sm ${
        isRescheduling
          ? 'border-[#C81D6B]/30 bg-[#C81D6B]/5'
          : 'border-[#FF7A45]/30 bg-[#FF7A45]/5'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isRescheduling ? (
            <RefreshCw size={16} className="text-[#C81D6B]" />
          ) : (
            <CalendarPlus size={16} style={{ color: headerColor }} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: headerColor }}>
            {headerLabel}
          </span>
        </div>

        {/* Who proposed */}
        <div className="flex items-center gap-2 mb-2">
          {role === 'coach' && avatar ? (
            <img src={avatar} alt={checkin.clientName} className="w-6 h-6 rounded-full object-cover border border-neutral-200" />
          ) : role === 'coach' ? (
            <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-semibold">
              {checkin.clientName.charAt(0)}
            </div>
          ) : null}
          <p className="font-semibold text-sm text-[#121212]">
            {isPending && !isRescheduling
              ? `${proposerLabel} requested a check-in`
              : `${proposerLabel} proposed a new time`
            }
          </p>
        </div>

        {/* Previous time (if rescheduled) */}
        {isRescheduling && checkin.previousDate && checkin.previousTime && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 line-through mb-1">
            <CalendarDays size={12} />
            {formatCheckinDate(checkin.previousDate)} at {formatCheckinTime(checkin.previousTime)}
          </div>
        )}

        {/* Proposed time */}
        <div className="flex items-center gap-3 text-sm text-neutral-600 mb-1">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatCheckinDate(checkin.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {formatCheckinTime(checkin.time)}
          </span>
        </div>

        {/* Reschedule badge */}
        {checkin.rescheduleCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <RefreshCw size={11} className="text-[#C81D6B]" />
            <span className="text-[10px] font-bold text-[#C81D6B] uppercase tracking-widest">
              Reschedule {checkin.rescheduleCount} of {MAX_RESCHEDULES}
            </span>
          </div>
        )}

        {/* Note / reschedule message */}
        {(checkin.rescheduleMessage || checkin.note) && (
          <p className="text-xs text-neutral-500 italic mt-2">
            "{checkin.rescheduleMessage || checkin.note}"
          </p>
        )}

        {/* Actions */}
        {proposedByOther && (
          <div className="flex gap-2 mt-3">
            {isRescheduling ? (
              <>
                <button
                  onClick={onAcceptReschedule}
                  className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Accept
                </button>
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    className="px-4 py-2 bg-white border border-[#C81D6B]/30 text-[#C81D6B] text-xs font-semibold rounded-lg hover:bg-[#C81D6B]/5 transition-colors"
                  >
                    Reschedule
                  </button>
                )}
                <button
                  onClick={onDecline}
                  className="px-4 py-2 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onApprove}
                  className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Approve
                </button>
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    className="px-4 py-2 bg-white border border-[#C81D6B]/30 text-[#C81D6B] text-xs font-semibold rounded-lg hover:bg-[#C81D6B]/5 transition-colors"
                  >
                    Reschedule
                  </button>
                )}
                <button
                  onClick={onDecline}
                  className="px-4 py-2 bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Decline
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
