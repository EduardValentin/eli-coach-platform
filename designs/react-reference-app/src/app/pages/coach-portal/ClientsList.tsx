import { useState } from 'react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import { UserX, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useTraining, subscriptionTermLabel } from '../../context/TrainingContext';
import {
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import {
  awaitsCoachReview,
  isBeforeStage,
  type ClientJourney,
} from '../../domain/journey';
import { getInitials } from '../../utils/clientHelpers';
import { journeyCallIdForClient } from '../../utils/journeyLabels';

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Jane Doe', email: 'jane@example.com', status: 'Active', joinDate: 'Oct 01, 2025' },
  { id: 'c2', name: 'Jessica Alba', email: 'jessica@example.com', status: 'Active', joinDate: 'Nov 15, 2025' },
  { id: 'c3', name: 'Emma Stone', email: 'emma@example.com', status: 'Active', joinDate: 'Dec 05, 2025' },
  { id: 'c4', name: 'Sarah Jenkins', email: 'sarah@example.com', status: 'Inactive', joinDate: 'Jan 10, 2025' },
  { id: 'c5', name: 'Mia Thermopolis', email: 'mia@example.com', status: 'Inactive', joinDate: 'Mar 22, 2025' },
];

const FILTERS = ['All', 'Active', 'Inactive', 'Onboarding'] as const;

type RosterFilter = (typeof FILTERS)[number];

const SEARCH_FIELD_ID = 'clients-search';

function parseRosterFilter(value: string): RosterFilter {
  return FILTERS.find((filter) => filter === value) ?? 'All';
}

function isOnboarding(journey: ClientJourney): boolean {
  return (
    !isBeforeStage(journey.stage, 'account-created') &&
    journey.stage !== 'review-call-scheduled'
  );
}

function journeyName(journey: ClientJourney): string {
  return `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
}

function rowActionLabel(journey: ClientJourney, name: string): string {
  return awaitsCoachReview(journey.stage)
    ? `Review onboarding for ${name}`
    : `View details for ${name}`;
}

function OnboardingRow({ journey }: { journey: ClientJourney }) {
  const name = journeyName(journey);
  const actionLabel = rowActionLabel(journey, name);
  const detailPath =
    journey.callId === DEMO_JOURNEY_CALL_ID
      ? '/coach/clients/c1'
      : `/coach/clients/${journey.callId}`;

  return (
    <tr className="px-3 border-b border-neutral-50 rounded-field hover:bg-neutral-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-text-primary font-semibold shrink-0">
            {getInitials(name)}
          </div>
          <div>
            <p className="font-semibold text-sm text-text-primary">{name}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {journey.identity.email}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-sm text-text-secondary">—</td>
      <td className="py-4 px-6 text-sm text-text-secondary">—</td>
      <td className="py-4 px-6 text-sm text-text-secondary">—</td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-end gap-3">
          <Link
            to={detailPath}
            aria-label={actionLabel}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200 text-text-secondary hover:bg-text-primary hover:text-white hover:border-text-primary transition-all"
            title={actionLabel}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function ClientsList() {
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<RosterFilter>('All');
  const { getProfile } = useClientProfile();
  const { getClientActiveSubscription, getClientSubscriptions } = useTraining();
  const { journeys } = useClientJourneys();

  const onboardingJourneys = Object.values(journeys).filter(isOnboarding);
  const onboardingCallIds = new Set(
    onboardingJourneys.map((journey) => journey.callId),
  );

  const subClientId = (id: string) => (id === 'c1' ? 'client-1' : id);
  const bundleLabel = (id: string) => {
    const cid = subClientId(id);
    const sub = getClientActiveSubscription(cid)
      ?? [...getClientSubscriptions(cid)].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0];
    return sub ? subscriptionTermLabel(sub) : '—';
  };

  const matchesSearch = (name: string, email: string) => {
    const needle = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(needle) || email.toLowerCase().includes(needle)
    );
  };

  const showsRoster = filter !== 'Onboarding';
  const showsOnboarding = filter === 'All' || filter === 'Onboarding';

  const filteredClients = showsRoster
    ? clients.filter(client => {
        const callId = journeyCallIdForClient(client.id);
        const inOnboarding = callId !== null && onboardingCallIds.has(callId);
        const matchesFilter = filter === 'All' || client.status === filter;
        return (
          !inOnboarding &&
          matchesFilter &&
          matchesSearch(client.name, client.email)
        );
      })
    : [];

  const filteredOnboarding = showsOnboarding
    ? onboardingJourneys.filter(journey =>
        matchesSearch(journeyName(journey), journey.identity.email),
      )
    : [];

  const rowCount = filteredClients.length + filteredOnboarding.length;

  const handleRemoveClient = (id: string, name: string, status: string) => {
    const actionText = status === 'Active' ? 'terminate the subscription for' : 'remove';
    if (window.confirm(`Are you sure you want to ${actionText} ${name}? This action cannot be undone.`)) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Clients"
        subtitle="Manage your active roster and past client records."
      />

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(parseRosterFilter(value))}
        className="w-full"
      >
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
          <TabsList aria-label="Show" variant="segmented">
            {FILTERS.map((option) => (
              <TabsTrigger key={option} variant="segmented" value={option}>
                {option}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="w-full xl:w-72 xl:shrink-0">
            <Label className="sr-only" htmlFor={SEARCH_FIELD_ID}>
              Search clients
            </Label>
            <Input
              id={SEARCH_FIELD_ID}
              type="search"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <TabsContent variant="segmented" value={filter}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="px-3 border-b border-neutral-100 rounded-field bg-neutral-50/50">
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Client</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bundle / Plan</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Join Date</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOnboarding.map(journey => (
                    <OnboardingRow key={journey.callId} journey={journey} />
                  ))}
                  {filteredClients.map(client => {
                      const profile = getProfile(client.id);
                      const avatarUrl = profile?.avatarUrl;
                      return (
                      <tr key={client.id} className="px-3 border-b border-neutral-50 rounded-field hover:bg-neutral-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-text-primary font-semibold shrink-0">
                                {getInitials(client.name)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm text-text-primary">{client.name}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-field text-[10px] font-bold uppercase tracking-widest ${
                            client.status === 'Active' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-neutral-100 text-text-secondary'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-text-secondary font-medium">{bundleLabel(client.id)}</td>
                        <td className="py-4 px-6 text-sm text-text-secondary">{client.joinDate}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                            <button 
                              onClick={() => handleRemoveClient(client.id, client.name, client.status)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold transition-colors ${
                                client.status === 'Active'
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-text-secondary hover:bg-neutral-100 hover:text-neutral-900'
                              }`}
                              title={client.status === 'Active' ? 'Terminate Subscription' : 'Remove from System'}
                            >
                              {client.status === 'Active' ? <ShieldAlert size={14} /> : <UserX size={14} />}
                              {client.status === 'Active' ? 'Terminate' : 'Remove'}
                            </button>

                            <Link 
                              to={`/coach/clients/${client.id}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200 text-text-secondary hover:bg-text-primary hover:text-white hover:border-text-primary transition-all"
                              title="View Details"
                            >
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  {rowCount === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-secondary text-sm">
                        No clients found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}