import type { MeasurementEntry } from "../measurement";

import type { MeasurementRecord } from "./measurement-history";

export interface ClientMeasurementRecords {
  listByClientId(clientId: string): Promise<MeasurementRecord[]>;
  record(clientId: string, entry: MeasurementEntry): Promise<string>;
}
