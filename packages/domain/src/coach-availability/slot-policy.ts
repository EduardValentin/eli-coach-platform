import type { TimeInterval } from "./time-interval";

type SlotPolicyProps = {
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  horizonDays: number;
  leadMinutes: number;
};

const MILLISECONDS_PER_MINUTE = 60_000;

export class SlotPolicy {
  readonly durationMinutes: number;
  readonly bufferMinutes: number;
  readonly stepMinutes: number;
  readonly horizonDays: number;
  readonly leadMinutes: number;

  private constructor(props: SlotPolicyProps) {
    this.durationMinutes = props.durationMinutes;
    this.bufferMinutes = props.bufferMinutes;
    this.stepMinutes = props.stepMinutes;
    this.horizonDays = props.horizonDays;
    this.leadMinutes = props.leadMinutes;
  }

  static of(props: SlotPolicyProps): SlotPolicy {
    assertWholeCounts(props);
    assertStepFitsTheCall(props);

    return new SlotPolicy(props);
  }

  coachTimeFrom(start: Date): TimeInterval {
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

function isWholeCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function assertWholeCounts(props: SlotPolicyProps): void {
  const whole =
    Object.values(props).every(isWholeCount) && props.durationMinutes > 0;

  if (!whole) {
    throw new Error(
      "A slot policy needs a positive whole-minute duration and whole, non-negative buffer, step, horizon and lead.",
    );
  }
}

function assertStepFitsTheCall(props: SlotPolicyProps): void {
  if (props.stepMinutes < props.durationMinutes) {
    throw new Error(
      "A slot policy's step must be at least as long as the call, so offered starts never overlap.",
    );
  }
}
