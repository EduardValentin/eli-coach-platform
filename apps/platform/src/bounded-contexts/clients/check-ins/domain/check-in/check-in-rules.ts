import type { CoachTimeSpan } from "./coach-time";

type CheckInSlotRulesProps = {
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  horizonDays: number;
  leadMinutes: number;
};

const MILLISECONDS_PER_MINUTE = 60_000;
const ONE_HOUR_IN_MINUTES = 60;
const ONE_DAY_IN_MINUTES = 24 * ONE_HOUR_IN_MINUTES;

export class CheckInSlotRules {
  readonly durationMinutes: number;
  readonly bufferMinutes: number;
  readonly stepMinutes: number;
  readonly horizonDays: number;
  readonly leadMinutes: number;

  private constructor(props: CheckInSlotRulesProps) {
    this.durationMinutes = props.durationMinutes;
    this.bufferMinutes = props.bufferMinutes;
    this.stepMinutes = props.stepMinutes;
    this.horizonDays = props.horizonDays;
    this.leadMinutes = props.leadMinutes;
  }

  static of(props: CheckInSlotRulesProps): CheckInSlotRules {
    return new CheckInSlotRules(props);
  }

  coachTimeFrom(start: Date): CoachTimeSpan {
    const heldMinutes = this.durationMinutes + this.bufferMinutes;

    return {
      start,
      end: new Date(start.getTime() + heldMinutes * MILLISECONDS_PER_MINUTE),
    };
  }

  leadMilliseconds(): number {
    return this.leadMinutes * MILLISECONDS_PER_MINUTE;
  }
}

export const CHECK_IN_RULES = CheckInSlotRules.of({
  durationMinutes: ONE_HOUR_IN_MINUTES,
  bufferMinutes: 0,
  stepMinutes: ONE_HOUR_IN_MINUTES,
  horizonDays: 30,
  leadMinutes: ONE_DAY_IN_MINUTES,
});
