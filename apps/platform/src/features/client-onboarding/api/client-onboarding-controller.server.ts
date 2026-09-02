import type { ActionFunctionArgs } from "react-router";

import type {
  ClientInvitationService,
  ClientOnboardingPayloadDigestGenerator,
  ClientOnboardingRepository,
  InvitationTokenGenerator,
  InvitationTokenHasher,
} from "@eli-coach-platform/domain";
import {
  WEIGHT_DIRECTION_BY_GOAL,
  ageOnDate,
  calculateBasalMetabolicRate,
  calculateTotalDailyEnergyExpenditure,
} from "@eli-coach-platform/domain";

import { requireApiAccount } from "~/features/accounts/server/require-account.server";
import { readJsonRequestBody } from "~/server/http.server";

import {
  MAX_AGE_YEARS,
  MIN_AGE_YEARS,
  onboardClientRequestSchema,
  type OnboardClientErrorCode,
  type OnboardClientIssue,
  type OnboardClientRequest,
} from "../contracts/client-onboarding";

const INVITATION_VALID_DAYS = 30;

type ClientOnboardingControllerOptions = {
  coachName: string;
  invitationService: ClientInvitationService;
  payloadDigester: ClientOnboardingPayloadDigestGenerator;
  publicAppUrl: string;
  repository: ClientOnboardingRepository;
  tokenGenerator: InvitationTokenGenerator;
  tokenHasher: InvitationTokenHasher;
};

export class ClientOnboardingController {
  constructor(private readonly options: ClientOnboardingControllerOptions) {}

  async onboardClient(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const body = await readJsonRequestBody<unknown>(args.request, {
      emptyBodyValue: {},
    });
    const parsed = onboardClientRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailure(
        parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "request",
          message: issue.message,
        })),
      );
    }

    const command = parsed.data;
    const now = new Date();

    const domainIssues = validateAgainstDomainRules(command, now);
    if (domainIssues.length > 0) return validationFailure(domainIssues);

    const basalMetabolicRate = calculateBasalMetabolicRate({
      ageYears: ageOnDate(command.dateOfBirth, now),
      heightCm: command.heightCm,
      sex: command.sex,
      weightKg: command.weightKg,
    });
    const totalDailyEnergyExpenditure = calculateTotalDailyEnergyExpenditure({
      activityLevel: command.activityLevel,
      basalMetabolicRate,
    });

    const token = this.options.tokenGenerator.generateToken();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + INVITATION_VALID_DAYS);

    const outcome = await this.options.repository.onboardClient({
      ...command,
      coachNotes: command.coachNotes ?? null,
      dietaryRestrictions: command.dietaryRestrictions ?? null,
      basalMetabolicRate,
      expiresAt,
      payloadDigest: this.options.payloadDigester.digestPayload(
        canonicalPayload(command),
      ),
      tokenHash: this.options.tokenHasher.hashToken(token),
      totalDailyEnergyExpenditure,
    });

    if (outcome.status === "already_a_client") {
      return failure(
        "already_a_client",
        "That email already belongs to one of your clients, so nothing was saved.",
        409,
      );
    }

    if (outcome.status === "idempotency_conflict") {
      return failure(
        "idempotency_conflict",
        "That submission key was already used with different details.",
        409,
      );
    }

    // The record is committed before the send, so a delivery failure leaves the
    // profile, goal and invitation intact and the coach can simply send again.
    try {
      await this.options.invitationService.sendInvitation({
        acceptUrl: `${this.options.publicAppUrl}/portal/onboarding?invitation=${token}`,
        coachName: this.options.coachName,
        firstName: command.firstName,
        idempotencyKey: command.idempotencyKey,
        replacedPendingInvitation:
          outcome.invitation.replacedPendingInvitation,
        to: command.email,
      });
    } catch {
      return failure(
        "invitation_email_failed",
        "The profile and invitation were saved, but the email could not be sent.",
        502,
      );
    }

    return Response.json(
      {
        success: true,
        clientId: outcome.invitation.clientId,
        invitationExpiresAt: outcome.invitation.invitationExpiresAt.toISOString(),
        replacedPendingInvitation: outcome.invitation.replacedPendingInvitation,
      },
      { status: 201 },
    );
  }
}

/**
 * Rules the wire schema cannot express on its own, because they compare fields
 * against one another rather than checking a single value.
 */
function validateAgainstDomainRules(
  command: OnboardClientRequest,
  now: Date,
): OnboardClientIssue[] {
  const issues: OnboardClientIssue[] = [];

  const age = ageOnDate(command.dateOfBirth, now);
  if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
    issues.push({
      field: "dateOfBirth",
      message: `Age must be between ${MIN_AGE_YEARS} and ${MAX_AGE_YEARS}.`,
    });
  }

  const direction = WEIGHT_DIRECTION_BY_GOAL[command.goalType];
  if (direction === "DOWN" && command.targetWeightKg > command.weightKg) {
    issues.push({
      field: "targetWeightKg",
      message: "This goal cannot raise the weight above the current weight.",
    });
  }
  if (direction === "UP" && command.targetWeightKg < command.weightKg) {
    issues.push({
      field: "targetWeightKg",
      message: "This goal cannot lower the weight below the current weight.",
    });
  }

  return issues;
}

// Field order is fixed so the same submission always digests the same way; a
// key-ordered stringify would let a reordered body read as a conflict.
function canonicalPayload(command: OnboardClientRequest): string {
  return JSON.stringify([
    command.firstName,
    command.lastName,
    command.email.trim().toLowerCase(),
    command.dateOfBirth,
    command.sex,
    command.heightCm,
    command.weightKg,
    command.activityLevel,
    command.dietaryRestrictions ?? null,
    command.goalType,
    command.targetWeightKg,
    command.coachNotes ?? null,
    command.dailyCalories,
    command.macroSplit.proteinPercent,
    command.macroSplit.carbsPercent,
    command.macroSplit.fatsPercent,
  ]);
}

function validationFailure(issues: OnboardClientIssue[]): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "validation_failed",
        message: "Some details need correcting before the invitation is sent.",
        issues,
      },
    },
    { status: 400 },
  );
}

function failure(
  code: OnboardClientErrorCode,
  message: string,
  status = 400,
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}
