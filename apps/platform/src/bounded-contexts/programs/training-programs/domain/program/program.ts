import type {
  ClientCoaching,
  ClientCoachingFacts,
} from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import type { ProgramContent } from "./program-content";
import type { ProgramSetup } from "./program-setup";
import {
  ProgramVersion,
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

  draftSummary(): DraftSummary | null {
    return this.versions.find((version) => version.isDraft)?.summary() ?? null;
  }

  toSnapshot(): ProgramSnapshot {
    return {
      ...this.fields,
      versions: this.versions.map((version) => version.toSnapshot()),
    };
  }
}
