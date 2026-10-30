import type { MeasurementEntry } from "./measurement";

export interface ClientMeasurementsSourcePort {
  listByClientId(clientId: string): Promise<MeasurementEntry[]>;
}
