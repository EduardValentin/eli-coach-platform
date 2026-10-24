import {
  CoachingFacts,
  type CoachingFactsProblems,
  type CoachingFactsResult,
  type CoachingFactsSnapshot,
  type SharedCoachingFacts,
} from "./coaching-facts";

const MAX_COACH_NOTES_LENGTH = 500;

export type ClientProfileSnapshot = {
  clientId: string;
  coaching: CoachingFactsSnapshot | null;
  coachNotes: string | null;
  coachingSeededAt: Date | null;
  progressPhotosConsentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachProfileEdit = {
  coaching: CoachingFactsSnapshot;
  coachNotes: string | null;
};

export type ClientProfileProblems = CoachingFactsProblems & {
  coachNotes?: "too-long";
};

export type ClientProfileEditResult =
  | { status: "edited"; profile: ClientProfile }
  | { status: "not-seeded" }
  | { status: "invalid"; problems: ClientProfileProblems };

type OpenedClientProfileInput = {
  clientId: string;
  now: Date;
};

type ProfileChange = {
  facts: CoachingFactsResult;
  coachNotes: string | null;
  now: Date;
};

export class ClientProfile {
  private constructor(private readonly snapshot: ClientProfileSnapshot) {}

  static opened(input: OpenedClientProfileInput): ClientProfile {
    return new ClientProfile({
      clientId: input.clientId,
      coaching: null,
      coachNotes: null,
      coachingSeededAt: null,
      progressPhotosConsentedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(snapshot: ClientProfileSnapshot): ClientProfile {
    return new ClientProfile(snapshot);
  }

  editSharedFacts(
    shared: SharedCoachingFacts,
    now: Date,
  ): ClientProfileEditResult {
    const { coaching, coachNotes } = this.snapshot;

    if (!coaching) {
      return { status: "not-seeded" };
    }

    return this.changed({
      facts: CoachingFacts.of({ ...coaching, ...shared }),
      coachNotes,
      now,
    });
  }

  editCoachFacts(edit: CoachProfileEdit, now: Date): ClientProfileEditResult {
    if (!this.snapshot.coaching) {
      return { status: "not-seeded" };
    }

    return this.changed({
      facts: CoachingFacts.of(edit.coaching),
      coachNotes: edit.coachNotes?.trim() || null,
      now,
    });
  }

  hasPhotoConsent(): boolean {
    return this.snapshot.progressPhotosConsentedAt !== null;
  }

  toSnapshot(): ClientProfileSnapshot {
    const { coaching } = this.snapshot;

    return {
      ...this.snapshot,
      coaching: coaching && { ...coaching, equipment: [...coaching.equipment] },
    };
  }

  private changed(change: ProfileChange): ClientProfileEditResult {
    const problems: ClientProfileProblems = {
      ...(change.facts.status === "invalid" && change.facts.problems),
      ...((change.coachNotes?.length ?? 0) > MAX_COACH_NOTES_LENGTH && {
        coachNotes: "too-long",
      }),
    };

    if (change.facts.status === "invalid" || Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return {
      status: "edited",
      profile: new ClientProfile({
        ...this.snapshot,
        coaching: change.facts.facts.toSnapshot(),
        coachNotes: change.coachNotes,
        updatedAt: change.now,
      }),
    };
  }
}
