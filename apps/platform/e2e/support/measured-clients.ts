import {
  UnitPreference,
  type MeasurementSystem,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import type pg from "pg";

import type { PaidClientIdentity } from "./paid-clients";
import {
  insertUnmeasuredSubmittedClientRecords,
  recordAnswersApproved,
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
    id, client_id, recorded_at, weight_kg, waist_cm, hips_cm, thigh_cm, arm_cm
  )
  values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
`;
const SAVE_UNIT_PREFERENCE = `
  update app.client_settings
  set weight_unit = $2, height_unit = $3, updated_at = now()
  where client_id = $1
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

  await recordAnswersApproved(pool, client);
  await pool.query(SAVE_UNIT_PREFERENCE, [
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
