import type { ClockPort } from "../clock-port";

import {
  ClientToday,
  type ClientCountries,
  type ClientGender,
} from "./client-details";
import { type CalendarDatesPort } from "./calendar-dates-port";
import type { ClientIdentityChangesPort } from "./client-identity-changes-port";
import {
  ClientIdentityEdit,
  type ClientIdentityProblems,
  type EditableClientIdentity,
} from "./client-identity-edit";
import type { ClientReachPort } from "./client-reach-port";

type UpdateClientIdentityAsCoachCommand = {
  clientId: string;
  identity: EditableClientIdentity & { gender: ClientGender };
};

type UpdateClientIdentityAsCoachResult =
  | { status: "saved" }
  | { status: "not-found" }
  | { status: "invalid"; problems: ClientIdentityProblems };

type UpdateClientIdentityAsCoachUseCaseOptions = {
  clients: Pick<ClientReachPort, "findById">;
  changes: ClientIdentityChangesPort;
  calendar: CalendarDatesPort;
  clock: ClockPort;
  countries: ClientCountries;
};

export class UpdateClientIdentityAsCoachUseCase {
  constructor(
    private readonly options: UpdateClientIdentityAsCoachUseCaseOptions,
  ) {}

  async execute(
    command: UpdateClientIdentityAsCoachCommand,
  ): Promise<UpdateClientIdentityAsCoachResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "not-found" };
    }

    const result = ClientIdentityEdit.of(
      { ...command.identity, clientId: client.clientId },
      ClientToday.on(
        { on: this.options.clock.now(), timeZone: client.timeZone },
        this.options.calendar,
      ),
      this.options.countries,
    );

    if (result.status === "invalid") {
      return result;
    }

    await this.options.changes.save(result.edit);

    return { status: "saved" };
  }
}
