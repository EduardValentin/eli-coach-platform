import { and, eq, isNull } from "drizzle-orm";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  ClientProfile,
  type CoachingSeed,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { ClientSettings } from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import {
  clientProfilesTable,
  clientSettingsTable,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";
import { coachingColumnsOf } from "./coaching-columns.server";

export type ClientMoment = { clientId: string; at: Date };

type CoachingSeeding = ClientMoment & { seed: CoachingSeed };

export async function openClientProfile(
  database: DatabaseClient,
  admission: ClientMoment,
): Promise<void> {
  const opening = { clientId: admission.clientId, now: admission.at };
  const { coaching: _coaching, ...profile } =
    ClientProfile.opened(opening).toSnapshot();
  const { unitPreference, ...settings } =
    ClientSettings.opened(opening).toSnapshot();

  await executorOf(database).insert(clientProfilesTable).values(profile);
  await executorOf(database)
    .insert(clientSettingsTable)
    .values({ ...settings, ...unitPreference });
}
export async function recordPhotoConsent(
  database: DatabaseClient,
  consent: ClientMoment,
): Promise<void> {
  await executorOf(database)
    .update(clientProfilesTable)
    .set({ progressPhotosConsentedAt: consent.at })
    .where(eq(clientProfilesTable.clientId, consent.clientId));
}
export async function seedCoaching(
  database: DatabaseClient,
  seeding: CoachingSeeding,
): Promise<void> {
  const { clientId, seed, at } = seeding;
  const seeded = await executorOf(database)
    .update(clientProfilesTable)
    .set({
      ...coachingColumnsOf(seed.coaching),
      coachingSeededAt: at,
      updatedAt: at,
    })
    .where(
      and(
        eq(clientProfilesTable.clientId, clientId),
        isNull(clientProfilesTable.coachingSeededAt),
      ),
    )
    .returning({ clientId: clientProfilesTable.clientId });

  if (seeded.length === 0) {
    return;
  }

  await executorOf(database)
    .update(clientSettingsTable)
    .set({ ...seed.preferences, updatedAt: at })
    .where(eq(clientSettingsTable.clientId, clientId));
}
