import type { AccountSession, PlatformRig } from "./platform-rig";

export const VISITOR = "visitor";

type Requester = AccountSession | typeof VISITOR;

export type ExerciseFields = {
  name: string;
  type: string;
  unit: string;
  perSide: boolean;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  tags: string[];
  cues: string;
};

export type ExerciseRow = Omit<ExerciseFields, "cues"> & {
  id: string;
  formCues: string;
  createdAt: Date;
  updatedAt: Date;
};

const EXERCISES_API = "/api/coach/exercises";

const EXERCISE_ROW_SELECTION = `select id, name, form_cues as "formCues", type, unit, per_side as "perSide", difficulty,
  primary_muscles as "primaryMuscles", secondary_muscles as "secondaryMuscles", equipment, tags,
  created_at as "createdAt", updated_at as "updatedAt"
  from app.exercises`;

export class ExerciseLibraryJourney {
  constructor(private readonly rig: PlatformRig) {}

  create(requester: Requester, fields: unknown): Promise<Response> {
    return this.send(requester, EXERCISES_API, {
      body: typeof fields === "string" ? fields : JSON.stringify(fields),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  async createAccepted(
    requester: AccountSession,
    fields: ExerciseFields,
  ): Promise<ExerciseRow> {
    const response = await this.create(requester, fields);

    if (response.status !== 200) {
      throw new Error(
        `Creating ${fields.name} answered ${response.status}: ${await response.text()}`,
      );
    }

    const [created] = await this.exerciseRowsNamed(fields.name.trim());

    if (!created) {
      throw new Error(`${fields.name} was not stored.`);
    }

    return created;
  }

  edit(
    requester: Requester,
    exerciseId: string,
    fields: unknown,
  ): Promise<Response> {
    return this.send(requester, `${EXERCISES_API}/${exerciseId}`, {
      body: JSON.stringify(fields),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  }

  exerciseRows(): Promise<ExerciseRow[]> {
    return this.rig.suite.postgres.queryRows<ExerciseRow>({
      sql: `${EXERCISE_ROW_SELECTION} order by lower(name), id`,
      values: [],
    });
  }

  private exerciseRowsNamed(name: string): Promise<ExerciseRow[]> {
    return this.rig.suite.postgres.queryRows<ExerciseRow>({
      sql: `${EXERCISE_ROW_SELECTION} where name = $1`,
      values: [name],
    });
  }

  private send(
    requester: Requester,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (requester === VISITOR) {
      return this.rig.suite.request(
        new Request(this.rig.suite.url(target), init),
      );
    }

    return this.rig.requestAs(requester, target, init);
  }
}
