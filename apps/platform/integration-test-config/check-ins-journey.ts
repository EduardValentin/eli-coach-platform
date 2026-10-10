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

export class CheckInsJourney {
  constructor(private readonly rig: PlatformRig) {}

  openTimes(requester: Requester): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/open-times`);
  }

  async openTimesOf(session: AccountSession): Promise<string[]> {
    const response = await this.openTimes(session);

    if (response.status !== 200) {
      throw new Error(`Reading the open times answered ${response.status}.`);
    }

    return openTimesSchema.parse(await response.json()).times;
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

  withdraw(requester: Requester, checkInId: string): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/${checkInId}/withdrawal`, {
      method: "POST",
    });
  }

  approve(
    checkInId: string,
    requester: Requester = COACH_SESSION,
  ): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/${checkInId}/approval`, {
      method: "POST",
    });
  }

  decline(
    checkInId: string,
    requester: Requester = COACH_SESSION,
  ): Promise<Response> {
    return this.send(requester, `${CHECK_INS_API}/${checkInId}/decline`, {
      method: "POST",
    });
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

  heldCheckInHours(): Promise<HeldCheckInHour[]> {
    return this.rig.suite.postgres.queryRows<HeldCheckInHour>({
      sql: 'select check_in_id as "checkInId", starts_at as "startsAt", ends_at as "endsAt" from app.coach_time_reservations where check_in_id is not null order by starts_at',
      values: [],
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
