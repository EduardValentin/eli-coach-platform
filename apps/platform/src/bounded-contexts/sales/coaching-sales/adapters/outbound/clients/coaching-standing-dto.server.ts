import type { CoachingStanding } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { CoachingStandingDto } from "~/bounded-contexts/clients/public/admissions";

export function coachingStandingDtoOf(
  standing: CoachingStanding,
): CoachingStandingDto {
  const snapshot = standing.toSnapshot();

  return {
    status: snapshot.status,
    accessEndsAt: instantOrNull(snapshot.accessEndsAt),
    refundDue: snapshot.refundDue,
    bundleMonths: snapshot.bundleMonths,
    programStartsAt: instantOrNull(snapshot.programStartsAt),
    paidThrough: instantOrNull(snapshot.paidThrough),
  };
}

function instantOrNull(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}
