import type { DatabaseTransaction } from "~/shared/database";
import {
  ClientProfile,
  type CoachingSeed,
} from "@eli-coach-platform/domain/client-profile";
import { ClientSettings } from "@eli-coach-platform/domain/client-settings";
import { and, eq, isNull } from "drizzle-orm";

import { coachingColumnsOf } from "~/bounded-contexts/clients/client-profile/data/profiles/coaching-columns.server";
import {
  clientProfilesTable,
  clientSettingsTable,
} from "~/bounded-contexts/clients/client-profile/data/schema.server";

type ClientMoment = { clientId: string; at: Date };

type CoachingSeeding = ClientMoment & { seed: CoachingSeed };

export async function openClientProfile(
  transaction: DatabaseTransaction,
  admission: ClientMoment,
): Promise<void> {
  const opening = { clientId: admission.clientId, now: admission.at };
  const { coaching: _coaching, ...profile } =
    ClientProfile.opened(opening).toSnapshot();
  const { unitPreference, ...settings } =
    ClientSettings.opened(opening).toSnapshot();

  await transaction.insert(clientProfilesTable).values(profile);
  await transaction
    .insert(clientSettingsTable)
    .values({ ...settings, ...unitPreference });
}

export async function recordPhotoConsent(
  transaction: DatabaseTransaction,
  consent: ClientMoment,
): Promise<void> {
  await transaction
    .update(clientProfilesTable)
    .set({ progressPhotosConsentedAt: consent.at })
    .where(eq(clientProfilesTable.clientId, consent.clientId));
}

export async function seedCoaching(
  transaction: DatabaseTransaction,
  seeding: CoachingSeeding,
): Promise<void> {
  const { clientId, seed, at } = seeding;
  const seeded = await transaction
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

  await transaction
    .update(clientSettingsTable)
    .set({ ...seed.preferences, updatedAt: at })
    .where(eq(clientSettingsTable.clientId, clientId));
}
