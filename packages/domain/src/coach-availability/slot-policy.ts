import type { BusyInterval } from "./busy-interval";

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
    return new SlotPolicy(props);
  }

  coachTimeFrom(start: Date): BusyInterval {
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
