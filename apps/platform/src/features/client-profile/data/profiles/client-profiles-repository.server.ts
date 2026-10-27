import type { DatabaseClient } from "~/shared/database";
import {
  ClientProfile,
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  type ClientProfileSave,
  type ClientProfileSaveOutcome,
  type ClientProfiles,
  type CoachingFactsSnapshot,
} from "@eli-coach-platform/domain/client-profile";
import { and, eq } from "drizzle-orm";

import {
  coachingColumnsOf,
  type CoachingColumns,
} from "~/features/client-profile/data/profiles/coaching-columns.server";
import { clientProfilesTable } from "~/features/client-profile/data/schema.server";

type ProfileColumns = Partial<typeof clientProfilesTable.$inferInsert>;

type SharedColumns = Pick<
  CoachingColumns,
  | "heightCm"
  | "trainingDaysPerWeek"
  | "sessionMinutes"
  | "equipment"
  | "trainingPlace"
  | "limitations"
>;

export class PostgresClientProfiles implements ClientProfiles {
  private readonly coachingColumns = {
    heightCm: clientProfilesTable.heightCm,
    trainingDaysPerWeek: clientProfilesTable.trainingDaysPerWeek,
    sessionMinutes: clientProfilesTable.sessionMinutes,
    equipment: clientProfilesTable.equipment,
    trainingPlace: clientProfilesTable.trainingPlace,
    limitations: clientProfilesTable.limitations,
    level: clientProfilesTable.level,
    primaryGoal: clientProfilesTable.primaryGoal,
    goalWeightKg: clientProfilesTable.goalWeightKg,
    activityLevel: clientProfilesTable.activityLevel,
    cycleMode: clientProfilesTable.cycleMode,
    dietaryRestrictions: clientProfilesTable.dietaryRestrictions,
  };

  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientProfile | null> {
    const [row] = await this.database
      .select({
        ...this.coachingColumns,
        clientId: clientProfilesTable.clientId,
        coachNotes: clientProfilesTable.coachNotes,
        coachingSeededAt: clientProfilesTable.coachingSeededAt,
        progressPhotosConsentedAt:
          clientProfilesTable.progressPhotosConsentedAt,
        createdAt: clientProfilesTable.createdAt,
        updatedAt: clientProfilesTable.updatedAt,
      })
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.clientId, clientId))
      .limit(1);

    if (!row) {
      return null;
    }

    return ClientProfile.reconstitute({
      clientId: row.clientId,
      coaching: row.coachingSeededAt === null ? null : this.coachingOf(row),
      coachNotes: row.coachNotes,
      coachingSeededAt: row.coachingSeededAt,
      progressPhotosConsentedAt: row.progressPhotosConsentedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async saveSharedFacts(
    save: ClientProfileSave,
  ): Promise<ClientProfileSaveOutcome> {
    const { coaching } = save.profile.toSnapshot();

    return this.updateWhileUnchanged(
      save,
      this.sharedColumnsOf(this.editedCoachingOf(coaching)),
    );
  }

  async saveCoachFacts(
    save: ClientProfileSave,
  ): Promise<ClientProfileSaveOutcome> {
    const { coaching, coachNotes } = save.profile.toSnapshot();

    return this.updateWhileUnchanged(save, {
      ...coachingColumnsOf(this.editedCoachingOf(coaching)),
      coachNotes,
    });
  }

  async recordPhotoConsent(clientId: string, at: Date): Promise<void> {
    await this.database
      .update(clientProfilesTable)
      .set({ progressPhotosConsentedAt: at })
      .where(eq(clientProfilesTable.clientId, clientId));
  }

  private async updateWhileUnchanged(
    save: ClientProfileSave,
    columns: ProfileColumns,
  ): Promise<ClientProfileSaveOutcome> {
    const { clientId, updatedAt } = save.profile.toSnapshot();
    const updated = await this.database
      .update(clientProfilesTable)
      .set({ ...columns, updatedAt })
      .where(
        and(
          eq(clientProfilesTable.clientId, clientId),
          eq(clientProfilesTable.updatedAt, save.expectedUpdatedAt),
        ),
      )
      .returning({ clientId: clientProfilesTable.clientId });

    return updated.length > 0 ? "saved" : "changed-meanwhile";
  }

  private sharedColumnsOf(coaching: CoachingFactsSnapshot): SharedColumns {
    return {
      heightCm: coaching.heightCm,
      trainingDaysPerWeek: coaching.trainingDays,
      sessionMinutes: coaching.sessionMinutes,
      equipment: coaching.equipment,
      trainingPlace: coaching.trainingPlace,
      limitations: coaching.limitations,
    };
  }

  private coachingOf(row: CoachingColumns): CoachingFactsSnapshot {
    const trainingDays = TRAINING_DAY_OPTIONS.find(
      (days) => days === row.trainingDaysPerWeek,
    );
    const sessionMinutes = SESSION_MINUTE_OPTIONS.find(
      (minutes) => minutes === row.sessionMinutes,
    );
    const { level, cycleMode, equipment, limitations, dietaryRestrictions } =
      row;

    if (
      trainingDays === undefined ||
      sessionMinutes === undefined ||
      level === null ||
      cycleMode === null ||
      equipment === null ||
      limitations === null ||
      dietaryRestrictions === null
    ) {
      throw new Error("A seeded client profile is missing a coaching fact.");
    }

    return {
      heightCm: row.heightCm,
      trainingDays,
      sessionMinutes,
      equipment,
      trainingPlace: row.trainingPlace,
      limitations,
      level,
      primaryGoal: row.primaryGoal,
      goalWeightKg: row.goalWeightKg,
      activityLevel: row.activityLevel,
      cycleMode,
      dietaryRestrictions,
    };
  }

  private editedCoachingOf(
    coaching: CoachingFactsSnapshot | null,
  ): CoachingFactsSnapshot {
    if (!coaching) {
      throw new Error("An edited client profile has no coaching facts.");
    }

    return coaching;
  }
}
