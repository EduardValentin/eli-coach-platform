import { useState } from 'react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import { UserX, ArrowRight, ShieldAlert, Users } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import {
  RowActionButton,
  RowActionLink,
} from '../../components/RowActionButton';
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
import { EmptyState } from '../../components/EmptyState';
import { SortableTableHead } from '../../components/SortableTableHead';
import { useClientProfile } from '../../context/ClientProfileContext';
import {
  useTraining,
  subscriptionTermLabel,
} from '../../context/TrainingContext';
import {
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import {
  awaitsCoachReview,
  isBeforeStage,
  type ClientJourney,
} from '../../domain/journey';
import {
  clientStatus,
  clientStatusNamed,
  ONBOARDING_STATUS_LABELS,
} from '../../domain/clientStatus';
import { format, parseISO } from 'date-fns';
import { bundleLengthLabel } from '../../domain/bundles';
import { getInitials } from '../../utils/clientHelpers';
import { ClientStatusBadge } from '../../components/coach-portal/ClientStatusBadge';
import { journeyCallIdForClient } from '../../utils/journeyLabels';
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

type RosterClient = {
  id: string;
  name: string;
  email: string;
  status: RosterStatus;
  joinDate: string;
};

const MOCK_CLIENTS: RosterClient[] = [
  {
    id: 'c1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: 'Active',
    joinDate: '2025-10-01',
  },
  {
    id: 'c2',
    name: 'Jessica Alba',
    email: 'jessica@example.com',
    status: 'Active',
    joinDate: '2025-11-15',
  },
  {
    id: 'c3',
    name: 'Emma Stone',
    email: 'emma@example.com',
    status: 'Active',
    joinDate: '2025-12-05',
  },
  {
    id: 'c4',
    name: 'Sarah Jenkins',
    email: 'sarah@example.com',
    status: 'Inactive',
    joinDate: '2025-01-10',
  },
  {
    id: 'c5',
    name: 'Mia Thermopolis',
    email: 'mia@example.com',
    status: 'Inactive',
    joinDate: '2025-03-22',
  },
];

const STATUS_GROUPS: {
  label: string;
  options: readonly RosterStatusOption[];
}[] = [
  { label: 'Onboarding', options: ONBOARDING_STATUS_LABELS },
  { label: 'Active', options: ['Active'] },
  { label: 'Inactive', options: ['Cancelled', 'Inactive'] },
];

const STATUS_PARAM = 'status';
const QUERY_PARAM = 'q';
const SORT_PARAM = 'sort';
const DIRECTION_PARAM = 'dir';
const DEFAULT_SORT_KEY: RosterSortKey = 'joined';
const SEARCH_FIELD_ID = 'clients-search';

function hasStarted(journey: ClientJourney): boolean {
  return !isBeforeStage(journey.stage, 'paid');
}

function journeyBundleLabel(journey: ClientJourney): string {
  return journey.subscription
    ? bundleLengthLabel(journey.subscription.bundle)
    : '—';
}

function journeyName(journey: ClientJourney): string {
  return `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
}

function rowActionLabel(name: string, awaitsReview: boolean): string {
  return awaitsReview
    ? `Review onboarding for ${name}`
    : `View details for ${name}`;
}

function journeyDetailPath(journey: ClientJourney): string {
  return journey.callId === DEMO_JOURNEY_CALL_ID
    ? '/coach/clients/c1'
    : `/coach/clients/${journey.callId}`;
}

function journeyRosterRow(journey: ClientJourney, now: Date): RosterRow {
  const name = journeyName(journey);

  return {
    id: journey.callId,
    name,
    email: journey.identity.email,
    status: clientStatus(journey, now),
    bundleLabel: journeyBundleLabel(journey),
    joinedAt: journey.subscription?.purchasedAt ?? null,
    detailPath: journeyDetailPath(journey),
    actionLabel: rowActionLabel(name, awaitsCoachReview(journey.stage)),
  };
}

function mockRosterRow(
  client: RosterClient,
  avatarUrl: string | undefined,
  bundleLabel: string,
): RosterRow {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    status: clientStatusNamed(client.status),
    bundleLabel,
    joinedAt: parseISO(client.joinDate),
    detailPath: `/coach/clients/${client.id}`,
    actionLabel: rowActionLabel(client.name, false),
    avatarUrl,
    terminable: { status: client.status },
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
      <SelectTrigger aria-label="Status" size="sm" className="w-full sm:w-56">
        <SelectValue>{status === 'all' ? 'All statuses' : status}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            All statuses <Badge variant="count">{counts.all}</Badge>
          </span>
        </SelectItem>
        <SelectSeparator />
        {STATUS_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option} value={option}>
                <span className="flex items-center gap-2">
                  {option} <Badge variant="count">{counts[option]}</Badge>
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
    <div className="w-10 h-10 rounded-full bg-surface-quiet flex items-center justify-center font-serif text-text-primary font-semibold shrink-0">
      {getInitials(row.name)}
    </div>
  );
}

function RosterActions({
  row,
  onTerminate,
}: {
  row: RosterRow;
  onTerminate: (row: RosterRow) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {row.terminable &&
        (row.terminable.status === 'Active' ? (
          <RowActionButton
            icon={ShieldAlert}
            tone="destructive"
            onClick={() => onTerminate(row)}
            title="Terminate subscription"
          >
            Terminate
          </RowActionButton>
        ) : (
          <RowActionButton
            icon={UserX}
            onClick={() => onTerminate(row)}
            title="Remove from system"
          >
            Remove
          </RowActionButton>
        ))}

      <RowActionLink
        to={row.detailPath}
        icon={ArrowRight}
        aria-label={row.actionLabel}
        title={row.actionLabel}
      >
        View
      </RowActionLink>
    </div>
  );
}

function RosterTableRow({
  row,
  onTerminate,
}: {
  row: RosterRow;
  onTerminate: (row: RosterRow) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <RosterAvatar row={row} />
          <div>
            <p className="font-semibold text-sm text-text-primary">
              {row.name}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">{row.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <ClientStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="text-sm text-text-secondary font-medium">
        {row.bundleLabel}
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {row.joinedAt ? format(row.joinedAt, 'MMM dd, yyyy') : '—'}
      </TableCell>
      <TableCell>
        <RosterActions row={row} onTerminate={onTerminate} />
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
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProfile } = useClientProfile();
  const { getClientActiveSubscription, getClientSubscriptions } = useTraining();
  const { journeys } = useClientJourneys();

  const now = new Date();

  const startedJourneys = Object.values(journeys).filter(hasStarted);
  const startedCallIds = new Set(
    startedJourneys.map((journey) => journey.callId),
  );

  const bundleLabelForClient = (id: string) => {
    const subjectId = id === 'c1' ? 'client-1' : id;
    const activeSubscription =
      getClientActiveSubscription(subjectId) ??
      [...getClientSubscriptions(subjectId)].sort((one, other) =>
        (other.startDate || '').localeCompare(one.startDate || ''),
      )[0];

    return activeSubscription ? subscriptionTermLabel(activeSubscription) : '—';
  };

  const journeyRows = startedJourneys.map((journey) =>
    journeyRosterRow(journey, now),
  );

  const mockRows = clients
    .filter((client) => {
      const callId = journeyCallIdForClient(client.id);
      return !(callId !== null && startedCallIds.has(callId));
    })
    .map((client) =>
      mockRosterRow(
        client,
        getProfile(client.id)?.avatarUrl,
        bundleLabelForClient(client.id),
      ),
    );

  const rows: RosterRow[] = [...journeyRows, ...mockRows];

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

  const handleTerminate = (row: RosterRow) => {
    if (!row.terminable) return;

    const actionText =
      row.terminable.status === 'Active'
        ? 'terminate the subscription for'
        : 'remove';

    if (
      window.confirm(
        `Are you sure you want to ${actionText} ${row.name}? This action cannot be undone.`,
      )
    ) {
      setClients((previous) =>
        previous.filter((client) => client.id !== row.id),
      );
    }
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Clients"
        subtitle="Manage your active roster and past client records."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
          <StatusFilter
            counts={counts}
            status={status}
            onChoose={chooseStatus}
          />
        </div>

        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
          <SearchField
            id={SEARCH_FIELD_ID}
            aria-label="Search clients"
            placeholder="Search by name or email"
            size="sm"
            className="w-full sm:w-72"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Client"
                active={sort.key === 'name'}
                direction={directionFor('name')}
                onSort={() => chooseSort('name')}
              />
              <SortableTableHead
                label="Status"
                active={sort.key === 'status'}
                direction={directionFor('status')}
                onSort={() => chooseSort('status')}
              />
              <SortableTableHead
                label="Bundle / Plan"
                active={sort.key === 'bundle'}
                direction={directionFor('bundle')}
                onSort={() => chooseSort('bundle')}
              />
              <SortableTableHead
                label="Join date"
                active={sort.key === 'joined'}
                direction={directionFor('joined')}
                onSort={() => chooseSort('joined')}
              />
              <TableHead className="text-right">Actions</TableHead>
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
              matchingRows.map((row) => (
                <RosterTableRow
                  key={row.id}
                  row={row}
                  onTerminate={handleTerminate}
                />
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
