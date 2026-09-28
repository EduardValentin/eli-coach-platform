import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import { CLIENT_STATUSES } from "@eli-coach-platform/domain/client-roster";
import { z } from "zod";

import { coachingBundleIdSchema, priceTierSchema } from "./bundle-cards";

const clientStatusSchema = z.enum(CLIENT_STATUSES);

export type ClientStatus = z.infer<typeof clientStatusSchema>;

const rosterClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  bundleMonths: z.number().int().positive().nullable(),
  paidAt: z.iso.datetime().nullable(),
});

export type RosterClient = z.infer<typeof rosterClientSchema>;

export const clientRosterSchema = z.object({
  clients: z.array(rosterClientSchema).nullable(),
});

export type ClientRoster = z.infer<typeof clientRosterSchema>;

const INVITATION_STATES = ["pending", "expired", "email-failed"] as const;

const clientInvitationSchema = z.object({
  state: z.enum(INVITATION_STATES),
  sentAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export type ClientInvitationReading = z.infer<typeof clientInvitationSchema>;

const clientProfileSchema = z.object({
  dateOfBirth: z.iso.date(),
  gender: z.enum(VISITOR_GENDERS),
  country: z.string().min(1),
  phone: z.string().nullable(),
  primaryGoal: z.enum(VISITOR_PRIMARY_GOALS),
  bookingNotes: z.string().nullable(),
});

export type ClientProfile = z.infer<typeof clientProfileSchema>;

const clientSubscriptionSchema = z.object({
  bundleId: coachingBundleIdSchema,
  months: z.number().int().positive(),
  tier: priceTierSchema,
  paidAt: z.iso.datetime(),
  workStartsOn: z.iso.datetime().nullable(),
});

export type ClientSubscription = z.infer<typeof clientSubscriptionSchema>;

export const coachClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  profile: clientProfileSchema,
  subscription: clientSubscriptionSchema.nullable(),
  invitation: clientInvitationSchema.nullable(),
});

export type CoachClient = z.infer<typeof coachClientSchema>;

export const resendInvitationRequestSchema = z.object({
  clientId: z.uuid(),
});

export const resendInvitationSuccessSchema = z.object({
  status: z.literal("sent"),
  email: z.string().min(1),
});

export const resendInvitationErrorSchema = z.object({
  error: z.string().min(1),
});

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

const REVIEW_STATUSES: readonly ClientStatus[] = [
  "awaiting-review",
  "in-review",
  "needs-details",
  "approved",
];

const ROSTER_SORT_KEYS = ["name", "status", "bundle", "joined"] as const;

export type RosterSortKey = (typeof ROSTER_SORT_KEYS)[number];

export type RosterSortDirection = "asc" | "desc";

export type RosterSort = { key: RosterSortKey; direction: RosterSortDirection };

export const ALL_STATUSES_OPTION = "all";

export type RosterStatusOption = ClientStatus | typeof ALL_STATUSES_OPTION;

const ROSTER_STATUS_OPTIONS: readonly RosterStatusOption[] = [
  ALL_STATUSES_OPTION,
  ...CLIENT_STATUS_ORDER,
];

export type RosterSelection = {
  status: RosterStatusOption;
  query: string;
};

export type RosterParams = RosterSelection & { sort: RosterSort };

export const ROSTER_PARAMS = {
  direction: "dir",
  query: "q",
  sort: "sort",
  status: "status",
} as const;

export const DEFAULT_ROSTER_SORT_KEY: RosterSortKey = "joined";

export function defaultRosterSortDirectionFor(
  key: RosterSortKey,
): RosterSortDirection {
  return key === "joined" ? "desc" : "asc";
}

export function toRosterStatusOption(raw: string | null): RosterStatusOption {
  return (
    ROSTER_STATUS_OPTIONS.find((option) => option === raw) ??
    ALL_STATUSES_OPTION
  );
}

function toRosterSortKey(raw: string | null): RosterSortKey {
  return ROSTER_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_ROSTER_SORT_KEY;
}

function toRosterSortDirection(
  raw: string | null,
  key: RosterSortKey,
): RosterSortDirection {
  if (raw === "asc" || raw === "desc") {
    return raw;
  }

  return defaultRosterSortDirectionFor(key);
}

export function parseRosterParams(params: URLSearchParams): RosterParams {
  const key = toRosterSortKey(params.get(ROSTER_PARAMS.sort));

  return {
    query: params.get(ROSTER_PARAMS.query) ?? "",
    sort: {
      direction: toRosterSortDirection(
        params.get(ROSTER_PARAMS.direction),
        key,
      ),
      key,
    },
    status: toRosterStatusOption(params.get(ROSTER_PARAMS.status)),
  };
}

export function rosterClientName(client: RosterClient): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

function matchesStatus(
  client: RosterClient,
  option: RosterStatusOption,
): boolean {
  return option === ALL_STATUSES_OPTION || client.status === option;
}

function matchesQuery(client: RosterClient, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return [rosterClientName(client), client.email].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function filterRoster(
  clients: readonly RosterClient[],
  selection: RosterSelection,
): RosterClient[] {
  return clients.filter(
    (client) =>
      matchesStatus(client, selection.status) &&
      matchesQuery(client, selection.query),
  );
}

export function countsByStatus(
  clients: readonly RosterClient[],
  selection: RosterSelection,
): Record<RosterStatusOption, number> {
  return Object.fromEntries(
    ROSTER_STATUS_OPTIONS.map((option) => [
      option,
      filterRoster(clients, { ...selection, status: option }).length,
    ]),
  ) as Record<RosterStatusOption, number>;
}

type CompareClients = (one: RosterClient, other: RosterClient) => number;

function compareText(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: "base" });
}

function inDirection(
  ascending: RosterClient[],
  direction: RosterSortDirection,
): RosterClient[] {
  return direction === "asc" ? ascending : ascending.reverse();
}

function sortedBy(
  clients: readonly RosterClient[],
  compareAscending: CompareClients,
  direction: RosterSortDirection,
): RosterClient[] {
  return inDirection([...clients].sort(compareAscending), direction);
}

type ValuedOrdering = {
  hasValue: (client: RosterClient) => boolean;
  compareAscending: CompareClients;
};

function placeholderLastBy(
  clients: readonly RosterClient[],
  ordering: ValuedOrdering,
  direction: RosterSortDirection,
): RosterClient[] {
  const valued = sortedBy(
    clients.filter(ordering.hasValue),
    ordering.compareAscending,
    direction,
  );
  const placeholders = clients.filter((client) => !ordering.hasValue(client));

  return [...valued, ...placeholders];
}

const byName: CompareClients = (one, other) =>
  compareText(rosterClientName(one), rosterClientName(other)) ||
  compareText(one.email, other.email);

const byStatus: CompareClients = (one, other) =>
  CLIENT_STATUS_ORDER.indexOf(one.status) -
  CLIENT_STATUS_ORDER.indexOf(other.status);

const byBundle: ValuedOrdering = {
  compareAscending: (one, other) =>
    (one.bundleMonths ?? 0) - (other.bundleMonths ?? 0),
  hasValue: (client) => client.bundleMonths !== null,
};

const byJoinDate: ValuedOrdering = {
  compareAscending: (one, other) =>
    Date.parse(one.paidAt ?? "") - Date.parse(other.paidAt ?? ""),
  hasValue: (client) => client.paidAt !== null,
};

export function sortRoster(
  clients: readonly RosterClient[],
  sort: RosterSort,
): RosterClient[] {
  switch (sort.key) {
    case "name":
      return sortedBy(clients, byName, sort.direction);
    case "status":
      return sortedBy(clients, byStatus, sort.direction);
    case "bundle":
      return placeholderLastBy(clients, byBundle, sort.direction);
    case "joined":
      return placeholderLastBy(clients, byJoinDate, sort.direction);
  }
}

export function hasActiveRosterFilters(selection: RosterSelection): boolean {
  return (
    selection.status !== ALL_STATUSES_OPTION ||
    selection.query.trim().length > 0
  );
}

export function emptyRosterMessage(selection: RosterSelection): string {
  const hasQuery = selection.query.trim().length > 0;

  if (selection.status === ALL_STATUSES_OPTION) {
    return hasQuery
      ? "No clients match your search."
      : "No clients match your filters.";
  }

  const label = CLIENT_STATUS_LABELS[selection.status];

  return hasQuery
    ? `No clients match the ${label} status and your search.`
    : `No clients match the ${label} status.`;
}

export type EmptyRosterCopy = { title: string; description: string };

export function emptyRosterCopy(empty: {
  rosterSize: number;
  selection: RosterSelection;
}): EmptyRosterCopy {
  if (empty.rosterSize === 0 && !hasActiveRosterFilters(empty.selection)) {
    return {
      description: "Clients appear here once they pay for a bundle.",
      title: "No clients yet",
    };
  }

  return {
    description: emptyRosterMessage(empty.selection),
    title: "No clients found",
  };
}

export function rowLinkLabel(client: RosterClient): string {
  const name = rosterClientName(client);

  return REVIEW_STATUSES.includes(client.status)
    ? `Review onboarding for ${name}`
    : `View details for ${name}`;
}

const JOIN_DATE_LOCALE = "en-US";
const DAY_MONTH_LOCALE = "en-GB";

function formatParts(
  instant: string,
  format: { locale: string; options: Intl.DateTimeFormatOptions },
) {
  const parts = new Intl.DateTimeFormat(
    format.locale,
    format.options,
  ).formatToParts(new Date(instant));

  return (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
}

export function formatJoinDate(instant: string, timeZone: string): string {
  const part = formatParts(instant, {
    locale: JOIN_DATE_LOCALE,
    options: { day: "2-digit", month: "short", timeZone, year: "numeric" },
  });

  return `${part("month")} ${part("day")}, ${part("year")}`;
}

function formatInvitationDay(instant: string, timeZone: string): string {
  const part = formatParts(instant, {
    locale: DAY_MONTH_LOCALE,
    options: { day: "numeric", month: "long", timeZone },
  });

  return `${part("day")} ${part("month")}`;
}

export function invitationStateLine(
  invitation: ClientInvitationReading,
  timeZone: string,
): string {
  switch (invitation.state) {
    case "email-failed":
      return "Invitation email could not be sent";
    case "expired":
      return `Invitation expired ${formatInvitationDay(invitation.expiresAt, timeZone)}`;
    case "pending":
      return `Invited ${formatInvitationDay(invitation.sentAt, timeZone)} · expires ${formatInvitationDay(invitation.expiresAt, timeZone)}`;
  }
}

const ROSTER_URL_PARAMS: readonly string[] = Object.values(ROSTER_PARAMS);

function searchWithoutRosterParams(url: URL): string {
  const params = new URLSearchParams(url.search);

  for (const name of ROSTER_URL_PARAMS) {
    params.delete(name);
  }

  params.sort();

  return params.toString();
}

export function haveOnlyRosterParamsChanged(urls: {
  currentUrl: URL;
  nextUrl: URL;
}): boolean {
  const { currentUrl, nextUrl } = urls;

  if (currentUrl.href === nextUrl.href) {
    return false;
  }

  return (
    currentUrl.pathname === nextUrl.pathname &&
    searchWithoutRosterParams(currentUrl) === searchWithoutRosterParams(nextUrl)
  );
}
