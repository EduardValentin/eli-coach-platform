import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import type {
  PrototypeBookingOutcome,
  PrototypeCallSettingsSaveOutcome,
  PrototypeCoachListingOutcome,
} from '../services/assessmentCallService';
import type {
  PrototypeAccountRole,
  PrototypeSignInOutcome,
} from '../services/authService';
import type {
  PrototypeInvitationLinkState,
  PrototypeInvitationOutcome,
} from '../services/invitationService';
import type {
  PrototypePaymentLinkOutcome,
  PrototypePaymentLinkState,
} from '../services/paymentLinkService';
import type { PrototypeCheckoutOutcome } from '../services/checkoutService';
import type { JourneySex, JourneyStage } from '../domain/journey';
import type {
  SubscriptionStartPath,
  SubscriptionStatus,
} from '../domain/coachingSubscription';

export type PrototypeWaitlistAvailability =
  | 'available'
  | 'limited'
  | 'closed'
  | null;

// One session covers both "is anyone signed in" and "as whom". The roles are
// the account roles; `anonymous` is the signed-out visitor, so combinations
// like a signed-out client cannot be expressed.
export type PrototypeSession = 'anonymous' | PrototypeAccountRole;

export function isSignedIn(session: PrototypeSession): boolean {
  return session !== 'anonymous';
}

type AppState = {
  session: PrototypeSession;
  signInOutcome: PrototypeSignInOutcome;
  hasBundle: boolean;
  isWaitlistMode: boolean;
  nutritionBlockCompleted: boolean;
  nutritionPreferenceConflict: boolean;
  waitlistAvailability: PrototypeWaitlistAvailability;
  isStoreCatalogEmpty: boolean;
  storeCheckoutOutcome: PrototypeStoreCheckoutOutcome;
  isDownloadUnavailable: boolean;
  bookingOutcome: PrototypeBookingOutcome;
  bookingSlotsUnavailable: boolean;
  callSettingsSaveOutcome: PrototypeCallSettingsSaveOutcome;
  coachCallsOutcome: PrototypeCoachListingOutcome;
  journeyStage: JourneyStage;
  journeyStartPath: SubscriptionStartPath;
  journeySubscriptionStatus: SubscriptionStatus;
  journeySex: JourneySex;
  journeyReducedPricing: boolean;
  paymentLinkOutcome: PrototypePaymentLinkOutcome;
  paymentLinkState: PrototypePaymentLinkState;
  journeyCheckoutOutcome: PrototypeCheckoutOutcome;
  invitationOutcome: PrototypeInvitationOutcome;
  invitationLinkState: PrototypeInvitationLinkState;
};

type AppContextType = {
  appState: AppState;
  setAppState: (state: Partial<AppState>) => void;
};

const defaultState: AppState = {
  session: 'anonymous',
  signInOutcome: 'client',
  hasBundle: false,
  isWaitlistMode: false,
  nutritionBlockCompleted: false,
  nutritionPreferenceConflict: false,
  waitlistAvailability: 'available',
  isStoreCatalogEmpty: false,
  storeCheckoutOutcome: 'success',
  isDownloadUnavailable: false,
  bookingOutcome: 'success',
  bookingSlotsUnavailable: false,
  callSettingsSaveOutcome: 'saved',
  coachCallsOutcome: 'ok',
  journeyStage: 'review-call-scheduled',
  journeyStartPath: 'immediate',
  journeySubscriptionStatus: 'active',
  journeySex: 'female',
  journeyReducedPricing: false,
  paymentLinkOutcome: 'sent',
  paymentLinkState: 'valid',
  journeyCheckoutOutcome: 'success',
  invitationOutcome: 'sent',
  invitationLinkState: 'valid',
};

const validSessions = ['anonymous', 'client', 'coach'] as const;
const validSignInOutcomes = ['client', 'coach', 'provisioning-failure'] as const;
const validWaitlistAvailabilities = ['available', 'limited', 'closed'] as const;
const validStoreCheckoutOutcomes = [
  'success',
  'bot-rejected',
  'delivery-failure',
  'rate-limited-cooldown',
  'rate-limited-daily',
  'server-error',
  'unavailable-product',
] as const;
const validBookingOutcomes = [
  'success',
  'slot_unavailable',
  'booking_refused',
  'invalid_email',
  'server_error',
] as const;
const validCoachListingOutcomes = ['ok', 'unavailable'] as const;
const validCallSettingsSaveOutcomes = ['saved', 'server_error'] as const;
const validJourneyStages = [
  'held',
  'payment-link-sent',
  'paid',
  'invited',
  'account-created',
  'onboarding',
  'submitted',
  'reviewing',
  'needs-details',
  'approved',
  'program-ready',
  'review-call-scheduled',
] as const;
const validStartPaths = ['immediate', 'waiting'] as const;
const validSubscriptionStatuses = [
  'not-started',
  'active',
  'cancelled',
  'ended',
] as const;
const validJourneySexes = ['female', 'male'] as const;
const validPaymentLinkOutcomes = ['sent', 'delivery-failure'] as const;
const validPaymentLinkStates = ['valid', 'expired', 'used', 'invalid'] as const;
const validCheckoutOutcomes = ['success', 'cancelled', 'failed'] as const;
const validInvitationOutcomes = [
  'sent',
  'replaced',
  'already-client',
  'delivery-failure',
] as const;
const validInvitationLinkStates = [
  'valid',
  'expired',
  'used',
  'unknown',
] as const;

function parseDevParamsFromURL(): AppState {
  const params = new URLSearchParams(window.location.search);
  const state = { ...defaultState };

  const session = params.get('session');
  if (session && (validSessions as readonly string[]).includes(session)) {
    state.session = session as PrototypeSession;
  }
  const signInOutcome = params.get('signin');
  if (
    signInOutcome &&
    (validSignInOutcomes as readonly string[]).includes(signInOutcome)
  ) {
    state.signInOutcome = signInOutcome as PrototypeSignInOutcome;
  }
  if (params.has('bundle')) state.hasBundle = params.get('bundle') === '1';
  if (params.has('waitlist')) state.isWaitlistMode = params.get('waitlist') === '1';
  if (params.has('nblock')) state.nutritionBlockCompleted = params.get('nblock') === '1';
  if (params.has('npref')) state.nutritionPreferenceConflict = params.get('npref') === '1';
  const availability = params.get('availability');
  if (
    availability &&
    (validWaitlistAvailabilities as readonly string[]).includes(availability)
  ) {
    state.waitlistAvailability =
      availability as Exclude<PrototypeWaitlistAvailability, null>;
  } else if (availability === 'unavailable') {
    state.waitlistAvailability = null;
  }
  if (params.has('storeempty')) {
    state.isStoreCatalogEmpty = params.get('storeempty') === '1';
  }
  const checkout = params.get('checkout');
  if (
    checkout &&
    (validStoreCheckoutOutcomes as readonly string[]).includes(checkout)
  ) {
    state.storeCheckoutOutcome = checkout as PrototypeStoreCheckoutOutcome;
  }
  if (params.has('download')) {
    state.isDownloadUnavailable = params.get('download') === 'unavailable';
  }
  const booking = params.get('booking');
  if (booking && (validBookingOutcomes as readonly string[]).includes(booking)) {
    state.bookingOutcome = booking as PrototypeBookingOutcome;
  }
  if (params.has('bookingslots')) {
    state.bookingSlotsUnavailable = params.get('bookingslots') === 'unavailable';
  }
  const coachCalls = params.get('coachcalls');
  if (
    coachCalls &&
    (validCoachListingOutcomes as readonly string[]).includes(coachCalls)
  ) {
    state.coachCallsOutcome = coachCalls as PrototypeCoachListingOutcome;
  }

  const settingsSave = params.get('callsettingssave');
  if (
    settingsSave &&
    (validCallSettingsSaveOutcomes as readonly string[]).includes(settingsSave)
  ) {
    state.callSettingsSaveOutcome = settingsSave as PrototypeCallSettingsSaveOutcome;
  }

  const journeyStage = params.get('jstage');
  if (
    journeyStage &&
    (validJourneyStages as readonly string[]).includes(journeyStage)
  ) {
    state.journeyStage = journeyStage as JourneyStage;
  }
  const startPath = params.get('jstart');
  if (startPath && (validStartPaths as readonly string[]).includes(startPath)) {
    state.journeyStartPath = startPath as SubscriptionStartPath;
  }
  const subscriptionStatus = params.get('jsub');
  if (
    subscriptionStatus &&
    (validSubscriptionStatuses as readonly string[]).includes(subscriptionStatus)
  ) {
    state.journeySubscriptionStatus = subscriptionStatus as SubscriptionStatus;
  }
  const journeySex = params.get('jsex');
  if (journeySex && (validJourneySexes as readonly string[]).includes(journeySex)) {
    state.journeySex = journeySex as JourneySex;
  }
  if (params.has('jreduced')) {
    state.journeyReducedPricing = params.get('jreduced') === '1';
  }
  const paymentLink = params.get('paylink');
  if (
    paymentLink &&
    (validPaymentLinkOutcomes as readonly string[]).includes(paymentLink)
  ) {
    state.paymentLinkOutcome = paymentLink as PrototypePaymentLinkOutcome;
  }
  const paymentLinkState = params.get('paylinkstate');
  if (
    paymentLinkState &&
    (validPaymentLinkStates as readonly string[]).includes(paymentLinkState)
  ) {
    state.paymentLinkState = paymentLinkState as PrototypePaymentLinkState;
  }
  const journeyCheckout = params.get('paycheckout');
  if (
    journeyCheckout &&
    (validCheckoutOutcomes as readonly string[]).includes(journeyCheckout)
  ) {
    state.journeyCheckoutOutcome = journeyCheckout as PrototypeCheckoutOutcome;
  }
  const invitation = params.get('invitation');
  if (
    invitation &&
    (validInvitationOutcomes as readonly string[]).includes(invitation)
  ) {
    state.invitationOutcome = invitation as PrototypeInvitationOutcome;
  }
  const invitationLinkState = params.get('invitationstate');
  if (
    invitationLinkState &&
    (validInvitationLinkStates as readonly string[]).includes(invitationLinkState)
  ) {
    state.invitationLinkState =
      invitationLinkState as PrototypeInvitationLinkState;
  }

  return state;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setFullState] = useState<AppState>(() => parseDevParamsFromURL());
  const location = useLocation();

  const setAppState = (state: Partial<AppState>) => {
    setFullState(prev => ({ ...prev, ...state }));
  };

  useEffect(() => {
    const url = new URL(window.location.href);

    url.searchParams.delete('session');
    url.searchParams.delete('signin');
    url.searchParams.delete('bundle');
    url.searchParams.delete('waitlist');
    url.searchParams.delete('nblock');
    url.searchParams.delete('npref');
    url.searchParams.delete('availability');
    url.searchParams.delete('storeempty');
    url.searchParams.delete('checkout');
    url.searchParams.delete('download');
    url.searchParams.delete('booking');
    url.searchParams.delete('bookingslots');
    url.searchParams.delete('callsettingssave');
    url.searchParams.delete('coachcalls');
    url.searchParams.delete('jstage');
    url.searchParams.delete('jstart');
    url.searchParams.delete('jsub');
    url.searchParams.delete('jsex');
    url.searchParams.delete('jreduced');
    url.searchParams.delete('paylink');
    url.searchParams.delete('paylinkstate');
    url.searchParams.delete('paycheckout');
    url.searchParams.delete('invitation');
    url.searchParams.delete('invitationstate');

    if (isSignedIn(appState.session)) {
      url.searchParams.set('session', appState.session);
    }
    if (appState.signInOutcome !== 'client') {
      url.searchParams.set('signin', appState.signInOutcome);
    }
    if (appState.hasBundle) url.searchParams.set('bundle', '1');
    if (appState.isWaitlistMode) url.searchParams.set('waitlist', '1');
    if (appState.nutritionBlockCompleted) url.searchParams.set('nblock', '1');
    if (appState.nutritionPreferenceConflict) url.searchParams.set('npref', '1');
    if (appState.waitlistAvailability === null) {
      url.searchParams.set('availability', 'unavailable');
    } else if (appState.waitlistAvailability !== 'available') {
      url.searchParams.set('availability', appState.waitlistAvailability);
    }
    if (appState.isStoreCatalogEmpty) url.searchParams.set('storeempty', '1');
    if (appState.storeCheckoutOutcome !== 'success') {
      url.searchParams.set('checkout', appState.storeCheckoutOutcome);
    }
    if (appState.isDownloadUnavailable) {
      url.searchParams.set('download', 'unavailable');
    }
    if (appState.bookingOutcome !== 'success') {
      url.searchParams.set('booking', appState.bookingOutcome);
    }
    if (appState.bookingSlotsUnavailable) {
      url.searchParams.set('bookingslots', 'unavailable');
    }
    if (appState.callSettingsSaveOutcome !== 'saved') {
      url.searchParams.set('callsettingssave', appState.callSettingsSaveOutcome);
    }
    if (appState.coachCallsOutcome !== 'ok') {
      url.searchParams.set('coachcalls', appState.coachCallsOutcome);
    }
    if (appState.journeyStage !== defaultState.journeyStage) {
      url.searchParams.set('jstage', appState.journeyStage);
    }
    if (appState.journeyStartPath !== defaultState.journeyStartPath) {
      url.searchParams.set('jstart', appState.journeyStartPath);
    }
    if (
      appState.journeySubscriptionStatus !==
      defaultState.journeySubscriptionStatus
    ) {
      url.searchParams.set('jsub', appState.journeySubscriptionStatus);
    }
    if (appState.journeySex !== defaultState.journeySex) {
      url.searchParams.set('jsex', appState.journeySex);
    }
    if (appState.journeyReducedPricing) url.searchParams.set('jreduced', '1');
    if (appState.paymentLinkOutcome !== defaultState.paymentLinkOutcome) {
      url.searchParams.set('paylink', appState.paymentLinkOutcome);
    }
    if (appState.paymentLinkState !== defaultState.paymentLinkState) {
      url.searchParams.set('paylinkstate', appState.paymentLinkState);
    }
    if (
      appState.journeyCheckoutOutcome !== defaultState.journeyCheckoutOutcome
    ) {
      url.searchParams.set('paycheckout', appState.journeyCheckoutOutcome);
    }
    if (appState.invitationOutcome !== defaultState.invitationOutcome) {
      url.searchParams.set('invitation', appState.invitationOutcome);
    }
    if (appState.invitationLinkState !== defaultState.invitationLinkState) {
      url.searchParams.set('invitationstate', appState.invitationLinkState);
    }

    const target = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (target !== current) {
      window.history.replaceState(history.state, '', target);
    }
  }, [appState, location.pathname]);

  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
