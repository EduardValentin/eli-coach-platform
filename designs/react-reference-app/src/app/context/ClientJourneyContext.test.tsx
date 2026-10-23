import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from './AppContext';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from './AssessmentCallContext';
import {
  ClientJourneyProvider,
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from './ClientJourneyContext';
import type { PrototypeBooking } from '../services/assessmentCallService';
import { paymentLinkExpiresAt } from '../services/paymentLinkService';

function JourneyProbe() {
  const { demoJourney, recordPaymentLinkSent, recordPaid } =
    useClientJourneys();

  return (
    <>
      <output aria-label="stage">{demoJourney.stage}</output>
      <output aria-label="payment link token">
        {demoJourney.paymentLink?.token ?? ''}
      </output>
      <output aria-label="invitation token">
        {demoJourney.invitation?.token ?? ''}
      </output>
      <button
        type="button"
        onClick={() =>
          recordPaymentLinkSent(DEMO_JOURNEY_CALL_ID, {
            token: 'pl-first',
            sentAt: new Date(),
            expiresAt: paymentLinkExpiresAt(new Date()),
          })
        }
      >
        send payment link
      </button>
      <button
        type="button"
        onClick={() =>
          recordPaymentLinkSent(DEMO_JOURNEY_CALL_ID, {
            token: 'pl-second',
            sentAt: new Date(),
            expiresAt: paymentLinkExpiresAt(new Date()),
          })
        }
      >
        re-send payment link
      </button>
      <button
        type="button"
        onClick={() =>
          recordPaid(DEMO_JOURNEY_CALL_ID, {
            paidAt: new Date(),
            bundle: 3,
            startPath: 'immediate',
            amountPaidCents: 44700,
          })
        }
      >
        complete checkout
      </button>
    </>
  );
}

function ProfileProbe() {
  const {
    demoJourney,
    submitOnboarding,
    saveOnboardingDraft,
    answerRequest,
    startReview,
    approveAnswers,
    updateClientProfile,
  } = useClientJourneys();
  const [saveOutcome, setSaveOutcome] = useState('');
  const { profile, settings } = demoJourney;
  const { coaching } = profile;

  const editProfile = () =>
    updateClientProfile(DEMO_JOURNEY_CALL_ID, {
      identity: { firstName: 'Anna' },
      coaching: { trainingDays: 5 },
    }).then(
      () => setSaveOutcome('saved'),
      () => setSaveOutcome('failed'),
    );

  return (
    <>
      <output aria-label="name">
        {profile.identity.firstName} {profile.identity.lastName}
      </output>
      <output aria-label="coaching">
        {coaching
          ? `${coaching.heightCm} cm · ${coaching.trainingDays} days · ${coaching.dietaryRestrictions}`
          : 'none'}
      </output>
      <output aria-label="preferences">
        {settings.preferredCheckInWeekday ?? 'no day'} · {settings.preferredChannel ?? 'no channel'}
      </output>
      <output aria-label="save outcome">{saveOutcome}</output>
      <button
        type="button"
        onClick={() =>
          submitOnboarding(DEMO_JOURNEY_CALL_ID, {
            submittedAt: new Date(),
            photos: {},
          })
        }
      >
        send onboarding
      </button>
      <button
        type="button"
        onClick={() => {
          saveOnboardingDraft(DEMO_JOURNEY_CALL_ID, {
            ...demoJourney.onboarding,
            answers: {
              ...demoJourney.onboarding.answers,
              'nutrition-lifestyle': {
                ...demoJourney.onboarding.answers['nutrition-lifestyle'],
                eatingStyle: 'Vegan',
              },
            },
          });
          answerRequest(DEMO_JOURNEY_CALL_ID, new Date());
        }}
      >
        answer the request
      </button>
      <button
        type="button"
        onClick={() => {
          startReview(DEMO_JOURNEY_CALL_ID);
          approveAnswers(DEMO_JOURNEY_CALL_ID);
        }}
      >
        approve answers
      </button>
      <button type="button" onClick={editProfile}>
        edit profile
      </button>
    </>
  );
}

function renderProbe(jstage: string, probe: ReactNode = <JourneyProbe />) {
  const search = `?jstage=${jstage}`;
  window.history.replaceState({}, '', `/${search}`);

  render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <AppProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>{probe}</ClientJourneyProvider>
          </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

function demoIdBooking(): PrototypeBooking {
  return {
    id: DEMO_JOURNEY_CALL_ID,
    startsAt: new Date(2026, 8, 1, 17),
    bookedAt: new Date(2026, 7, 29, 17),
    firstName: 'Jane',
    lastName: 'Doe',
    visitorEmail: 'jane@example.com',
    dateOfBirth: '1993-05-14',
    gender: 'female',
    primaryGoal: 'lose_weight',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: 'Europe/Bucharest',
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${DEMO_JOURNEY_CALL_ID}/join`,
  };
}

function SeedDemoIdBooking() {
  const { replaceBookings } = useAssessmentCalls();

  useEffect(() => {
    replaceBookings([demoIdBooking()]);
  }, [replaceBookings]);

  return null;
}

describe('syncing bookings into journeys', () => {
  it('keeps the seeded demo journey when a booking shares its id', () => {
    // arrange
    window.history.replaceState({}, '', '/?jstage=invited');

    render(
      <MemoryRouter initialEntries={['/?jstage=invited']}>
        <AppProvider>
            <AssessmentCallProvider>
              <SeedDemoIdBooking />
              <ClientJourneyProvider>
                <JourneyProbe />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
        </AppProvider>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');
  });
});

describe('re-sending the payment link', () => {
  it('replaces the stored link and keeps the payment-link-sent stage', async () => {
    // arrange
    const user = renderProbe('held');
    await user.click(screen.getByRole('button', { name: 'send payment link' }));
    expect(screen.getByLabelText('stage')).toHaveTextContent(
      'payment-link-sent',
    );

    // act
    await user.click(
      screen.getByRole('button', { name: 're-send payment link' }),
    );

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent(
      'payment-link-sent',
    );
    expect(screen.getByLabelText('payment link token')).toHaveTextContent(
      'pl-second',
    );
  });
});

describe('completing checkout', () => {
  it('records the payment and creates her invitation in the same action', async () => {
    // arrange
    const user = renderProbe('payment-link-sent');

    // act
    await user.click(screen.getByRole('button', { name: 'complete checkout' }));

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');
    expect(screen.getByLabelText('invitation token')).not.toHaveTextContent('');
  });
});

const SAVE_TIMEOUT = { timeout: 3000 };

describe('keeping her profile', () => {
  it('has no coaching facts or preferences before her answers are approved', () => {
    // act
    renderProbe('onboarding', <ProfileProbe />);

    // assert
    expect(screen.getByLabelText('name')).toHaveTextContent('Jane Doe');
    expect(screen.getByLabelText('coaching')).toHaveTextContent('none');
    expect(screen.getByLabelText('preferences')).toHaveTextContent('no day · no channel');
  });

  it('leaves her profile untouched when she sends her onboarding', async () => {
    // arrange
    const user = renderProbe('onboarding', <ProfileProbe />);

    // act
    await user.click(screen.getByRole('button', { name: 'send onboarding' }));

    // assert
    expect(screen.getByLabelText('coaching')).toHaveTextContent('none');
  });

  it('leaves her profile untouched when she answers a detail request', async () => {
    // arrange
    const user = renderProbe('needs-details', <ProfileProbe />);

    // act
    await user.click(screen.getByRole('button', { name: 'answer the request' }));

    // assert
    expect(screen.getByLabelText('coaching')).toHaveTextContent('none');
  });

  it('fills her coaching facts and preferences from her answers once they are approved', async () => {
    // arrange
    const user = renderProbe('submitted', <ProfileProbe />);

    // act
    await user.click(screen.getByRole('button', { name: 'approve answers' }));

    // assert
    expect(screen.getByLabelText('coaching')).toHaveTextContent('165 cm · 3 days · Lactose, mild');
    expect(screen.getByLabelText('preferences')).toHaveTextContent('mon · email');
  });

  it('saves an edit to her identity and coaching facts', async () => {
    // arrange
    const user = renderProbe('approved', <ProfileProbe />);

    // act
    await user.click(screen.getByRole('button', { name: 'edit profile' }));

    // assert
    expect(await screen.findByText('saved', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toHaveTextContent('Anna Doe');
    expect(screen.getByLabelText('coaching')).toHaveTextContent('165 cm · 5 days · Lactose, mild');
  });

  it('keeps her profile as it was when the save fails', async () => {
    // arrange
    const user = renderProbe('approved&jprofile=fails', <ProfileProbe />);

    // act
    await user.click(screen.getByRole('button', { name: 'edit profile' }));

    // assert
    expect(await screen.findByText('failed', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toHaveTextContent('Jane Doe');
    expect(screen.getByLabelText('coaching')).toHaveTextContent('165 cm · 3 days · Lactose, mild');
  });
});
