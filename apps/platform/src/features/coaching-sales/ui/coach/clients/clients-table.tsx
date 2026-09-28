import {
  buttonVariants,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type TableSort,
} from "@eli-coach-platform/ui/primitives";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { bundleLengthLabel } from "~/features/coaching-sales/contracts/bundle-cards";
import type { RosterClient } from "~/features/coaching-sales/contracts/coach-clients";
import { coachClientPath } from "~/features/coaching-sales/contracts/paths";
import { useCalendarDayTimeZone } from "~/features/coaching-sales/ui/shared/calendar-day-format";

import { ClientStatusBadge } from "./client-status-badge";
import {
  formatJoinDate,
  rosterClientName,
  rowLinkLabel,
  type RosterSort,
  type RosterSortKey,
} from "./roster-listing";

const ABSENT_CELL = "—";
const COLUMN_COUNT = 5;

const SORTABLE_COLUMNS: readonly { key: RosterSortKey; label: string }[] = [
  { key: "name", label: "Client" },
  { key: "status", label: "Status" },
  { key: "bundle", label: "Bundle / Plan" },
  { key: "joined", label: "Join date" },
];

type ClientsTableProps = {
  clients: readonly RosterClient[];
  emptyState: ReactNode;
  onSort: (key: RosterSortKey) => void;
  sort: RosterSort;
};

function tableSortFor(sort: RosterSort, key: RosterSortKey): TableSort {
  if (sort.key !== key) {
    return "none";
  }

  return sort.direction === "asc" ? "ascending" : "descending";
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ClientsTable({
  clients,
  emptyState,
  onSort,
  sort,
}: ClientsTableProps) {
  const timeZone = useCalendarDayTimeZone();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {SORTABLE_COLUMNS.map((column) => (
            <TableHead
              data-parity={`sort-${column.key}`}
              key={column.key}
              onSort={() => onSort(column.key)}
              sort={tableSortFor(sort, column.key)}
            >
              {column.label}
            </TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.length === 0 ? (
          <TableRow>
            <TableCell className="p-0" colSpan={COLUMN_COUNT}>
              {emptyState}
            </TableCell>
          </TableRow>
        ) : (
          clients.map((client, index) => (
            <ClientRow
              client={client}
              key={client.clientId}
              position={index + 1}
              timeZone={timeZone}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}

type ClientRowProps = {
  client: RosterClient;
  position: number;
  timeZone: string;
};

function ClientRow({ client, position, timeZone }: ClientRowProps) {
  const navigate = useNavigate();
  const name = rosterClientName(client);
  const detailPath = coachClientPath(client.clientId);
  const linkLabel = rowLinkLabel(client);
  const cellParity = (cell: string) => `row-${position}-${cell}`;

  return (
    <TableRow
      className="group cursor-pointer"
      onClick={() => void navigate(detailPath)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet font-heading font-semibold text-text-primary"
          >
            {initialsOf(name)}
          </div>
          <div>
            <p
              className="text-sm font-semibold text-text-primary"
              data-parity={cellParity("name")}
            >
              {name}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{client.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell data-parity={cellParity("status")}>
        <ClientStatusBadge status={client.status} />
      </TableCell>
      <TableCell
        className="text-sm font-medium text-text-secondary"
        data-parity={cellParity("bundle")}
      >
        {client.bundleMonths === null
          ? ABSENT_CELL
          : bundleLengthLabel(client.bundleMonths)}
      </TableCell>
      <TableCell
        className="text-sm text-text-secondary"
        data-parity={cellParity("joined")}
      >
        {client.paidAt === null
          ? ABSENT_CELL
          : formatJoinDate(client.paidAt, timeZone)}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-between gap-2">
          <div />
          <Link
            aria-label={linkLabel}
            className={buttonVariants({
              className:
                "opacity-0 group-hover:opacity-100 hover:bg-text-primary hover:text-text-inverted focus-visible:opacity-100",
              size: "icon-xs",
              variant: "ghost",
            })}
            data-parity="row-link"
            onClick={(event) => event.stopPropagation()}
            title={linkLabel}
            to={detailPath}
          >
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
