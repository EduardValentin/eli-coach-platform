import type { ClockPort } from "../clock-port";

import { ClientToday, type ClientCountries } from "./client-details";
import { type CalendarDatesPort } from "./calendar-dates-port";
import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientIdentityChangesPort } from "./client-identity-changes-port";
import {
  ClientIdentityEdit,
  type ClientIdentityProblems,
  type EditableClientIdentity,
} from "./client-identity-edit";
import type { ClientReachPort } from "./client-reach-port";

type UpdateOwnClientIdentityCommand = {
  authSubjectId: string;
  identity: EditableClientIdentity;
};

type UpdateOwnClientIdentityResult =
  | { status: "saved" }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "invalid"; problems: ClientIdentityProblems };

type UpdateOwnClientIdentityUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientId">;
  clientIdentityChangesPort: ClientIdentityChangesPort;
  calendarDatesPort: CalendarDatesPort;
  clockPort: ClockPort;
  countries: ClientCountries;
};

export class UpdateOwnClientIdentityUseCase {
  constructor(
    private readonly options: UpdateOwnClientIdentityUseCaseOptions,
  ) {}

  async execute(
    command: UpdateOwnClientIdentityCommand,
  ): Promise<UpdateOwnClientIdentityResult> {
    const client = await this.options.clientReachPort.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const current = await this.options.clientIdentitiesPort.findByClientId(
      client.clientId,
    );

    if (!current) {
      return { status: "not-on-journey" };
    }

    const result = ClientIdentityEdit.of(
      {
        ...command.identity,
        clientId: client.clientId,
        gender: current.gender,
      },
      ClientToday.on(
        { on: this.options.clockPort.now(), timeZone: client.timeZone },
        this.options.calendarDatesPort,
      ),
      this.options.countries,
    );

    if (result.status === "invalid") {
      return result;
    }

    await this.options.clientIdentityChangesPort.save(result.edit);

    return { status: "saved" };
  }
}
