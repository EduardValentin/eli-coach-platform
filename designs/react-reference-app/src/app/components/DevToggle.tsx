import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Settings, X } from 'lucide-react';
import {
  useAppState,
  type PrototypeMode,
  type PrototypeSession,
  type PrototypeWaitlistAvailability,
} from '../context/AppContext';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import type { PrototypeSignInOutcome } from '../services/authService';
import type { PrototypeInvitationLinkState } from '../services/invitationService';
import type {
  PrototypePaymentLinkOutcome,
  PrototypePaymentLinkState,
} from '../services/paymentLinkService';
import {
  COACH_STAGE_LABELS,
  JOURNEY_STAGES,
  type JourneySex,
  type JourneyStage,
} from '../domain/journey';
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
import { useCheckins } from '../context/CheckinContext';
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

function parseJourneySexControl(value: string): JourneySex {
  if (value === 'male') return value;

  return 'female';
}

function parsePaymentLinkOutcomeControl(
  value: string,
): PrototypePaymentLinkOutcome {
  if (value === 'delivery-failure') return value;

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

type PendingCheckinsSeed = 'seeded' | 'none';

function parseCoachListingControl(value: string): PrototypeCoachListingOutcome {
  if (value === 'unavailable') return value;

  return 'ok';
}

function parsePendingCheckinsControl(value: string): PendingCheckinsSeed {
  if (value === 'none') return value;

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
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(search);
    params.delete('session');
    new URLSearchParams(query).forEach((value, key) => params.set(key, value));
    const joined = params.toString();

    return joined.length > 0 ? `${pathname}?${joined}` : pathname;
  };

  const journeyLinks = Object.values(journeys).flatMap((journey) => [
    ...(journey.paymentLink
      ? [
          {
            key: `${journey.callId}-payment`,
            label: `Open payment link · ${journey.identity.firstName} ${journey.identity.lastName}`,
            to: withDevParams(
              `/select-bundle?token=${journey.paymentLink.token}`,
            ),
          },
        ]
      : []),
    ...(journey.invitation
      ? [
          {
            key: `${journey.callId}-invitation`,
            label: `Open invitation link · ${journey.identity.firstName} ${journey.identity.lastName}`,
            to: withDevParams(`/invitation/${journey.invitation.token}`),
          },
        ]
      : []),
  ]);
  const { clearPendingCheckins, restoreSeededCheckins } = useCheckins();

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
        className="fixed right-4 z-[9999] bg-surface-inverted text-surface-inverted-foreground p-3 rounded-full shadow-lg hover:bg-brand transition-colors bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-4"
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
            className="fixed right-4 z-[9999] bg-card p-5 rounded-card shadow-2xl border border-control-border-soft w-80 max-w-[calc(100vw-2rem)] bottom-[calc(env(safe-area-inset-bottom)+9rem)] lg:bottom-20"
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
                <TabsTrigger value="journey" className={TAB_TRIGGER_CLASS}>
                  Journey
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

              <TabsContent value="coach" className={TAB_PANEL_CLASS}>
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
                    </SelectContent>
                  </Select>
                </div>
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
                          {COACH_STAGE_LABELS[stage]}
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
                    onValueChange={(value) =>
                      setAppState({
                        journeyStartPath: parseStartPathControl(value),
                      })
                    }
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
                    onValueChange={(value) =>
                      setAppState({
                        journeySubscriptionStatus:
                          parseSubscriptionStatusControl(value),
                      })
                    }
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
                  <Label htmlFor="dev-journey-sex" className={DEV_LABEL_CLASS}>
                    Sex
                  </Label>
                  <Select
                    value={appState.journeySex}
                    onValueChange={(value) =>
                      setAppState({ journeySex: parseJourneySexControl(value) })
                    }
                  >
                    <SelectTrigger id="dev-journey-sex" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
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
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
