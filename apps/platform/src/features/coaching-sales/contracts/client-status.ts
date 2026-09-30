import type { ClientStatus } from "./coach-clients";

export type ClientStatusTone =
  "neutral" | "pending" | "info" | "success" | "muted";

export type ClientStatusGroup = {
  label: string;
  statuses: readonly ClientStatus[];
};

export const CLIENT_STATUS_GROUPS: readonly ClientStatusGroup[] = [
  {
    label: "Onboarding",
    statuses: [
      "invited",
      "onboarding",
      "awaiting-review",
      "in-review",
      "needs-details",
      "approved",
    ],
  },
  { label: "Active", statuses: ["active"] },
  { label: "Inactive", statuses: ["cancelled", "inactive"] },
];

export const CLIENT_STATUS_ORDER: readonly ClientStatus[] =
  CLIENT_STATUS_GROUPS.flatMap((group) => group.statuses);

export const CLIENT_STATUS_LABELS: Readonly<Record<ClientStatus, string>> = {
  invited: "Invited",
  onboarding: "Onboarding",
  "awaiting-review": "Awaiting review",
  "in-review": "In review",
  "needs-details": "Needs details",
  approved: "Approved",
  active: "Active",
  cancelled: "Cancelled",
  inactive: "Inactive",
};

const CLIENT_STATUS_TONES: Readonly<Record<ClientStatus, ClientStatusTone>> = {
  invited: "neutral",
  onboarding: "neutral",
  "awaiting-review": "pending",
  "in-review": "info",
  "needs-details": "pending",
  approved: "info",
  active: "success",
  cancelled: "muted",
  inactive: "muted",
};

export function clientStatusTone(status: ClientStatus): ClientStatusTone {
  return CLIENT_STATUS_TONES[status];
}
