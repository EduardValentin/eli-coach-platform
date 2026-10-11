import { z } from "zod";

import {
  COACH_SESSION,
  type AccountSession,
  type PlatformRig,
} from "./platform-rig";

export const SIGNED_OUT = "signed-out";

type Requester = AccountSession | typeof SIGNED_OUT;

export type CheckInAsk = {
  startsAt: string;
  timeZone?: string;
  note?: string | null;
};

export type CheckInSchedule = {
  clientId: string;
  startsAt: string;
  note?: string | null;
};

export type CheckInAnswer = { timeZone?: string };

export type CheckInNewTime = {
  startsAt: string;
  note?: string | null;
  timeZone?: string;
};

export type CheckInRow = {
  id: string;
  clientId: string;
  startsAt: Date;
  clientTimeZone: string;
  coachTimeZone: string;
  kind: string;
  status: string;
  initiatedBy: string;
  proposedBy: string;
  note: string | null;
  requestedAt: Date;
  answeredAt: Date | null;
};

export type MovedCheckInRow = {
  status: string;
  startsAt: Date;
  earlierStartsAt: Date | null;
  moves: number;
  newTimeNote: string | null;
  proposedBy: string;
  clientTimeZone: string;
  answeredAt: Date | null;
};

export type HeldCheckInHour = {
  checkInId: string;
  startsAt: Date;
  endsAt: Date;
};

const CHECK_INS_API = "/api/check-ins";
const SETTINGS_API = "/api/coach-schedule/settings";
const CLIENT_TIME_ZONE = "Europe/London";

const COACH_DEFAULT_AVAILABILITY = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
};

const openTimesSchema = z.object({ times: z.array(z.string()) });
const requestedSchema = z.object({
  status: z.literal("requested"),
  checkInId: z.uuid(),
});
const scheduledSchema = z.object({
  status: z.literal("scheduled"),
  checkInId: z.uuid(),
});

export class CheckInsJourney {
  constructor(private readonly rig: PlatformRig) {}

  openTimes(requester: Requester): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/open-times`);
  }

  openTimesFor(requester: Requester, clientId: string): Promise<Response> {
    return this.send(
      requester,
      `${CHECK_INS_API}/open-times?${new URLSearchParams({ clientId })}`,
    );
  }

  async openTimesOf(session: AccountSession): Promise<string[]> {
    return this.timesOf(await this.openTimes(session));
  }

  async openTimesOfClient(clientId: string): Promise<string[]> {
    return this.timesOf(await this.openTimesFor(COACH_SESSION, clientId));
  }

  request(requester: Requester, ask: CheckInAsk): Promise<Response> {
    return this.send(requester, CHECK_INS_API, {
      body: JSON.stringify({ timeZone: CLIENT_TIME_ZONE, ...ask }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  async requested(session: AccountSession, ask: CheckInAsk): Promise<string> {
    const response = await this.request(session, ask);

    if (response.status !== 201) {
      throw new Error(
        `Asking for a check-in answered ${response.status}: ${await response.text()}`,
      );
    }

    return requestedSchema.parse(await response.json()).checkInId;
  }

  schedule(requester: Requester, schedule: CheckInSchedule): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/schedule`, {
      body: JSON.stringify(schedule),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  async scheduled(schedule: CheckInSchedule): Promise<string> {
    const response = await this.schedule(COACH_SESSION, schedule);

    if (response.status !== 201) {
      throw new Error(
        `Scheduling a check-in answered ${response.status}: ${await response.text()}`,
      );
    }

    return scheduledSchema.parse(await response.json()).checkInId;
  }

  withdraw(
    requester: Requester,
    checkInId: string,
    answer?: CheckInAnswer,
  ): Promise<Response> {
    return this.answer(requester, `${checkInId}/withdrawal`, answer);
  }

  approve(
    checkInId: string,
    requester: Requester = COACH_SESSION,
    answer?: CheckInAnswer,
  ): Promise<Response> {
    return this.answer(requester, `${checkInId}/approval`, answer);
  }

  decline(
    checkInId: string,
    requester: Requester = COACH_SESSION,
    answer?: CheckInAnswer,
  ): Promise<Response> {
    return this.answer(requester, `${checkInId}/decline`, answer);
  }

  proposeNewTime(
    requester: Requester,
    checkInId: string,
    newTime: CheckInNewTime,
  ): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/${checkInId}/new-time`, {
      body: JSON.stringify(newTime),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  async proposedNewTime(
    requester: AccountSession,
    checkInId: string,
    newTime: CheckInNewTime,
  ): Promise<void> {
    const response = await this.proposeNewTime(requester, checkInId, newTime);

    if (response.status !== 200) {
      throw new Error(
        `Proposing a new time answered ${response.status}: ${await response.text()}`,
      );
    }
  }

  cancel(
    requester: Requester,
    checkInId: string,
    answer?: CheckInAnswer,
  ): Promise<Response> {
    return this.answer(requester, `${checkInId}/cancellation`, answer);
  }

  async approved(checkInId: string): Promise<void> {
    const response = await this.approve(checkInId);

    if (response.status !== 200) {
      throw new Error(`Approving the check-in answered ${response.status}.`);
    }
  }

  joinAsClient(requester: Requester, checkInId: string): Promise<Response> {
    return this.send(requester, `/client/checkins/${checkInId}/join`);
  }

  joinAsCoach(requester: Requester, checkInId: string): Promise<Response> {
    return this.send(requester, `/coach/checkins/${checkInId}/join`);
  }

  async saveMeetingRoom(meetingLink: string): Promise<void> {
    const response = await this.rig.requestAs(COACH_SESSION, SETTINGS_API, {
      body: JSON.stringify({ ...COACH_DEFAULT_AVAILABILITY, meetingLink }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    if (response.status !== 200) {
      throw new Error(`Saving the meeting room answered ${response.status}.`);
    }
  }

  checkInRowsOf(clientId: string): Promise<CheckInRow[]> {
    return this.rig.suite.postgres.queryRows<CheckInRow>({
      sql: 'select id, client_id as "clientId", starts_at as "startsAt", client_time_zone as "clientTimeZone", coach_time_zone as "coachTimeZone", kind, status, initiated_by as "initiatedBy", proposed_by as "proposedBy", note, requested_at as "requestedAt", answered_at as "answeredAt" from app.check_ins where client_id = $1 order by starts_at',
      values: [clientId],
    });
  }

  allCheckInRows(): Promise<CheckInRow[]> {
    return this.rig.suite.postgres.queryRows<CheckInRow>({
      sql: 'select id, client_id as "clientId", starts_at as "startsAt", client_time_zone as "clientTimeZone", coach_time_zone as "coachTimeZone", kind, status, initiated_by as "initiatedBy", proposed_by as "proposedBy", note, requested_at as "requestedAt", answered_at as "answeredAt" from app.check_ins order by starts_at',
      values: [],
    });
  }

  async movedRowOf(checkInId: string): Promise<MovedCheckInRow> {
    const [row] = await this.rig.suite.postgres.queryRows<MovedCheckInRow>({
      sql: 'select status, starts_at as "startsAt", earlier_starts_at as "earlierStartsAt", moves, new_time_note as "newTimeNote", proposed_by as "proposedBy", client_time_zone as "clientTimeZone", answered_at as "answeredAt" from app.check_ins where id = $1',
      values: [checkInId],
    });

    if (!row) {
      throw new Error(`No check-in ${checkInId} is stored.`);
    }

    return row;
  }

  heldCheckInHours(): Promise<HeldCheckInHour[]> {
    return this.rig.suite.postgres.queryRows<HeldCheckInHour>({
      sql: 'select check_in_id as "checkInId", starts_at as "startsAt", ends_at as "endsAt" from app.coach_time_reservations where check_in_id is not null order by starts_at',
      values: [],
    });
  }

  private async timesOf(response: Response): Promise<string[]> {
    if (response.status !== 200) {
      throw new Error(`Reading the open times answered ${response.status}.`);
    }

    return openTimesSchema.parse(await response.json()).times;
  }

  private answer(
    requester: Requester,
    target: string,
    answer: CheckInAnswer | undefined,
  ): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/${target}`, {
      ...(answer && {
        body: JSON.stringify(answer),
        headers: { "Content-Type": "application/json" },
      }),
      method: "POST",
    });
  }

  private send(
    requester: Requester,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (requester === SIGNED_OUT) {
      return this.rig.suite.request(
        new Request(this.rig.suite.url(target), init),
      );
    }

    return this.rig.requestAs(requester, target, init);
  }
}
