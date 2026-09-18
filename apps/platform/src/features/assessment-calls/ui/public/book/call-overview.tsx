import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";
import { Calendar as CalendarIcon, Clock, Video } from "lucide-react";
import { motion } from "motion/react";

import { formatCallDate, formatSlotTime } from "./call-display";

const COACH_AVATAR_URL =
  "https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&w=192&h=192&q=80";

export function CallOverview(props: {
  chosenCall: { startsAt: string; timeZone: string } | null;
}) {
  const { chosenCall } = props;

  return (
    <aside
      aria-label="About the call"
      className="flex w-full flex-col border-b border-stroke-faint bg-surface-quiet/50 p-8 md:w-[35%] md:border-r md:border-b-0 md:p-10"
    >
      <img
        alt="Eli"
        className="mb-6 size-24 rounded-full border border-control-border-soft object-cover shadow-sm"
        src={COACH_AVATAR_URL}
      />

      <h1 className="mb-6 text-sm font-semibold tracking-widest text-text-secondary uppercase">
        Free Assessment Call
      </h1>

      <div className="mb-8 space-y-4 font-medium text-text-secondary">
        <div className="flex items-center gap-3 text-body-md">
          <Clock aria-hidden="true" className="size-5 text-text-secondary" />
          <span>{`${ASSESSMENT_CALL_RULES.durationMinutes} min session`}</span>
        </div>
        <div className="flex items-center gap-3 text-body-md">
          <Video aria-hidden="true" className="size-5 text-text-secondary" />
          <span>Google Meet (Video)</span>
        </div>
      </div>

      <p className="text-body-md leading-relaxed font-medium text-text-secondary">
        In this session, we&apos;ll discuss your goals, current routine, past
        fitness experience, and any challenges you are facing. I will also walk
        you through how my coaching works so we can see if it&apos;s the right
        fit for you.
      </p>

      {chosenCall ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-stroke-faint bg-surface-base p-4 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="flex items-start gap-3">
            <CalendarIcon
              aria-hidden="true"
              className="mt-0.5 size-5 text-brand-primary"
            />
            <div>
              <p className="font-semibold text-text-primary">
                {formatCallDate(
                  new Date(chosenCall.startsAt),
                  chosenCall.timeZone,
                )}
              </p>
              <p className="font-medium text-brand-primary">
                {formatSlotTime(
                  new Date(chosenCall.startsAt),
                  chosenCall.timeZone,
                )}
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </aside>
  );
}
