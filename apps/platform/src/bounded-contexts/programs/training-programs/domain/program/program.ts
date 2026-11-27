import type {
  ClientCoaching,
  ClientCoachingFacts,
} from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import type { VersionExerciseUsage } from "./exercise-usage-port";
import type { ProgramContent } from "./program-content";
import { ProgramExerciseIds } from "./program-exercise-ids";
import type { ProgramSetup } from "./program-setup";
import {
  ProgramVersion,
  type DraftReading,
  type DraftSummary,
  type ProgramVersionSnapshot,
} from "./program-version";
import type { ClientLevel, ProgramLanguage } from "./vocabulary";

export type ProgramSnapshot = {
  id: string;
  clientId: string;
  goal: string;
  level: ClientLevel;
  language: ProgramLanguage;
  createdAt: Date;
  updatedAt: Date;
  versions: ProgramVersionSnapshot[];
};

type StartedProgramInput = {
  id: string;
  clientId: string;
  setup: ProgramSetup;
  content: ProgramContent;
  at: Date;
};

type ProgramFields = Omit<ProgramSnapshot, "versions">;

type EligibilitySources = {
  client: ClientIdentity;
  coachingEnded: boolean;
  clientCoaching: ClientCoaching;
};

type EligibilityInput = EligibilitySources & { program: Program | null };

export type ProgramEligibility =
  | ({ status: "has-program"; program: Program } & EligibilitySources)
  | ({ status: "coaching-ended" | "not-approved" } & EligibilitySources)
  | ({
      status: "eligible";
      coachingFacts: ClientCoachingFacts;
    } & EligibilitySources);

type DraftChanges = {
  content: ProgramContent;
  level: ClientLevel;
  language: ProgramLanguage;
  at: Date;
};

type DraftSaving =
  | { status: "saved"; program: Program }
  | {
      status: "not-a-draft" | "level-and-language-fixed" | "not-well-formed";
    };

export class Program {
  private constructor(
    private readonly fields: ProgramFields,
    private readonly versions: readonly ProgramVersion[],
  ) {}

  static started({
    id,
    clientId,
    setup,
    content,
    at,
  }: StartedProgramInput): Program {
    const { goal, level, language } = setup.values;

    return new Program(
      { id, clientId, goal, level, language, createdAt: at, updatedAt: at },
      [ProgramVersion.firstDraft({ content, at })],
    );
  }

  static reconstitute({ versions, ...fields }: ProgramSnapshot): Program {
    return new Program(
      fields,
      versions.map((version) => ProgramVersion.reconstitute(version)),
    );
  }

  static eligibilityFor({
    program,
    ...sources
  }: EligibilityInput): ProgramEligibility {
    const { coachingEnded, clientCoaching } = sources;

    if (program) return { status: "has-program", ...sources, program };
    if (coachingEnded) return { status: "coaching-ended", ...sources };
    if (clientCoaching.answers.status === "not-approved") {
      return { status: "not-approved", ...sources };
    }

    return {
      status: "eligible",
      ...sources,
      coachingFacts: clientCoaching.answers.coachingFacts,
    };
  }

  get id(): string {
    return this.fields.id;
  }

  get clientId(): string {
    return this.fields.clientId;
  }

  get level(): ClientLevel {
    return this.fields.level;
  }

  get language(): ProgramLanguage {
    return this.fields.language;
  }

  draftSummary(): DraftSummary | null {
    return this.draftVersion()?.summary() ?? null;
  }

  draft(): DraftReading | null {
    return this.draftVersion()?.draftReading() ?? null;
  }

  draftUsage(coachAccountId: string): VersionExerciseUsage | null {
    const draft = this.draft();

    return (
      draft && {
        coachAccountId,
        programId: this.id,
        versionNumber: draft.versionNumber,
        exerciseIds: ProgramExerciseIds.usedBy(draft.content),
      }
    );
  }

  saveDraft({ content, level, language, at }: DraftChanges): DraftSaving {
    const draft = this.draftVersion();
    const levelOrLanguageChanged =
      level !== this.fields.level || language !== this.fields.language;

    if (!draft) {
      return { status: "not-a-draft" };
    }
    if (levelOrLanguageChanged && !draft.isFirst) {
      return { status: "level-and-language-fixed" };
    }
    if (!ProgramVersion.isWellFormed(content)) {
      return { status: "not-well-formed" };
    }

    return {
      status: "saved",
      program: new Program(
        { ...this.fields, level, language, updatedAt: at },
        this.versions.map((version) =>
          version === draft ? draft.withContent(content, at) : version,
        ),
      ),
    };
  }

  toSnapshot(): ProgramSnapshot {
    return {
      ...this.fields,
      versions: this.versions.map((version) => version.toSnapshot()),
    };
  }

  private draftVersion(): ProgramVersion | undefined {
    return this.versions.find((version) => version.isDraft);
  }
}
