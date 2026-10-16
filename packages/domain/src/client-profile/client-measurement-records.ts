import type { MeasurementEntry } from "../measurement";

import type { MeasurementRecord } from "./measurement-history";

export type ClientMeasurementEntry = {
  clientId: string;
  entryId: string;
  entry: MeasurementEntry;
};

export interface ClientMeasurementRecords {
  listByClientId(clientId: string): Promise<MeasurementRecord[]>;
  record(input: ClientMeasurementEntry): Promise<void>;
}
