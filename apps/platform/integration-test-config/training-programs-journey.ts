import {
  regularSubmission,
  type ClientOnboardingJourney,
  type OnboardingSubmission,
} from "./client-onboarding-journey";
import {
  COACH_SESSION,
  type AccountSession,
  type PlatformRig,
} from "./platform-rig";
import { ANA } from "./subscriptions-journey";

export const SIGNED_OUT = "signed-out";

type Requester = AccountSession | typeof SIGNED_OUT;

export type ProgramSetupRequest = {
  goal: string;
  level: string;
  trainingDays: number;
  sessionMinutes: number;
  language: string;
  dailySteps: number;
  splitShape: string;
  equipment: string[];
};

export type ProgramRow = {
  id: string;
  goal: string;
  level: string;
  language: string;
};

export type StoredBlock = {
  type: string;
  weeks: number;
  calibrationWeek: boolean;
  trainingDays: number;
  targetMinutes: number;
  dailySteps: number;
  split: { shape: string };
  sessions: { name: string; rows: unknown[] }[];
  cardioSessions: {
    name: string;
    segments: { exerciseId: string; minutes: number }[];
  }[];
};

export type ProgramVersionRow = {
  number: number;
  status: string;
  content: { plan: { blocks: StoredBlock[] } };
};

export type DraftRow = {
  content: unknown;
  updatedAt: Date;
};

export function coachClientPage(clientId: string): string {
  return `/coach/clients/${clientId}`;
}

export function programSetupPage(clientId: string): string {
  return `${coachClientPage(clientId)}/program/new`;
}

function programDraftSaveAddress(clientId: string): string {
  return `/api/coach/clients/${clientId}/program/draft`;
}

/**
 * The coach's steps toward a client's program, each driven through the page
 * or the request the coach portal sends, and the rows they leave behind.
 */
export class TrainingProgramsJourney {
  constructor(
    private readonly rig: PlatformRig,
    private readonly onboarding: ClientOnboardingJourney,
  ) {}

  async submittedClient(
    session: AccountSession,
    submission: OnboardingSubmission = regularSubmission(),
  ): Promise<string> {
    await this.onboarding.admit(ANA, session);
    await this.onboarding.submitWith(session, submission);

    return this.onboarding.clientIdOf(session);
  }

  async approvedClient(
    session: AccountSession,
    submission: OnboardingSubmission = regularSubmission(),
  ): Promise<string> {
    const clientId = await this.submittedClient(session, submission);
    await this.onboarding.approve(COACH_SESSION, clientId);

    return clientId;
  }

  openSetup(requester: Requester, clientId: string): Promise<Response> {
    return this.send(requester, programSetupPage(clientId));
  }

  openClientPage(requester: Requester, clientId: string): Promise<Response> {
    return this.send(requester, coachClientPage(clientId));
  }

  create(
    requester: Requester,
    clientId: string,
    setup: unknown,
  ): Promise<Response> {
    return this.send(requester, programSetupPage(clientId), {
      body: JSON.stringify(setup),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  }

  /** The request the setup form itself sends, answered as route data. */
  submitSetupForm(clientId: string, setup: unknown): Promise<Response> {
    return this.send(COACH_SESSION, `${programSetupPage(clientId)}.data`, {
      body: JSON.stringify(setup),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  }

  /** The request the builder sends to save the whole draft. */
  saveDraft(
    requester: Requester,
    clientId: string,
    request: unknown,
  ): Promise<Response> {
    return this.send(requester, programDraftSaveAddress(clientId), {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
  }

  async start(clientId: string, setup: ProgramSetupRequest): Promise<void> {
    const response = await this.create(COACH_SESSION, clientId, setup);

    if (response.status !== 302) {
      throw new Error(`Starting her program answered ${response.status}.`);
    }
  }

  programRowsOf(clientId: string): Promise<ProgramRow[]> {
    return this.rig.suite.postgres.queryRows<ProgramRow>({
      sql: "select id, goal, level, language from app.programs where client_id = $1",
      values: [clientId],
    });
  }

  versionRowsOf(clientId: string): Promise<ProgramVersionRow[]> {
    return this.rig.suite.postgres.queryRows<ProgramVersionRow>({
      sql: `select versions.number, versions.status, versions.content
        from app.program_versions versions
        join app.programs programs on programs.id = versions.program_id
        where programs.client_id = $1
        order by versions.number`,
      values: [clientId],
    });
  }

  draftRowsOf(clientId: string): Promise<DraftRow[]> {
    return this.rig.suite.postgres.queryRows<DraftRow>({
      sql: `select versions.content, versions.updated_at as "updatedAt"
        from app.program_versions versions
        join app.programs programs on programs.id = versions.program_id
        where programs.client_id = $1 and versions.status = 'draft'`,
      values: [clientId],
    });
  }

  private send(
    requester: Requester,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (requester === SIGNED_OUT) {
      return this.rig.suite.request(
        new Request(this.rig.suite.url(target), init),
      );
    }

    return this.rig.requestAs(requester, target, init);
  }
}
