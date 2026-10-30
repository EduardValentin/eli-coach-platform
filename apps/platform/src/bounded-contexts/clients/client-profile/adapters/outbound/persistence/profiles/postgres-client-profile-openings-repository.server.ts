import type { DatabaseClient } from "~/shared/database";
import type { ClientProfileOpeningsPort } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import {
  type ClientMoment,
  openClientProfile,
} from "./client-profile-writers.server";

export class PostgresClientProfileOpeningsRepository implements ClientProfileOpeningsPort {
  constructor(private readonly database: DatabaseClient) {}

  open(admission: ClientMoment): Promise<void> {
    return openClientProfile(this.database, admission);
  }
}
