import type { SlotPolicy, Weekday } from "../coach-availability";

import {
  CheckInSeriesRule,
  type CheckInSeriesBounds,
  type CheckInSeriesRuleSnapshot,
} from "./check-in-series-rule";

export type CheckInSeriesSnapshot = CheckInSeriesRuleSnapshot & {
  id: string;
  clientId: string;
  coversFrom: Date;
  coversUntil: Date;
  setUpAt: Date;
  changedAt: Date | null;
  stoppedAt: Date | null;
};

export type CheckInSeriesStarts = { series: CheckInSeries; starts: Date[] };

type CheckInSeriesReading = {
  now: Date;
  lead: SlotPolicy;
  programStartsAt: Date;
  paidThrough: Date;
  coachingEndsAt: Date | null;
};

type CheckInSeriesSetUp = {
  id: string;
  clientId: string;
  rule: CheckInSeriesRule;
  bounds: CheckInSeriesBounds;
  at: Date;
};

type CheckInSeriesChange = {
  rule: CheckInSeriesRule;
  now: Date;
  lead: SlotPolicy;
};

export class CheckInSeries {
  readonly id: string;
  readonly clientId: string;
  readonly weekday: Weekday;
  readonly hour: number;
  readonly timeZone: string;
  readonly coversFrom: Date;
  readonly coversUntil: Date;
  readonly setUpAt: Date;
  readonly changedAt: Date | null;
  readonly stoppedAt: Date | null;

  private constructor(snapshot: CheckInSeriesSnapshot) {
    this.id = snapshot.id;
    this.clientId = snapshot.clientId;
    this.weekday = snapshot.weekday;
    this.hour = snapshot.hour;
    this.timeZone = snapshot.timeZone;
    this.coversFrom = snapshot.coversFrom;
    this.coversUntil = snapshot.coversUntil;
    this.setUpAt = snapshot.setUpAt;
    this.changedAt = snapshot.changedAt;
    this.stoppedAt = snapshot.stoppedAt;
  }

  static reconstitute(snapshot: CheckInSeriesSnapshot): CheckInSeries {
    return new CheckInSeries(snapshot);
  }

  static boundsFor(
    reading: CheckInSeriesReading,
  ): CheckInSeriesBounds | "nothing_to_create" {
    const { now, lead, programStartsAt, paidThrough, coachingEndsAt } = reading;
    const from = latestOf(
      new Date(now.getTime() + lead.leadMilliseconds()),
      programStartsAt,
    );
    const until =
      coachingEndsAt === null
        ? paidThrough
        : earliestOf(paidThrough, coachingEndsAt);

    return from < until ? { from, until } : "nothing_to_create";
  }

  static setUp({
    id,
    clientId,
    rule,
    bounds,
    at,
  }: CheckInSeriesSetUp): CheckInSeriesStarts {
    return {
      series: new CheckInSeries({
        id,
        clientId,
        ...rule.toSnapshot(),
        coversFrom: bounds.from,
        coversUntil: bounds.until,
        setUpAt: at,
        changedAt: null,
        stoppedAt: null,
      }),
      starts: rule.startsBetween(bounds),
    };
  }

  occurrenceStartsBetween(bounds: CheckInSeriesBounds): Date[] {
    return this.rule().startsBetween(bounds);
  }

  missingOccurrencesFor(bounds: CheckInSeriesBounds): CheckInSeriesStarts {
    const starts = this.occurrenceStartsBetween(bounds).filter(
      (start) => start < this.coversFrom || start >= this.coversUntil,
    );

    if (starts.length === 0) {
      return { series: this, starts };
    }

    return {
      series: this.with({
        coversFrom: earliestOf(this.coversFrom, bounds.from),
        coversUntil: latestOf(this.coversUntil, bounds.until),
      }),
      starts,
    };
  }

  changedTo({ rule, now, lead }: CheckInSeriesChange): CheckInSeriesStarts {
    const from = latestOf(
      new Date(now.getTime() + lead.leadMilliseconds()),
      this.coversFrom,
    );

    return {
      series: this.with({ ...rule.toSnapshot(), changedAt: now }),
      starts: rule.startsBetween({ from, until: this.coversUntil }),
    };
  }

  stop(at: Date): CheckInSeries {
    return this.with({ stoppedAt: at });
  }

  isStopped(): boolean {
    return this.stoppedAt !== null;
  }

  toSnapshot(): CheckInSeriesSnapshot {
    return {
      id: this.id,
      clientId: this.clientId,
      weekday: this.weekday,
      hour: this.hour,
      timeZone: this.timeZone,
      coversFrom: this.coversFrom,
      coversUntil: this.coversUntil,
      setUpAt: this.setUpAt,
      changedAt: this.changedAt,
      stoppedAt: this.stoppedAt,
    };
  }

  private rule(): CheckInSeriesRule {
    return CheckInSeriesRule.of({
      weekday: this.weekday,
      hour: this.hour,
      timeZone: this.timeZone,
    });
  }

  private with(changes: Partial<CheckInSeriesSnapshot>): CheckInSeries {
    return new CheckInSeries({ ...this.toSnapshot(), ...changes });
  }
}

function latestOf(left: Date, right: Date): Date {
  return left > right ? left : right;
}

function earliestOf(left: Date, right: Date): Date {
  return left < right ? left : right;
}
