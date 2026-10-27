import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

export const coachingStandingColumns = {
  status: clientsTable.coachingStatus,
  accessEndsAt: clientsTable.coachingAccessEndsAt,
  refundDue: clientsTable.coachingRefundDue,
  bundleMonths: clientsTable.coachingBundleMonths,
  programStartsAt: clientsTable.coachingProgramStartsAt,
  paidThrough: clientsTable.coachingPaidThrough,
};
