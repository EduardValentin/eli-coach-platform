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
  ONBOARDING_CONNECTIONS,
  type OnboardingConnection,
} from '../services/onboardingService';
import {
  MEASUREMENT_SAVE_OUTCOMES,
  PHOTO_PROCESSING_OUTCOMES,
  type MeasurementSave,
  type PhotoProcessing,
} from '../services/measurementService';
import {
  PROTOTYPE_LIFE_STAGES,
  PROTOTYPE_MEASUREMENTS_DUE,
  PROTOTYPE_SEEDED_PHOTOS,
  type PrototypeLifeStage,
  type PrototypeMeasurementsDue,
  type PrototypeSeededPhotos,
} from '../services/clientJourneySamples';
import { optionOrDefault } from '../utils/optionOrDefault';
import {
  JOURNEY_GENDERS,
  type JourneyGender,
  type JourneyStage,
} from '../domain/journey';
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

export type PrototypeMode = 'mvp' | 'post-mvp';

export type JourneyAgeBand = 'adult' | 'under-15' | 'over-69';

export const JOURNEY_AGE_BANDS: readonly JourneyAgeBand[] = [
  'adult',
  'under-15',
  'over-69',
];

export function isSignedIn(session: PrototypeSession): boolean {
  return session !== 'anonymous';
}

type AppState = {
  prototypeMode: PrototypeMode;
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
  journeyGender: JourneyGender;
  journeyAgeBand: JourneyAgeBand;
  journeyConnection: OnboardingConnection;
  journeyReducedPricing: boolean;
  journeyInvitation: PrototypeInvitationStanding;
  journeyMeasurementsDue: PrototypeMeasurementsDue;
  journeyLifeStage: PrototypeLifeStage;
  photoProcessing: PhotoProcessing;
  measurementSave: MeasurementSave;
  journeySeededPhotos: PrototypeSeededPhotos;
  invitationResendOutcome: PrototypeInvitationResendOutcome;
  clientsRoster: PrototypeClientsRoster;
  paymentLinkOutcome: PrototypePaymentLinkOutcome;
  paymentLinkState: PrototypePaymentLinkState;
  invitationLinkState: PrototypeInvitationLinkState;
};

type AppContextType = {
  appState: AppState;
  setAppState: (state: Partial<AppState>) => void;
};

const defaultState: AppState = {
  prototypeMode: 'mvp',
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
  journeyStage: 'approved',
  journeyStartPath: 'immediate',
  journeySubscriptionStatus: 'active',
  journeyGender: 'female',
  journeyAgeBand: 'adult',
  journeyConnection: 'working',
  journeyReducedPricing: false,
  journeyInvitation: 'sent',
  journeyMeasurementsDue: 'none',
  journeyLifeStage: 'none',
  photoProcessing: 'works',
  measurementSave: 'works',
  journeySeededPhotos: 'none',
  invitationResendOutcome: 'sent',
  clientsRoster: 'seeded',
  paymentLinkOutcome: 'sent',
  paymentLinkState: 'valid',
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
export const PROTOTYPE_CLIENTS_ROSTERS = [
  'seeded',
  'empty',
  'unavailable',
] as const;
export type PrototypeClientsRoster = (typeof PROTOTYPE_CLIENTS_ROSTERS)[number];
const validCallSettingsSaveOutcomes = ['saved', 'server_error'] as const;
const validJourneyStages = [
  'held',
  'payment-link-sent',
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
const validPaymentLinkOutcomes = [
  'sent',
  'delivery-failure',
  'unavailable',
] as const;
const validPaymentLinkStates = ['valid', 'expired', 'used', 'invalid'] as const;
const validInvitationLinkStates = [
  'valid',
  'expired',
  'used',
  'unknown',
] as const;

function parseDevParamsFromURL(): AppState {
  const params = new URLSearchParams(window.location.search);
  const state = { ...defaultState };

  if (params.get('scope') === 'post-mvp') {
    state.prototypeMode = 'post-mvp';
  }

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
  if (state.prototypeMode === 'post-mvp' && params.has('nblock')) {
    state.nutritionBlockCompleted = params.get('nblock') === '1';
  }
  if (state.prototypeMode === 'post-mvp' && params.has('npref')) {
    state.nutritionPreferenceConflict = params.get('npref') === '1';
  }
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

  const journeyStageParam = params.get('jstage');
  const journeyStage =
    journeyStageParam === 'paid' ? 'invited' : journeyStageParam;
  const isPostMvpJourneyStage =
    journeyStage === 'program-ready' || journeyStage === 'review-call-scheduled';
  if (
    journeyStage &&
    (validJourneyStages as readonly string[]).includes(journeyStage) &&
    (state.prototypeMode === 'post-mvp' || !isPostMvpJourneyStage)
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
  const journeyGender = params.get('jgender');
  if (
    journeyGender &&
    (JOURNEY_GENDERS as readonly string[]).includes(journeyGender)
  ) {
    state.journeyGender = journeyGender as JourneyGender;
  }
  const journeyAgeBand = params.get('jage');
  if (
    journeyAgeBand &&
    (JOURNEY_AGE_BANDS as readonly string[]).includes(journeyAgeBand)
  ) {
    state.journeyAgeBand = journeyAgeBand as JourneyAgeBand;
  }
  const journeyConnection = params.get('jconn');
  if (
    journeyConnection &&
    (ONBOARDING_CONNECTIONS as readonly string[]).includes(journeyConnection)
  ) {
    state.journeyConnection = journeyConnection as OnboardingConnection;
  }
  if (params.has('jreduced')) {
    state.journeyReducedPricing = params.get('jreduced') === '1';
  }
  const journeyInvitation = params.get('jinv');
  if (
    journeyInvitation &&
    (PROTOTYPE_INVITATION_STANDINGS as readonly string[]).includes(journeyInvitation)
  ) {
    state.journeyInvitation = journeyInvitation as PrototypeInvitationStanding;
  }
  state.journeyMeasurementsDue = optionOrDefault(
    PROTOTYPE_MEASUREMENTS_DUE,
    params.get('jdue'),
    defaultState.journeyMeasurementsDue,
  );
  state.journeyLifeStage = optionOrDefault(
    PROTOTYPE_LIFE_STAGES,
    params.get('jlife'),
    defaultState.journeyLifeStage,
  );
  state.photoProcessing = optionOrDefault(
    PHOTO_PROCESSING_OUTCOMES,
    params.get('jphoto'),
    defaultState.photoProcessing,
  );
  state.measurementSave = optionOrDefault(
    MEASUREMENT_SAVE_OUTCOMES,
    params.get('jsave'),
    defaultState.measurementSave,
  );
  state.journeySeededPhotos = optionOrDefault(
    PROTOTYPE_SEEDED_PHOTOS,
    params.get('jphotos'),
    defaultState.journeySeededPhotos,
  );
  const invitationResendOutcome = params.get('jresend');
  if (
    invitationResendOutcome &&
    (PROTOTYPE_INVITATION_RESEND_OUTCOMES as readonly string[]).includes(
      invitationResendOutcome,
    )
  ) {
    state.invitationResendOutcome =
      invitationResendOutcome as PrototypeInvitationResendOutcome;
  }
  const clientsRoster = params.get('jroster');
  if (
    clientsRoster &&
    (PROTOTYPE_CLIENTS_ROSTERS as readonly string[]).includes(clientsRoster)
  ) {
    state.clientsRoster = clientsRoster as PrototypeClientsRoster;
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

    url.searchParams.delete('scope');
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
    url.searchParams.delete('jgender');
    url.searchParams.delete('jage');
    url.searchParams.delete('jconn');
    url.searchParams.delete('jreduced');
    url.searchParams.delete('jinv');
    url.searchParams.delete('jdue');
    url.searchParams.delete('jlife');
    url.searchParams.delete('jphoto');
    url.searchParams.delete('jsave');
    url.searchParams.delete('jphotos');
    url.searchParams.delete('jresend');
    url.searchParams.delete('jroster');
    url.searchParams.delete('paylink');
    url.searchParams.delete('paylinkstate');
    url.searchParams.delete('invitationstate');

    if (appState.prototypeMode === 'post-mvp') {
      url.searchParams.set('scope', 'post-mvp');
    }
    if (isSignedIn(appState.session)) {
      url.searchParams.set('session', appState.session);
    }
    if (appState.signInOutcome !== 'client') {
      url.searchParams.set('signin', appState.signInOutcome);
    }
    if (appState.hasBundle) url.searchParams.set('bundle', '1');
    if (appState.isWaitlistMode) url.searchParams.set('waitlist', '1');
    if (appState.prototypeMode === 'post-mvp' && appState.nutritionBlockCompleted) {
      url.searchParams.set('nblock', '1');
    }
    if (appState.prototypeMode === 'post-mvp' && appState.nutritionPreferenceConflict) {
      url.searchParams.set('npref', '1');
    }
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
    if (appState.journeyGender !== defaultState.journeyGender) {
      url.searchParams.set('jgender', appState.journeyGender);
    }
    if (appState.journeyAgeBand !== defaultState.journeyAgeBand) {
      url.searchParams.set('jage', appState.journeyAgeBand);
    }
    if (appState.journeyConnection !== defaultState.journeyConnection) {
      url.searchParams.set('jconn', appState.journeyConnection);
    }
    if (appState.journeyReducedPricing) url.searchParams.set('jreduced', '1');
    if (appState.journeyInvitation !== defaultState.journeyInvitation) {
      url.searchParams.set('jinv', appState.journeyInvitation);
    }
    if (
      appState.journeyMeasurementsDue !== defaultState.journeyMeasurementsDue
    ) {
      url.searchParams.set('jdue', appState.journeyMeasurementsDue);
    }
    if (appState.journeyLifeStage !== defaultState.journeyLifeStage) {
      url.searchParams.set('jlife', appState.journeyLifeStage);
    }
    if (appState.photoProcessing !== defaultState.photoProcessing) {
      url.searchParams.set('jphoto', appState.photoProcessing);
    }
    if (appState.measurementSave !== defaultState.measurementSave) {
      url.searchParams.set('jsave', appState.measurementSave);
    }
    if (appState.journeySeededPhotos !== defaultState.journeySeededPhotos) {
      url.searchParams.set('jphotos', appState.journeySeededPhotos);
    }
    if (
      appState.invitationResendOutcome !== defaultState.invitationResendOutcome
    ) {
      url.searchParams.set('jresend', appState.invitationResendOutcome);
    }
    if (appState.clientsRoster !== defaultState.clientsRoster) {
      url.searchParams.set('jroster', appState.clientsRoster);
    }
    if (appState.paymentLinkOutcome !== defaultState.paymentLinkOutcome) {
      url.searchParams.set('paylink', appState.paymentLinkOutcome);
    }
    if (appState.paymentLinkState !== defaultState.paymentLinkState) {
      url.searchParams.set('paylinkstate', appState.paymentLinkState);
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
