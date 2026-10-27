import { DeadEndPanel } from "~/shared/design-system/layout";
import { EmptyState, PortalPageHeader } from "~/shared/design-system/portal";
import {
  Button,
  cardVariants,
  SearchField,
} from "~/shared/design-system/primitives";
import { Users, UserX } from "lucide-react";

import type { RosterClient } from "~/features/clients/public/coach-clients";

import { ClientStatusFilter } from "./client-status-filter";
import { ClientsTable } from "./clients-table";
import {
  countsByStatus,
  emptyRosterCopy,
  filterRoster,
  hasActiveRosterFilters,
  sortRoster,
} from "./roster-listing";
import { useRosterParams } from "./use-roster-params";

const SEARCH_FIELD_ID = "clients-search";

export function ClientsUnavailable() {
  return (
    <div className="w-full" data-parity-root="ClientsUnavailable">
      <DeadEndPanel
        description="Your clients could not be loaded. Try again in a moment."
        icon={<UserX aria-hidden="true" size={36} />}
        title="Clients unavailable"
      />
    </div>
  );
}

type ClientsSectionProps = {
  clients: readonly RosterClient[];
  avatarSrcs: Readonly<Record<string, string | undefined>>;
};

export function ClientsSection({ clients, avatarSrcs }: ClientsSectionProps) {
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
  const shown = sortRoster(filterRoster(clients, selection), sort).map(
    (client) => ({ ...client, avatarSrc: avatarSrcs[client.clientId] }),
  );
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
        className={cardVariants({ variant: "table-panel" })}
        data-parity="roster-table"
      >
        <ClientsTable
          clients={shown}
          emptyState={
            <EmptyState
              action={
                hasActiveRosterFilters(selection) && (
                  <Button onClick={clearFilters} size="sm" variant="outline">
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
