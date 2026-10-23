import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ArrowRight, Users } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { SearchField } from '../../components/SearchField';
import { ListingToolbar } from '../../components/ListingToolbar';
import { TablePanel } from '../../components/TablePanel';
import { EmptyState } from '../../components/EmptyState';
import { SortableTableHead } from '../../components/SortableTableHead';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  awaitsCoachReview,
  isBeforeStage,
  type ClientJourney,
} from '../../domain/journey';
import {
  CLIENT_STATUS_GROUPS,
  clientStatus,
  isCancelledOrEnded,
} from '../../domain/clientStatus';
import { format } from 'date-fns';
import { bundleLengthLabel } from '../../domain/bundles';
import { getInitials } from '../../utils/clientHelpers';
import { ClientStatusBadge } from '../../components/coach-portal/ClientStatusBadge';
import { NeedsRefundBadge } from '../../components/coach-portal/NeedsRefundBadge';
import { needsRefund } from '../../domain/coachingSubscription';
import { ClientsUnavailable } from '../../components/coach-portal/ClientsUnavailable';
import {
  clientDetailPathForJourney,
  journeyClientName,
} from '../../utils/journeyLabels';
import {
  countsByStatus,
  defaultRosterSortDirectionFor,
  emptyRosterMessage,
  hasActiveRosterFilters,
  parseRosterSortDirection,
  parseRosterSortKey,
  parseRosterStatus,
  rowsMatching,
  sortRows,
  type RosterRow,
  type RosterSelection,
  type RosterSort,
  type RosterSortKey,
  type RosterStatus,
  type RosterStatusOption,
} from '../../utils/clientRosterListing';

const STATUS_PARAM = 'status';
const QUERY_PARAM = 'q';
const SORT_PARAM = 'sort';
const DIRECTION_PARAM = 'dir';
const DEFAULT_SORT_KEY: RosterSortKey = 'joined';
const SEARCH_FIELD_ID = 'clients-search';

function hasStarted(journey: ClientJourney): boolean {
  return !isBeforeStage(journey.stage, 'invited');
}

function rowActionLabel(name: string, awaitsReview: boolean): string {
  return awaitsReview
    ? `Review onboarding for ${name}`
    : `View details for ${name}`;
}

function journeyRosterRow(journey: ClientJourney, now: Date): RosterRow {
  const name = journeyClientName(journey);
  const awaitsReview =
    awaitsCoachReview(journey.stage) && !isCancelledOrEnded(journey, now);

  return {
    id: journey.callId,
    name,
    email: journey.profile.identity.email,
    status: clientStatus(journey, now),
    bundleMonths: journey.subscription?.bundle ?? null,
    joinedAt: journey.subscription?.purchasedAt ?? null,
    detailPath: clientDetailPathForJourney(journey),
    actionLabel: rowActionLabel(name, awaitsReview),
    avatarUrl: journey.profile.avatarUrl ?? undefined,
    needsRefund: needsRefund(journey.subscription),
  };
}

function StatusFilter({
  counts,
  status,
  onChoose,
}: {
  counts: Record<RosterStatusOption, number>;
  status: RosterStatusOption;
  onChoose: (option: RosterStatusOption) => void;
}) {
  return (
    <Select
      value={status}
      onValueChange={(value) => onChoose(parseRosterStatus(value))}
    >
      <SelectTrigger
        aria-label="Status"
        data-parity="status-filter"
        size="sm"
        className="w-full sm:w-56"
      >
        <SelectValue>{status === 'all' ? 'All statuses' : status}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            All statuses{' '}
            <Badge data-parity="status-count-all" tone="count">
              {counts.all}
            </Badge>
          </span>
        </SelectItem>
        <SelectSeparator data-parity="status-separator" />
        {CLIENT_STATUS_GROUPS.map((group) => (
          <SelectGroup
            key={group.label}
            data-parity={`status-group-${group.label.toLowerCase()}`}
          >
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option} value={option}>
                <span className="flex items-center gap-2">
                  {option} <Badge tone="count">{counts[option]}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function RosterAvatar({ row }: { row: RosterRow }) {
  if (row.avatarUrl) {
    return (
      <img
        src={row.avatarUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/50"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="w-10 h-10 rounded-full bg-surface-quiet flex items-center justify-center font-serif text-text-primary font-semibold shrink-0"
    >
      {getInitials(row.name)}
    </div>
  );
}

function RosterRowLink({ row }: { row: RosterRow }) {
  return (
    <div className="flex items-center justify-end">
      <Link
        to={row.detailPath}
        data-parity="row-link"
        aria-label={row.actionLabel}
        title={row.actionLabel}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'opacity-0 hover:bg-text-primary hover:text-white group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function RosterTableRow({
  row,
  position,
}: {
  row: RosterRow;
  position: number;
}) {
  const navigate = useNavigate();
  const rowParity = (cell: string) => `row-${position}-${cell}`;
  return (
    <TableRow
      className="group cursor-pointer"
      data-parity={`row-${position}`}
      onClick={() => navigate(row.detailPath)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <RosterAvatar row={row} />
          <div>
            <p
              className="font-semibold text-sm text-text-primary"
              data-parity={rowParity('name')}
            >
              {row.name}
            </p>
            <p
              className="text-xs text-text-secondary mt-0.5"
              data-parity={rowParity('email')}
            >
              {row.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell data-parity={rowParity('status')}>
        <div className="flex flex-wrap items-center gap-2">
          <ClientStatusBadge status={row.status} />
          {row.needsRefund && (
            <NeedsRefundBadge parity={rowParity('needs-refund')} />
          )}
        </div>
      </TableCell>
      <TableCell
        className="text-sm text-text-secondary font-medium"
        data-parity={rowParity('bundle')}
      >
        {row.bundleMonths === null
          ? '—'
          : bundleLengthLabel(row.bundleMonths)}
      </TableCell>
      <TableCell
        className="text-sm text-text-secondary"
        data-parity={rowParity('joined')}
      >
        {row.joinedAt ? format(row.joinedAt, 'MMM dd, yyyy') : '—'}
      </TableCell>
      <TableCell data-parity={rowParity('actions')}>
        <RosterRowLink row={row} />
      </TableCell>
    </TableRow>
  );
}

function emptyRosterCopy(
  selection: RosterSelection,
  totalRows: number,
): { title: string; description: string } {
  if (totalRows === 0 && !hasActiveRosterFilters(selection)) {
    return {
      title: 'No clients yet',
      description: 'Clients appear here once they pay for a bundle.',
    };
  }

  return {
    title: 'No clients found',
    description: emptyRosterMessage(selection),
  };
}

export function ClientsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { journeys } = useClientJourneys();
  const { appState } = useAppState();

  const now = new Date();

  const isRosterSeeded = appState.clientsRoster === 'seeded';
  const rows: RosterRow[] = isRosterSeeded
    ? Object.values(journeys)
        .filter(hasStarted)
        .map((journey) => journeyRosterRow(journey, now))
    : [];

  const status = parseRosterStatus(searchParams.get(STATUS_PARAM));
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const sortKey = parseRosterSortKey(searchParams.get(SORT_PARAM));
  const sort: RosterSort = {
    key: sortKey,
    direction: parseRosterSortDirection(
      searchParams.get(DIRECTION_PARAM),
      sortKey,
    ),
  };

  const selection: RosterSelection = { status, query };
  const matchingRows = sortRows(rowsMatching(rows, selection), sort);
  const counts = countsByStatus(rows, selection);
  const emptyCopy = emptyRosterCopy(selection, rows.length);

  const directionFor = (key: RosterSortKey) =>
    sort.key === key ? sort.direction : defaultRosterSortDirectionFor(key);

  const updateSearchParams = (edit: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    edit(next);
    setSearchParams(next, { replace: true });
  };

  const chooseStatus = (chosen: RosterStatusOption) => {
    updateSearchParams((params) => {
      if (chosen === 'all') params.delete(STATUS_PARAM);
      else params.set(STATUS_PARAM, chosen);
    });
  };

  const changeQuery = (value: string) => {
    updateSearchParams((params) => {
      if (value.length === 0) params.delete(QUERY_PARAM);
      else params.set(QUERY_PARAM, value);
    });
  };

  const chooseSort = (key: RosterSortKey) => {
    const chosen: RosterSort =
      key === sort.key
        ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: defaultRosterSortDirectionFor(key) };

    updateSearchParams((params) => {
      if (chosen.key === DEFAULT_SORT_KEY) params.delete(SORT_PARAM);
      else params.set(SORT_PARAM, chosen.key);

      if (chosen.direction === defaultRosterSortDirectionFor(chosen.key)) {
        params.delete(DIRECTION_PARAM);
      } else {
        params.set(DIRECTION_PARAM, chosen.direction);
      }
    });
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      params.delete(STATUS_PARAM);
      params.delete(QUERY_PARAM);
    });
  };

  if (appState.clientsRoster === 'unavailable') {
    return <ClientsUnavailable />;
  }

  return (
    <div className="w-full" data-parity-root="ClientsSection">
      <PortalPageHeader
        title="Clients"
        subtitle="Manage your active roster and past client records."
      />

      <ListingToolbar
        filters={
          <StatusFilter
            counts={counts}
            status={status}
            onChoose={chooseStatus}
          />
        }
        search={
          <SearchField
            id={SEARCH_FIELD_ID}
            aria-label="Search clients"
            data-parity="clients-search"
            placeholder="Search by name or email"
            size="sm"
            className="w-full sm:w-72"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
          />
        }
      />

      <TablePanel parity="roster-table">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Client"
                parity="sort-name"
                active={sort.key === 'name'}
                direction={directionFor('name')}
                onSort={() => chooseSort('name')}
              />
              <SortableTableHead
                label="Status"
                parity="sort-status"
                active={sort.key === 'status'}
                direction={directionFor('status')}
                onSort={() => chooseSort('status')}
              />
              <SortableTableHead
                label="Bundle / Plan"
                parity="sort-bundle"
                active={sort.key === 'bundle'}
                direction={directionFor('bundle')}
                onSort={() => chooseSort('bundle')}
              />
              <SortableTableHead
                label="Join date"
                parity="sort-joined"
                active={sort.key === 'joined'}
                direction={directionFor('joined')}
                onSort={() => chooseSort('joined')}
              />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchingRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={emptyCopy.title}
                    description={emptyCopy.description}
                    action={
                      hasActiveRosterFilters(selection) ? (
                        <Button variant="outline" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              matchingRows.map((row, index) => (
                <RosterTableRow
                  key={row.id}
                  row={row}
                  position={index + 1}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TablePanel>

    </div>
  );
}
