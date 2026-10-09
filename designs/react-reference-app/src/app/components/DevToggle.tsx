import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Settings, X } from 'lucide-react';
import {
  useAppState,
  JOURNEY_AGE_BANDS,
  PROTOTYPE_CLIENTS_ROSTERS,
  type JourneyAgeBand,
  type PrototypeClientsRoster,
  type PrototypeMode,
  type PrototypeSession,
  type PrototypeWaitlistAvailability,
} from '../context/AppContext';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import type { PrototypeSignInOutcome } from '../services/authService';
import {
  PROTOTYPE_INVITATION_STANDINGS,
  PROTOTYPE_INVITATION_RESEND_OUTCOMES,
  type PrototypeInvitationStanding,
  type PrototypeInvitationLinkState,
  type PrototypeInvitationResendOutcome,
} from '../services/invitationService';
import type {
  PrototypePaymentLinkOutcome,
  PrototypePaymentLinkState,
} from '../services/paymentLinkService';
import {
  JOURNEY_GENDERS,
  JOURNEY_STAGES,
  type JourneyGender,
  type JourneyStage,
} from '../domain/journey';
import {
  ONBOARDING_CONNECTIONS,
  type OnboardingConnection,
} from '../services/onboardingService';
import {
  MEASUREMENT_SAVE_OUTCOMES,
  PHOTO_PROCESSING_OUTCOMES,
  PHOTO_REMOVAL_OUTCOMES,
} from '../services/measurementService';
import {
  PROTOTYPE_CARDS_ON_FILE,
  PROTOTYPE_DAYS_SINCE_PAYMENT,
  PROTOTYPE_LIFE_STAGES,
  PROTOTYPE_MEASUREMENTS_DUE,
  PROTOTYPE_REFUNDS,
  PROTOTYPE_SEEDED_PHOTOS,
  type PrototypeCardOnFile,
  type PrototypeDaysSincePayment,
  type PrototypeRefund,
} from '../services/clientJourneySamples';
import {
  PROTOTYPE_CANCEL_OUTCOMES,
  PROTOTYPE_PAYMENT_PORTAL_OUTCOMES,
  PROTOTYPE_START_NOW_OUTCOMES,
  type PrototypeCancelOutcome,
  type PrototypePaymentPortalOutcome,
  type PrototypeStartNowOutcome,
} from '../services/subscriptionService';
import {
  RESOURCE_LOAD_OUTCOMES,
  RESOURCE_MARK_OUTCOMES,
  RESOURCE_SEEDS,
  RESOURCE_UPLOAD_OUTCOMES,
  RESOURCE_WRITE_OUTCOMES,
} from '../services/resourceService';
import { optionOrDefault } from '../utils/optionOrDefault';
import type {
  SubscriptionStartPath,
  SubscriptionStatus,
} from '../domain/coachingSubscription';
import type {
  PrototypeBooking,
  PrototypeBookingOutcome,
  PrototypeCallSettingsSaveOutcome,
  PrototypeCoachListingOutcome,
} from '../services/assessmentCallService';
import {
  sampleDashboardBookings,
  sampleImminentBookings,
  sampleManyBookings,
  sampleTwoLeftTodayBookings,
} from '../services/assessmentCallSamples';
import { useAssessmentCalls } from '../context/AssessmentCallContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { DEMO_CLIENT, useCheckins } from '../context/CheckinContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

function parseWaitlistAvailabilityControl(
  value: string,
): PrototypeWaitlistAvailability {
  if (value === 'available' || value === 'limited' || value === 'closed') {
    return value;
  }

  return null;
}

function parseSessionControl(value: string): PrototypeSession {
  if (value === 'client' || value === 'coach') {
    return value;
  }

  return 'anonymous';
}

function parsePrototypeModeControl(value: string): PrototypeMode {
  return value === 'post-mvp' ? 'post-mvp' : 'mvp';
}

function parseSignInOutcomeControl(value: string): PrototypeSignInOutcome {
  if (value === 'coach' || value === 'provisioning-failure') {
    return value;
  }

  return 'client';
}

function parseStoreCheckoutOutcomeControl(
  value: string,
): PrototypeStoreCheckoutOutcome {
  if (
    value === 'bot-rejected' ||
    value === 'delivery-failure' ||
    value === 'rate-limited-cooldown' ||
    value === 'rate-limited-daily' ||
    value === 'server-error' ||
    value === 'unavailable-product'
  ) {
    return value;
  }

  return 'success';
}

function parseJourneyStageControl(value: string): JourneyStage {
  const stage = JOURNEY_STAGES.find((candidate) => candidate === value);

  return stage ?? 'review-call-scheduled';
}

function parseStartPathControl(value: string): SubscriptionStartPath {
  if (value === 'waiting') return value;

  return 'immediate';
}

function parseSubscriptionStatusControl(value: string): SubscriptionStatus {
  if (value === 'not-started' || value === 'cancelled' || value === 'ended') {
    return value;
  }

  return 'active';
}

function parseJourneyGenderControl(value: string): JourneyGender {
  const gender = JOURNEY_GENDERS.find((candidate) => candidate === value);

  return gender ?? 'female';
}

function parseJourneyAgeBandControl(value: string): JourneyAgeBand {
  const band = JOURNEY_AGE_BANDS.find((candidate) => candidate === value);

  return band ?? 'adult';
}

function parseOnboardingConnectionControl(value: string): OnboardingConnection {
  const connection = ONBOARDING_CONNECTIONS.find(
    (candidate) => candidate === value,
  );

  return connection ?? 'working';
}

function parsePaymentLinkOutcomeControl(
  value: string,
): PrototypePaymentLinkOutcome {
  if (value === 'delivery-failure' || value === 'unavailable') return value;

  return 'sent';
}

function parsePaymentLinkStateControl(
  value: string,
): PrototypePaymentLinkState {
  if (value === 'expired' || value === 'used' || value === 'invalid') {
    return value;
  }

  return 'valid';
}

function parseInvitationLinkStateControl(
  value: string,
): PrototypeInvitationLinkState {
  if (value === 'expired' || value === 'used' || value === 'unknown') {
    return value;
  }

  return 'valid';
}

function parseInvitationStandingControl(value: string): PrototypeInvitationStanding {
  const invitation = PROTOTYPE_INVITATION_STANDINGS.find(
    (candidate) => candidate === value,
  );

  return invitation ?? 'sent';
}

function parseInvitationResendOutcomeControl(
  value: string,
): PrototypeInvitationResendOutcome {
  const outcome = PROTOTYPE_INVITATION_RESEND_OUTCOMES.find(
    (candidate) => candidate === value,
  );

  return outcome ?? 'sent';
}

function parseClientsRosterControl(value: string): PrototypeClientsRoster {
  const roster = PROTOTYPE_CLIENTS_ROSTERS.find(
    (candidate) => candidate === value,
  );

  return roster ?? 'seeded';
}

function parseBookingOutcomeControl(value: string): PrototypeBookingOutcome {
  if (
    value === 'slot_unavailable' ||
    value === 'booking_refused' ||
    value === 'invalid_email' ||
    value === 'server_error'
  ) {
    return value;
  }

  return 'success';
}

type DashboardCallsSeed = 'none' | 'one' | 'twoLeftToday' | 'sample' | 'many';

type PendingCheckinsSeed = 'seeded' | 'none' | 'many';

function parseCoachListingControl(value: string): PrototypeCoachListingOutcome {
  if (value === 'unavailable') return value;

  return 'ok';
}

function parsePendingCheckinsControl(value: string): PendingCheckinsSeed {
  if (value === 'none' || value === 'many') return value;

  return 'seeded';
}

function parseDashboardCallsControl(value: string): DashboardCallsSeed {
  if (
    value === 'one' ||
    value === 'twoLeftToday' ||
    value === 'sample' ||
    value === 'many'
  ) {
    return value;
  }

  return 'none';
}

function parseCallSettingsSaveOutcomeControl(
  value: string,
): PrototypeCallSettingsSaveOutcome {
  if (value === 'server_error') return value;
  return 'saved';
}

const DAYS_SINCE_PAYMENT_LABELS: Record<PrototypeDaysSincePayment, string> = {
  stage: 'Follows the journey stage',
  '1': '1 day',
  '5': '5 days',
  '13': '13 days (last refundable day)',
  '14': '14 days (withdrawal right gone)',
  '30': '30 days',
  '100': '100 days (past the bundle)',
};

const REFUND_LABELS: Record<PrototypeRefund, string> = {
  none: 'None',
  due: 'Due',
  'part-refunded': 'Part refunded',
  refunded: 'Refunded',
};

const CARD_ON_FILE_LABELS: Record<PrototypeCardOnFile, string> = {
  visa: 'Visa •••• 4242, 12/34',
  mastercard: 'Mastercard •••• 4444, 03/31',
  none: 'No card',
};

const CANCEL_OUTCOME_LABELS: Record<PrototypeCancelOutcome, string> = {
  works: 'Works',
  fails: 'Fails',
};

const START_NOW_OUTCOME_LABELS: Record<PrototypeStartNowOutcome, string> = {
  works: 'Works',
  fails: 'Fails',
};

const PAYMENT_PORTAL_OUTCOME_LABELS: Record<
  PrototypePaymentPortalOutcome,
  string
> = {
  works: 'Works',
  fails: 'Fails',
};

const SELECT_CONTENT_CLASS = 'z-[10000]';

const TAB_TRIGGER_CLASS = 'h-auto flex-auto';

const TAB_PANEL_CLASS = 'space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1';

const DEV_LABEL_CLASS =
  'text-xs font-semibold text-copy-muted uppercase tracking-wider';

function DevCheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </div>
  );
}

export function DevToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [dashboardCalls, setDashboardCalls] =
    useState<DashboardCallsSeed>('many');
  const [pendingCheckins, setPendingCheckins] =
    useState<PendingCheckinsSeed>('seeded');
  const { appState, setAppState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const journeyStages = JOURNEY_STAGES.filter(
    (stage) =>
      isPostMvp ||
      (stage !== 'program-ready' && stage !== 'review-call-scheduled'),
  );
  const { replaceBookings } = useAssessmentCalls();
  const { journeys } = useClientJourneys();
  const { search } = useLocation();
  const withDevParams = (path: string) => {
    const [address, fragment = ''] = path.split('#');
    const [pathname, query = ''] = address.split('?');
    const params = new URLSearchParams(search);
    params.delete('session');
    new URLSearchParams(query).forEach((value, key) => params.set(key, value));
    const joined = params.toString();
    const hash = fragment.length > 0 ? `#${fragment}` : '';

    return joined.length > 0 ? `${pathname}?${joined}${hash}` : `${pathname}${hash}`;
  };

  const journeyLinks = Object.values(journeys).flatMap((journey) => [
    ...(journey.paymentLink
      ? [
          {
            key: `${journey.callId}-payment`,
            label: `Open payment link · ${journey.identity.firstName} ${journey.identity.lastName}`,
            to: withDevParams(`/select-bundle#${journey.paymentLink.token}`),
          },
        ]
      : []),
    ...(journey.invitation
      ? [
          {
            key: `${journey.callId}-invitation`,
            label: `Open invitation link · ${journey.identity.firstName} ${journey.identity.lastName}`,
            to: withDevParams(`/invitation#${journey.invitation.token}`),
          },
        ]
      : []),
  ]);
  const {
    clearPendingCheckins,
    restoreSeededCheckins,
    seedManyCheckins,
    hasOpenClientRequest,
    setOpenClientRequest,
    hasLiveCheckin,
    setLiveCheckin,
  } = useCheckins();

  const seedDashboardCalls = (value: string) => {
    const seed = parseDashboardCallsControl(value);
    const now = new Date();
    const seeds: Record<DashboardCallsSeed, PrototypeBooking[]> = {
      none: [],
      one: sampleImminentBookings(now),
      twoLeftToday: sampleTwoLeftTodayBookings(now),
      sample: sampleDashboardBookings(now),
      many: sampleManyBookings(now),
    };
    setDashboardCalls(seed);
    replaceBookings(seeds[seed]);
  };

  useEffect(() => {
    replaceBookings(sampleManyBookings(new Date()));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seedPendingCheckins = (value: string) => {
    const seed = parsePendingCheckinsControl(value);

    setPendingCheckins(seed);

    if (seed === 'none') {
      clearPendingCheckins();
      return;
    }

    if (seed === 'many') {
      seedManyCheckins();
      return;
    }

    restoreSeededCheckins();
  };

  const setPrototypeMode = (value: string) => {
    const prototypeMode = parsePrototypeModeControl(value);
    const journeyStage =
      prototypeMode === 'mvp' &&
      (appState.journeyStage === 'program-ready' ||
        appState.journeyStage === 'review-call-scheduled')
        ? 'approved'
        : appState.journeyStage;

    setAppState({ prototypeMode, journeyStage });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="pointer-events-auto fixed right-4 z-[9999] bg-surface-inverted text-surface-inverted-foreground p-3 rounded-full shadow-lg hover:bg-brand transition-colors bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-4"
        aria-label="Open Dev Toggle"
      >
        <Settings size={24} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto fixed right-4 z-[9999] bg-card p-5 rounded-card shadow-2xl border border-control-border-soft w-80 max-w-[calc(100vw-2rem)] bottom-[calc(env(safe-area-inset-bottom)+9rem)] lg:bottom-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Dev Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Dev Settings"
                className="text-copy-muted hover:text-foreground"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <Label htmlFor="dev-prototype-mode" className={DEV_LABEL_CLASS}>
                Prototype mode
              </Label>
              <Select
                value={appState.prototypeMode}
                onValueChange={setPrototypeMode}
              >
                <SelectTrigger id="dev-prototype-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                  <SelectItem value="mvp">MVP</SelectItem>
                  <SelectItem value="post-mvp">Post-MVP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs key={appState.prototypeMode} defaultValue="session">
              <TabsList className="h-auto w-full flex-wrap gap-1">
                <TabsTrigger value="session" className={TAB_TRIGGER_CLASS}>
                  Session
                </TabsTrigger>
                <TabsTrigger value="store" className={TAB_TRIGGER_CLASS}>
                  Store
                </TabsTrigger>
                <TabsTrigger value="booking" className={TAB_TRIGGER_CLASS}>
                  Booking
                </TabsTrigger>
                <TabsTrigger value="waitlist" className={TAB_TRIGGER_CLASS}>
                  Waitlist
                </TabsTrigger>
                {isPostMvp && (
                  <TabsTrigger value="nutrition" className={TAB_TRIGGER_CLASS}>
                    Nutrition
                  </TabsTrigger>
                )}
                <TabsTrigger value="coach" className={TAB_TRIGGER_CLASS}>
                  Coach
                </TabsTrigger>
                <TabsTrigger value="checkins" className={TAB_TRIGGER_CLASS}>
                  Check-ins
                </TabsTrigger>
                <TabsTrigger value="journey" className={TAB_TRIGGER_CLASS}>
                  Journey
                </TabsTrigger>
                <TabsTrigger value="resources" className={TAB_TRIGGER_CLASS}>
                  Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="session" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-session"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Session
                  </Label>
                  <Select
                    value={appState.session}
                    onValueChange={(value) =>
                      setAppState({ session: parseSessionControl(value) })
                    }
                  >
                    <SelectTrigger id="dev-session" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="anonymous">
                        Anonymous visitor
                      </SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-signin-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Sign-in outcome
                  </Label>
                  <Select
                    value={appState.signInOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        signInOutcome: parseSignInOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-signin-outcome" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="client">Signs in as client</SelectItem>
                      <SelectItem value="coach">Signs in as coach</SelectItem>
                      <SelectItem value="provisioning-failure">
                        Account provisioning failure
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Link
                  to="/403"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Open denied-access page{' '}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>

                <DevCheckboxRow
                  id="dev-has-bundle"
                  label="Has Bundle"
                  checked={appState.hasBundle}
                  onCheckedChange={(checked) =>
                    setAppState({ hasBundle: checked })
                  }
                />
              </TabsContent>

              <TabsContent value="store" className={TAB_PANEL_CLASS}>
                <DevCheckboxRow
                  id="dev-store-empty-catalog"
                  label="Empty catalog"
                  checked={appState.isStoreCatalogEmpty}
                  onCheckedChange={(checked) =>
                    setAppState({ isStoreCatalogEmpty: checked })
                  }
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-store-checkout-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Checkout outcome
                  </Label>
                  <Select
                    value={appState.storeCheckoutOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        storeCheckoutOutcome:
                          parseStoreCheckoutOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-store-checkout-outcome"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="bot-rejected">
                        Bot verification rejected
                      </SelectItem>
                      <SelectItem value="delivery-failure">
                        Delivery failure
                      </SelectItem>
                      <SelectItem value="rate-limited-cooldown">
                        Rate limited (cooldown)
                      </SelectItem>
                      <SelectItem value="rate-limited-daily">
                        Rate limited (daily)
                      </SelectItem>
                      <SelectItem value="server-error">
                        Server failure
                      </SelectItem>
                      <SelectItem value="unavailable-product">
                        Unavailable product in cart
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DevCheckboxRow
                  id="dev-store-download-unavailable"
                  label="Download link unavailable"
                  checked={appState.isDownloadUnavailable}
                  onCheckedChange={(checked) =>
                    setAppState({ isDownloadUnavailable: checked })
                  }
                />
                <Link
                  to="/downloads"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Open download page <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </TabsContent>

              <TabsContent value="booking" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-booking-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Booking outcome
                  </Label>
                  <Select
                    value={appState.bookingOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        bookingOutcome: parseBookingOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-booking-outcome" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="success">Call booked</SelectItem>
                      <SelectItem value="slot_unavailable">
                        Time taken while filling in details
                      </SelectItem>
                      <SelectItem value="booking_refused">
                        Booking refused (email already has a call)
                      </SelectItem>
                      <SelectItem value="invalid_email">
                        Email rejected by the server
                      </SelectItem>
                      <SelectItem value="server_error">
                        Server failure
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-copy-muted">
                    Bot verification runs on the real server, so the prototype
                    never rejects a booking as a bot.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-dashboard-calls"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Assessment calls
                  </Label>
                  <Select
                    value={dashboardCalls}
                    onValueChange={seedDashboardCalls}
                  >
                    <SelectTrigger id="dev-dashboard-calls" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="one">One upcoming call</SelectItem>
                      <SelectItem value="twoLeftToday">
                        Two calls left today
                      </SelectItem>
                      <SelectItem value="sample">
                        Sample calls (today, upcoming, past)
                      </SelectItem>
                      <SelectItem value="many">Many calls (30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DevCheckboxRow
                  id="dev-booking-slots-unavailable"
                  label="Slots unavailable"
                  checked={appState.bookingSlotsUnavailable}
                  onCheckedChange={(checked) =>
                    setAppState({ bookingSlotsUnavailable: checked })
                  }
                />
                <Link
                  to="/book"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Open booking page <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-call-settings-save-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Assessment call settings save outcome
                  </Label>
                  <Select
                    value={appState.callSettingsSaveOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        callSettingsSaveOutcome:
                          parseCallSettingsSaveOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-call-settings-save-outcome"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="server_error">
                        Server failure
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Link
                  to="/coach/settings"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Open coach settings{' '}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </TabsContent>

              <TabsContent value="waitlist" className={TAB_PANEL_CLASS}>
                <DevCheckboxRow
                  id="dev-waitlist-mode"
                  label="Waiting List Mode"
                  checked={appState.isWaitlistMode}
                  onCheckedChange={(checked) =>
                    setAppState({ isWaitlistMode: checked })
                  }
                />

                {appState.isWaitlistMode && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="dev-waitlist-availability"
                      className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                    >
                      Availability
                    </Label>
                    <Select
                      value={appState.waitlistAvailability ?? 'unavailable'}
                      onValueChange={(value) =>
                        setAppState({
                          waitlistAvailability:
                            parseWaitlistAvailabilityControl(value),
                        })
                      }
                    >
                      <SelectTrigger
                        id="dev-waitlist-availability"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={SELECT_CONTENT_CLASS}>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              {isPostMvp && (
                <TabsContent value="nutrition" className={TAB_PANEL_CLASS}>
                  <DevCheckboxRow
                    id="dev-nutrition-block-completed"
                    label="Block completed (show review)"
                    checked={appState.nutritionBlockCompleted}
                    onCheckedChange={(checked) =>
                      setAppState({ nutritionBlockCompleted: checked })
                    }
                  />
                  <DevCheckboxRow
                    id="dev-nutrition-preference-conflict"
                    label="Preference conflict (salmon)"
                    checked={appState.nutritionPreferenceConflict}
                    onCheckedChange={(checked) =>
                      setAppState({ nutritionPreferenceConflict: checked })
                    }
                  />
                </TabsContent>
              )}

              <TabsContent value="checkins" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-pending-checkins"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Pending check-ins
                  </Label>
                  <Select
                    value={pendingCheckins}
                    onValueChange={seedPendingCheckins}
                  >
                    <SelectTrigger id="dev-pending-checkins" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="seeded">Seeded check-ins</SelectItem>
                      <SelectItem value="none">None pending</SelectItem>
                      <SelectItem value="many">Many check-ins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DevCheckboxRow
                  id="dev-open-client-request"
                  label="Client has an open request"
                  checked={hasOpenClientRequest(DEMO_CLIENT.id)}
                  onCheckedChange={setOpenClientRequest}
                />
                <DevCheckboxRow
                  id="dev-live-checkin"
                  label="Client check-in live now"
                  checked={hasLiveCheckin}
                  onCheckedChange={setLiveCheckin}
                />
              </TabsContent>

              <TabsContent value="coach" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-coach-calls-listing"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Assessment calls listing
                  </Label>
                  <Select
                    value={appState.coachCallsOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        coachCallsOutcome: parseCoachListingControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-coach-calls-listing"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="ok">Calls loaded</SelectItem>
                      <SelectItem value="unavailable">
                        Assessment calls unavailable
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-clients-roster"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Clients roster
                  </Label>
                  <Select
                    value={appState.clientsRoster}
                    onValueChange={(value) =>
                      setAppState({
                        clientsRoster: parseClientsRosterControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-clients-roster" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="seeded">Seeded</SelectItem>
                      <SelectItem value="empty">Empty</SelectItem>
                      <SelectItem value="unavailable">
                        Clients unavailable
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="journey" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-stage"
                    className={DEV_LABEL_CLASS}
                  >
                    Journey stage
                  </Label>
                  <Select
                    value={appState.journeyStage}
                    onValueChange={(value) =>
                      setAppState({
                        journeyStage: parseJourneyStageControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-journey-stage" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {journeyStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-start-path"
                    className={DEV_LABEL_CLASS}
                  >
                    Start path
                  </Label>
                  <Select
                    value={appState.journeyStartPath}
                    onValueChange={(value) => {
                      const startPath = parseStartPathControl(value);
                      setAppState({
                        journeyStartPath: startPath,
                        journeyRefund:
                          startPath === 'waiting'
                            ? appState.journeyRefund
                            : 'none',
                      });
                    }}
                  >
                    <SelectTrigger
                      id="dev-journey-start-path"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="immediate">Immediate start</SelectItem>
                      <SelectItem value="waiting">
                        Waiting out the 14 days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-subscription"
                    className={DEV_LABEL_CLASS}
                  >
                    Subscription state
                  </Label>
                  <Select
                    value={appState.journeySubscriptionStatus}
                    onValueChange={(value) => {
                      const status = parseSubscriptionStatusControl(value);
                      setAppState({
                        journeySubscriptionStatus: status,
                        journeyRefund:
                          status === 'ended' ? appState.journeyRefund : 'none',
                      });
                    }}
                  >
                    <SelectTrigger
                      id="dev-journey-subscription"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="not-started">Not started</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-days-since-payment"
                    className={DEV_LABEL_CLASS}
                  >
                    Days since payment
                  </Label>
                  <Select
                    value={appState.journeyDaysSincePayment}
                    onValueChange={(value) =>
                      setAppState({
                        journeyDaysSincePayment: optionOrDefault(
                          PROTOTYPE_DAYS_SINCE_PAYMENT,
                          value,
                          'stage',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-journey-days-since-payment"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_DAYS_SINCE_PAYMENT.map((days) => (
                        <SelectItem key={days} value={days}>
                          {DAYS_SINCE_PAYMENT_LABELS[days]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-refund"
                    className={DEV_LABEL_CLASS}
                  >
                    Refund
                  </Label>
                  <Select
                    value={appState.journeyRefund}
                    onValueChange={(value) => {
                      const refund = optionOrDefault(
                        PROTOTYPE_REFUNDS,
                        value,
                        'none',
                      );
                      setAppState(
                        refund === 'none'
                          ? { journeyRefund: refund }
                          : {
                              journeyRefund: refund,
                              journeySubscriptionStatus: 'ended',
                              journeyStartPath: 'waiting',
                            },
                      );
                    }}
                  >
                    <SelectTrigger id="dev-journey-refund" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_REFUNDS.map((refund) => (
                        <SelectItem key={refund} value={refund}>
                          {REFUND_LABELS[refund]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DevCheckboxRow
                  id="dev-journey-payment-problem"
                  label="Payment problem"
                  checked={appState.journeyPaymentProblem}
                  onCheckedChange={(checked) =>
                    setAppState({ journeyPaymentProblem: checked })
                  }
                />

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-card-on-file"
                    className={DEV_LABEL_CLASS}
                  >
                    Card on file
                  </Label>
                  <Select
                    value={appState.journeyCardOnFile}
                    onValueChange={(value) =>
                      setAppState({
                        journeyCardOnFile: optionOrDefault(
                          PROTOTYPE_CARDS_ON_FILE,
                          value,
                          'visa',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-journey-card-on-file"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_CARDS_ON_FILE.map((card) => (
                        <SelectItem key={card} value={card}>
                          {CARD_ON_FILE_LABELS[card]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-cancel-outcome"
                    className={DEV_LABEL_CLASS}
                  >
                    Cancel outcome
                  </Label>
                  <Select
                    value={appState.cancelOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        cancelOutcome: optionOrDefault(
                          PROTOTYPE_CANCEL_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger id="dev-cancel-outcome" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_CANCEL_OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome} value={outcome}>
                          {CANCEL_OUTCOME_LABELS[outcome]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-start-now-outcome"
                    className={DEV_LABEL_CLASS}
                  >
                    Start now outcome
                  </Label>
                  <Select
                    value={appState.startNowOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        startNowOutcome: optionOrDefault(
                          PROTOTYPE_START_NOW_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-start-now-outcome"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_START_NOW_OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome} value={outcome}>
                          {START_NOW_OUTCOME_LABELS[outcome]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-payment-portal-outcome"
                    className={DEV_LABEL_CLASS}
                  >
                    Payment method hand-off
                  </Label>
                  <Select
                    value={appState.paymentPortalOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        paymentPortalOutcome: optionOrDefault(
                          PROTOTYPE_PAYMENT_PORTAL_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-payment-portal-outcome"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      {PROTOTYPE_PAYMENT_PORTAL_OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome} value={outcome}>
                          {PAYMENT_PORTAL_OUTCOME_LABELS[outcome]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-gender"
                    className={DEV_LABEL_CLASS}
                  >
                    Gender
                  </Label>
                  <Select
                    value={appState.journeyGender}
                    onValueChange={(value) =>
                      setAppState({
                        journeyGender: parseJourneyGenderControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-journey-gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-age-band"
                    className={DEV_LABEL_CLASS}
                  >
                    Client age
                  </Label>
                  <Select
                    value={appState.journeyAgeBand}
                    onValueChange={(value) =>
                      setAppState({
                        journeyAgeBand: parseJourneyAgeBandControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-journey-age-band"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="adult">Adult (default)</SelectItem>
                      <SelectItem value="under-15">Under 15</SelectItem>
                      <SelectItem value="over-69">Over 69</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-onboarding-connection"
                    className={DEV_LABEL_CLASS}
                  >
                    Onboarding connection
                  </Label>
                  <Select
                    value={appState.journeyConnection}
                    onValueChange={(value) =>
                      setAppState({
                        journeyConnection:
                          parseOnboardingConnectionControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-onboarding-connection"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="working">Working</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-measurements-due"
                    className={DEV_LABEL_CLASS}
                  >
                    Measurements due
                  </Label>
                  <Select
                    value={appState.journeyMeasurementsDue}
                    onValueChange={(value) =>
                      setAppState({
                        journeyMeasurementsDue: optionOrDefault(
                          PROTOTYPE_MEASUREMENTS_DUE,
                          value,
                          'none',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-measurements-due"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">Nothing due</SelectItem>
                      <SelectItem value="weigh-in">Weekly weigh-in</SelectItem>
                      <SelectItem value="measurements">
                        Measurements and photos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-journey-life-stage"
                    className={DEV_LABEL_CLASS}
                  >
                    Life stage
                  </Label>
                  <Select
                    value={appState.journeyLifeStage}
                    onValueChange={(value) =>
                      setAppState({
                        journeyLifeStage: optionOrDefault(
                          PROTOTYPE_LIFE_STAGES,
                          value,
                          'none',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-journey-life-stage"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">None of these</SelectItem>
                      <SelectItem value="pregnant">Pregnant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-photo-processing"
                    className={DEV_LABEL_CLASS}
                  >
                    Photo processing
                  </Label>
                  <Select
                    value={appState.photoProcessing}
                    onValueChange={(value) =>
                      setAppState({
                        photoProcessing: optionOrDefault(
                          PHOTO_PROCESSING_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-photo-processing"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="refuses">Refuses every photo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-measurement-save"
                    className={DEV_LABEL_CLASS}
                  >
                    Measurement save
                  </Label>
                  <Select
                    value={appState.measurementSave}
                    onValueChange={(value) =>
                      setAppState({
                        measurementSave: optionOrDefault(
                          MEASUREMENT_SAVE_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-measurement-save"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-photo-removal"
                    className={DEV_LABEL_CLASS}
                  >
                    Photo removal
                  </Label>
                  <Select
                    value={appState.photoRemoval}
                    onValueChange={(value) =>
                      setAppState({
                        photoRemoval: optionOrDefault(
                          PHOTO_REMOVAL_OUTCOMES,
                          value,
                          'works',
                        ),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-photo-removal"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-seeded-photos"
                    className={DEV_LABEL_CLASS}
                  >
                    Seeded photos
                  </Label>
                  <Select
                    value={appState.journeySeededPhotos}
                    onValueChange={(value) =>
                      setAppState({
                        journeySeededPhotos: optionOrDefault(
                          PROTOTYPE_SEEDED_PHOTOS,
                          value,
                          'none',
                        ),
                      })
                    }
                  >
                    <SelectTrigger id="dev-seeded-photos" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="latest">On the latest entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DevCheckboxRow
                  id="dev-journey-reduced-pricing"
                  label="Reduced pricing"
                  checked={appState.journeyReducedPricing}
                  onCheckedChange={(checked) =>
                    setAppState({ journeyReducedPricing: checked })
                  }
                />

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-payment-link-outcome"
                    className={DEV_LABEL_CLASS}
                  >
                    Payment link outcome
                  </Label>
                  <Select
                    value={appState.paymentLinkOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        paymentLinkOutcome:
                          parsePaymentLinkOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-payment-link-outcome"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="sent">Payment link sent</SelectItem>
                      <SelectItem value="delivery-failure">
                        Email delivery failed
                      </SelectItem>
                      <SelectItem value="unavailable">
                        Link unavailable
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-payment-link-state"
                    className={DEV_LABEL_CLASS}
                  >
                    Payment link state
                  </Label>
                  <Select
                    value={appState.paymentLinkState}
                    onValueChange={(value) =>
                      setAppState({
                        paymentLinkState: parsePaymentLinkStateControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-payment-link-state"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="used">Already used</SelectItem>
                      <SelectItem value="invalid">Unknown link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-invitation-state"
                    className={DEV_LABEL_CLASS}
                  >
                    Invitation link state
                  </Label>
                  <Select
                    value={appState.invitationLinkState}
                    onValueChange={(value) =>
                      setAppState({
                        invitationLinkState:
                          parseInvitationLinkStateControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-invitation-state" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="used">Already used</SelectItem>
                      <SelectItem value="unknown">Unknown link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-coach-invitation"
                    className={DEV_LABEL_CLASS}
                  >
                    Coach-side invitation
                  </Label>
                  <Select
                    value={appState.journeyInvitation}
                    onValueChange={(value) =>
                      setAppState({
                        journeyInvitation: parseInvitationStandingControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-coach-invitation" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="email-failed">Email failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dev-invitation-resend"
                    className={DEV_LABEL_CLASS}
                  >
                    Invitation re-send outcome
                  </Label>
                  <Select
                    value={appState.invitationResendOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        invitationResendOutcome:
                          parseInvitationResendOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dev-invitation-resend"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {journeyLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className={DEV_LABEL_CLASS}>Links sent by the coach</p>
                    {journeyLinks.map((link) => (
                      <Link
                        key={link.key}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                      >
                        {link.label} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className={TAB_PANEL_CLASS}>
                <div className="space-y-2">
                  <Label htmlFor="dev-resource-seed" className={DEV_LABEL_CLASS}>
                    Client resources
                  </Label>
                  <Select
                    value={appState.resourceSeed}
                    onValueChange={(value) =>
                      setAppState({
                        resourceSeed: optionOrDefault(RESOURCE_SEEDS, value, 'seeded'),
                      })
                    }
                  >
                    <SelectTrigger id="dev-resource-seed" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="seeded">Populated</SelectItem>
                      <SelectItem value="empty">Empty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-resource-load" className={DEV_LABEL_CLASS}>
                    Resources load
                  </Label>
                  <Select
                    value={appState.resourceLoad}
                    onValueChange={(value) =>
                      setAppState({
                        resourceLoad: optionOrDefault(RESOURCE_LOAD_OUTCOMES, value, 'works'),
                      })
                    }
                  >
                    <SelectTrigger id="dev-resource-load" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-resource-upload" className={DEV_LABEL_CLASS}>
                    Resource upload
                  </Label>
                  <Select
                    value={appState.resourceUpload}
                    onValueChange={(value) =>
                      setAppState({
                        resourceUpload: optionOrDefault(RESOURCE_UPLOAD_OUTCOMES, value, 'works'),
                      })
                    }
                  >
                    <SelectTrigger id="dev-resource-upload" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                      <SelectItem value="holds">Holds at preparing</SelectItem>
                      <SelectItem value="too-many-pages">Refused: over 50 pages</SelectItem>
                      <SelectItem value="unreadable">Refused: cannot be read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-resource-mark" className={DEV_LABEL_CLASS}>
                    Resource opening
                  </Label>
                  <Select
                    value={appState.resourceMark}
                    onValueChange={(value) =>
                      setAppState({
                        resourceMark: optionOrDefault(RESOURCE_MARK_OUTCOMES, value, 'works'),
                      })
                    }
                  >
                    <SelectTrigger id="dev-resource-mark" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-resource-write" className={DEV_LABEL_CLASS}>
                    Resource changes
                  </Label>
                  <Select
                    value={appState.resourceWrite}
                    onValueChange={(value) =>
                      setAppState({
                        resourceWrite: optionOrDefault(RESOURCE_WRITE_OUTCOMES, value, 'works'),
                      })
                    }
                  >
                    <SelectTrigger id="dev-resource-write" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="fails">Fails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
