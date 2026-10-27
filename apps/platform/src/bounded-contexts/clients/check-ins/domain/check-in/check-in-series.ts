import { CheckIn } from "./check-in";
import { CHECK_IN_RULES, type CheckInSlotRules } from "./check-in-rules";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import {
  CheckInSeriesRule,
  type CheckInSeriesRuleSnapshot,
} from "./check-in-series-rule";
import type { CoachTimeSpan } from "./coach-time";
import type { Weekday } from "./weekdays";

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

export type CheckInSeriesOccurrence = {
  checkIn: CheckIn;
  availability: "open" | "closed";
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
  lead: CheckInSlotRules;
};

type CheckInSeriesWeeks = {
  starts: readonly Date[];
  clientTimeZone: string;
  availability: CheckInSeriesOccurrence["availability"];
  at: Date;
  newId: () => string;
};

type BusyBesideOwnWeeks = {
  busy: readonly CoachTimeSpan[];
  weeks: readonly CheckIn[];
  at: Date;
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

  nextWeekStartFrom(at: Date): Date {
    return this.rule().nextStartFrom(at);
  }

  missingOccurrencesFor(bounds: CheckInSeriesBounds): CheckInSeriesStarts {
    const cover = this.cover();
    const starts = this.rule()
      .startsBetween(bounds)
      .filter((start) => !cover.holds(start));

    if (starts.length === 0) {
      return { series: this, starts };
    }

    const widened = cover.spanning(bounds);

    return {
      series: this.with({
        coversFrom: widened.from,
        coversUntil: widened.until,
      }),
      starts,
    };
  }

  changedTo({ rule, now, lead }: CheckInSeriesChange): CheckInSeriesStarts {
    return {
      series: this.with({ ...rule.toSnapshot(), changedAt: now }),
      starts: rule.startsBetween(
        this.cover().notBefore(
          new Date(now.getTime() + lead.leadMilliseconds()),
        ),
      ),
    };
  }

  occurrencesAt(weeks: CheckInSeriesWeeks): CheckInSeriesOccurrence[] {
    return weeks.starts.map((startsAt) => ({
      checkIn: CheckIn.seriesOccurrence({
        id: weeks.newId(),
        seriesId: this.id,
        clientId: this.clientId,
        startsAt,
        clientTimeZone: weeks.clientTimeZone,
        coachTimeZone: this.timeZone,
        at: weeks.at,
      }),
      availability: weeks.availability,
    }));
  }

  busyBesideOwnWeeks({ busy, weeks, at }: BusyBesideOwnWeeks): CoachTimeSpan[] {
    const held = weeks
      .filter((week) => week.seriesId === this.id && week.holdsCoachTimeAt(at))
      .map((week) => CHECK_IN_RULES.coachTimeFrom(week.startsAt));

    return busy.filter(
      (interval) =>
        !held.some(
          (own) =>
            own.start.getTime() === interval.start.getTime() &&
            own.end.getTime() === interval.end.getTime(),
        ),
    );
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

  private cover(): CheckInSeriesBounds {
    return CheckInSeriesBounds.of({
      from: this.coversFrom,
      until: this.coversUntil,
    });
  }

  private with(changes: Partial<CheckInSeriesSnapshot>): CheckInSeries {
    return new CheckInSeries({ ...this.toSnapshot(), ...changes });
  }
}
