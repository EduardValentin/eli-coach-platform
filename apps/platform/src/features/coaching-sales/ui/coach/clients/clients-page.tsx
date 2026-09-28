import { cn } from "@eli-coach-platform/ui/lib";
import {
  DeadEndContent,
  DEAD_END_BODY_CLASS_NAME,
} from "@eli-coach-platform/ui/layout";
import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  Button,
  cardVariants,
  SearchField,
} from "@eli-coach-platform/ui/primitives";
import { Users, UserX } from "lucide-react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { RosterClient } from "~/features/coaching-sales/contracts/coach-clients";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";

import { ClientStatusFilter } from "./client-status-filter";
import { ClientsTable } from "./clients-table";
import {
  countsByStatus,
  emptyRosterCopy,
  filterRoster,
  hasActiveRosterFilters,
  haveOnlyRosterParamsChanged,
  sortRoster,
} from "./roster-listing";
import { useRosterParams } from "./use-roster-params";

const SEARCH_FIELD_ID = "clients-search";

export async function loader(args: LoaderFunctionArgs) {
  return args.context.get(coachingSalesContext).coachClients.loadRoster(args);
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyRosterParamsChanged({ currentUrl, nextUrl })
    ? false
    : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [{ title: "Clients | Evoa" }];

export default function CoachClientsRoute() {
  const { clients } = useLoaderData<typeof loader>();

  if (clients === null) {
    return <ClientsUnavailable />;
  }

  return <ClientsSection clients={clients} />;
}

function ClientsUnavailable() {
  return (
    <div className="w-full" data-parity-root="ClientsUnavailable">
      <div
        className={cn(
          cardVariants({ variant: "portal-panel" }),
          DEAD_END_BODY_CLASS_NAME,
        )}
        role="alert"
      >
        <DeadEndContent
          description="Your clients could not be loaded. Try again in a moment."
          icon={<UserX aria-hidden="true" size={36} />}
          title="Clients unavailable"
        />
      </div>
    </div>
  );
}

function ClientsSection({ clients }: { clients: readonly RosterClient[] }) {
  const {
    changeQuery,
    chooseSort,
    chooseStatus,
    clearFilters,
    query,
    sort,
    status,
  } = useRosterParams();
  const selection = { query, status };
  const shown = sortRoster(filterRoster(clients, selection), sort);
  const emptyCopy = emptyRosterCopy({ rosterSize: clients.length, selection });

  return (
    <div className="w-full" data-parity-root="ClientsSection">
      <PortalPageHeader
        subtitle="Manage your active roster and past client records."
        title="Clients"
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
          <ClientStatusFilter
            counts={countsByStatus(clients, selection)}
            onChoose={chooseStatus}
            status={status}
          />
        </div>

        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
          <SearchField
            aria-label="Search clients"
            className="w-full sm:w-72"
            data-parity="clients-search"
            id={SEARCH_FIELD_ID}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search by name or email"
            size="sm"
            value={query}
          />
        </div>
      </div>

      <div
        className={cn(
          cardVariants({ variant: "portal-panel" }),
          "overflow-hidden",
        )}
      >
        <ClientsTable
          clients={shown}
          emptyState={
            <EmptyState
              action={
                hasActiveRosterFilters(selection) && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear filters
                  </Button>
                )
              }
              description={emptyCopy.description}
              icon={Users}
              title={emptyCopy.title}
            />
          }
          onSort={chooseSort}
          sort={sort}
        />
      </div>
    </div>
  );
}
