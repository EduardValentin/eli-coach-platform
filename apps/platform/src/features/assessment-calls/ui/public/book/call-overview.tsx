import { joinBasePath } from "@eli-coach-platform/config";
import { ELI_PORTRAIT_PATHS } from "@eli-coach-platform/content";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/assessment-call";
import { cn } from "@eli-coach-platform/ui/lib";
import { cardVariants } from "@eli-coach-platform/ui/primitives";
import { Calendar as CalendarIcon, Clock, Video } from "lucide-react";
import { motion } from "motion/react";

import {
  formatMonthFirstDate,
  formatClockTime,
} from "~/features/assessment-calls/contracts/call-moment";

const COACH_AVATAR_URL = joinBasePath(
  import.meta.env.BASE_URL,
  ELI_PORTRAIT_PATHS.small,
);

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
        className="mb-6 size-24 rounded-full border border-control-border-soft object-cover shadow-card"
        height={96}
        src={COACH_AVATAR_URL}
        width={96}
      />

      <h1 className="mb-6 text-sm font-semibold tracking-widest text-text-secondary uppercase">
        Free Assessment Call
      </h1>

      <div className="mb-8 space-y-4 font-medium text-text-secondary">
        <div className="flex items-center gap-3 text-md">
          <Clock aria-hidden="true" className="size-5 text-text-secondary" />
          <span>{`${ASSESSMENT_CALL_RULES.durationMinutes} min session`}</span>
        </div>
        <div className="flex items-center gap-3 text-md">
          <Video aria-hidden="true" className="size-5 text-text-secondary" />
          <span>Google Meet (Video)</span>
        </div>
      </div>

      <p className="text-md leading-relaxed font-medium text-text-secondary">
        In this session, we&apos;ll discuss your goals, current routine, past
        fitness experience, and any challenges you are facing. I will also walk
        you through how my coaching works so we can see if it&apos;s the right
        fit for you.
      </p>

      {chosenCall ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(cardVariants(), "mt-8 p-4")}
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="flex items-start gap-3">
            <CalendarIcon
              aria-hidden="true"
              className="mt-0.5 size-5 text-brand-primary"
            />
            <div>
              <p className="font-semibold text-text-primary">
                {formatMonthFirstDate(
                  new Date(chosenCall.startsAt),
                  chosenCall.timeZone,
                )}
              </p>
              <p className="font-medium text-brand-primary">
                {formatClockTime(
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
