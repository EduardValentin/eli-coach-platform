import {
  UnitPreference,
  type MeasurementSystem,
} from "@eli-coach-platform/domain/unit-preference";
import type pg from "pg";

import type { PaidClientIdentity } from "./paid-clients";
import {
  insertUnmeasuredSubmittedClientRecords,
  type PhotoConsentAtOnboarding,
  type SubmittedClient,
} from "./submitted-clients";

export type MeasurementValues = {
  weightKg: number;
  waistCm: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export type MeasurementEntrySeed = {
  recordedAt: Date;
  values: MeasurementValues;
};

export type MeasuredClientSeed = {
  entries: readonly MeasurementEntrySeed[];
  system: MeasurementSystem;
  photoConsent: PhotoConsentAtOnboarding;
};

const INSERT_MEASUREMENT_ENTRY = `
  insert into app.client_measurements (
    client_id, recorded_at, weight_kg, waist_cm, hips_cm, thigh_cm, arm_cm
  )
  values ($1, $2, $3, $4, $5, $6, $7)
`;
const INSERT_UNIT_PREFERENCE = `
  insert into app.client_unit_preferences (
    client_id, weight_unit, height_unit, updated_at
  )
  values ($1, $2, $3, now())
`;

export async function insertMeasuredClientRecords(
  pool: pg.Pool,
  identity: PaidClientIdentity,
  seed: MeasuredClientSeed,
): Promise<SubmittedClient> {
  const client = await insertUnmeasuredSubmittedClientRecords(
    pool,
    identity,
    seed.photoConsent,
  );
  const units = UnitPreference.of(seed.system).toSnapshot();

  await pool.query(INSERT_UNIT_PREFERENCE, [
    client.clientId,
    units.weightUnit,
    units.heightUnit,
  ]);
  await insertMeasurementEntries(pool, client.clientId, seed.entries);

  return client;
}

export async function insertMeasurementEntries(
  pool: pg.Pool,
  clientId: string,
  entries: readonly MeasurementEntrySeed[],
): Promise<void> {
  for (const { recordedAt, values } of entries) {
    await pool.query(INSERT_MEASUREMENT_ENTRY, [
      clientId,
      recordedAt,
      values.weightKg,
      values.waistCm,
      values.hipsCm ?? null,
      values.thighCm ?? null,
      values.armCm ?? null,
    ]);
  }
}
