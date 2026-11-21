import type {
  ClientCoaching,
  ClientCoachingFacts,
} from "./client-coaching-port";
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

type EligibilityInput = {
  clientCoaching: ClientCoaching;
  program: Program | null;
};

export type ProgramEligibility =
  | { status: "has-program"; clientCoaching: ClientCoaching; program: Program }
  | {
      status: "coaching-ended" | "not-approved";
      clientCoaching: ClientCoaching;
    }
  | {
      status: "eligible";
      clientCoaching: ClientCoaching;
      coachingFacts: ClientCoachingFacts;
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
    clientCoaching,
    program,
  }: EligibilityInput): ProgramEligibility {
    if (program) return { status: "has-program", clientCoaching, program };
    if (clientCoaching.coachingEnded) {
      return { status: "coaching-ended", clientCoaching };
    }
    if (clientCoaching.answers.status === "not-approved") {
      return { status: "not-approved", clientCoaching };
    }

    return {
      status: "eligible",
      clientCoaching,
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
