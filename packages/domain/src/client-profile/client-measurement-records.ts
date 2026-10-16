import type { MeasurementEntry } from "../measurement";

import type { MeasurementRecord } from "./measurement-history";

export interface ClientMeasurementRecords {
  listByClientId(clientId: string): Promise<MeasurementRecord[]>;
  record(input: {
    clientId: string;
    entryId: string;
    entry: MeasurementEntry;
  }): Promise<void>;
}
