import type { MeasurementEntry } from "./measurement";

export interface ClientMeasurementsSource {
  listByClientId(clientId: string): Promise<MeasurementEntry[]>;
}
