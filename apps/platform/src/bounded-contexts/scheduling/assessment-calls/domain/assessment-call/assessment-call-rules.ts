const DURATION_MINUTES = 30;
const BUFFER_MINUTES = 30;

type CallSlotRulesProps = {
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  horizonDays: number;
  leadMinutes: number;
};

export class CallSlotRules {
  readonly durationMinutes: number;
  readonly bufferMinutes: number;
  readonly stepMinutes: number;
  readonly horizonDays: number;
  readonly leadMinutes: number;

  private constructor(props: CallSlotRulesProps) {
    this.durationMinutes = props.durationMinutes;
    this.bufferMinutes = props.bufferMinutes;
    this.stepMinutes = props.stepMinutes;
    this.horizonDays = props.horizonDays;
    this.leadMinutes = props.leadMinutes;
  }

  static of(props: CallSlotRulesProps): CallSlotRules {
    return new CallSlotRules(props);
  }
}

export const ASSESSMENT_CALL_RULES = CallSlotRules.of({
  durationMinutes: DURATION_MINUTES,
  bufferMinutes: BUFFER_MINUTES,
  stepMinutes: DURATION_MINUTES + BUFFER_MINUTES,
  horizonDays: 30,
  leadMinutes: 120,
});
