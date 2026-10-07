import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JourneyClientDetails } from './JourneyClientDetails';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import {
  AWAITING_REVIEW_CALL_ID,
  ClientJourneyProvider,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function DemoJourneyDetails({ callId }: { callId?: string }) {
  const { demoJourney, journeyForCall, answerRequest } = useClientJourneys();
  const journey = (callId && journeyForCall(callId)) || demoJourney;

  return (
    <>
      <JourneyClientDetails journey={journey} />
      <button
        onClick={() => answerRequest(demoJourney.callId, new Date())}
        type="button"
      >
        stand in for her answer
      </button>
    </>
  );
}

function renderDetails(
  urlQuery: string,
  options: { postMvp?: boolean; callId?: string } = {},
) {
  const { postMvp = true, callId } = options;
  const scopePrefix = postMvp ? 'scope=post-mvp&' : '';
  const url = `/coach/clients/c1?${scopePrefix}${urlQuery.slice(1)}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <UnitPreferencesProvider>
                <DemoJourneyDetails callId={callId} />
                <Toaster />
              </UnitPreferencesProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function onboardingWidget(): HTMLElement {
  return screen.getByRole('region', { name: 'Onboarding', hidden: true });
}

function subscriptionPanel(): HTMLElement {
  return screen.getByRole('region', { name: 'Subscription' });
}

function pageHeader(): HTMLElement {
  const header = screen.getByRole('heading', { level: 1 }).closest('header');
  if (!header) throw new Error('No page header');

  return header;
}

function reviewDialog(): HTMLElement {
  return screen.getByRole('dialog');
}

function profileBlock(): HTMLElement {
  return screen.getByRole('region', { name: 'Profile' });
}

function assessmentCallTrigger(): HTMLElement {
  return screen.getByRole('button', { name: 'Assessment call' });
}

function assessmentCallBlock(): HTMLElement {
  const section = assessmentCallTrigger().closest('section');
  if (!section) throw new Error('No assessment call section');

  return section;
}

function invitationBlock(): HTMLElement {
  return screen.getByRole('region', { name: 'Invitation' });
}

function readingIn(block: HTMLElement, label: string): HTMLElement {
  const term = within(block).getByText(label);
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) throw new Error(`No ${label} value`);

  return value;
}

function profileReading(label: string): HTMLElement {
  return readingIn(profileBlock(), label);
}

function assessmentCallReading(label: string): HTMLElement {
  return readingIn(assessmentCallBlock(), label);
}

const LATENCY_TIMEOUT = { timeout: 3000 };

describe('the coach view of a client in onboarding', () => {
  it('leads from the header to the resources of the client the page shows', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery, { postMvp: false, callId: AWAITING_REVIEW_CALL_ID });

    // assert
    const resources = within(pageHeader()).getByRole('link', { name: 'Resources' });
    expect(resources).toHaveAttribute(
      'href',
      `/coach/clients/${AWAITING_REVIEW_CALL_ID}/resources`,
    );
  });

  it('keeps the start path and the stage out of the header, showing it in the subscription panel', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const header = pageHeader();
    expect(
      within(header).queryByText('Immediate start'),
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByText('Awaiting review'),
    ).not.toBeInTheDocument();
    expect(
      within(subscriptionPanel()).getByText('Immediate start'),
    ).toBeInTheDocument();
  });

  it('names the day a waiting client starts in the subscription panel, not beside her name', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jstart=waiting';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(pageHeader()).queryByText(/^After the 14 days \(/),
    ).not.toBeInTheDocument();
    expect(
      within(subscriptionPanel()).getByText(/^After the 14 days \(\d{1,2} \w+\)$/),
    ).toBeInTheDocument();
  });

  it('leaves the program start blank in the subscription panel until her program is ready', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jstart=waiting';

    // act
    renderDetails(urlQuery);

    // assert
    const startProgram = within(subscriptionPanel()).getByText('Start program');
    expect(startProgram.nextElementSibling).toHaveTextContent(/^—$/);
  });

  it('shows her client status only inside the onboarding widget', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(onboardingWidget()).getByText('Awaiting review'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sent to coach')).not.toBeInTheDocument();
  });

  it('shows only her status and that her answers are not in yet before she sends them', () => {
    // arrange
    const urlQuery = '?jstage=onboarding';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByText('Onboarding', { selector: '[data-slot=badge]' }),
    ).toBeInTheDocument();
    expect(
      within(widget).getByText('Her answers are not in yet.'),
    ).toBeInTheDocument();
    expect(
      within(widget).queryByText('Waist-to-height ratio'),
    ).not.toBeInTheDocument();
    expect(
      within(widget).queryByRole('heading', { name: 'Answers' }),
    ).not.toBeInTheDocument();
    expect(within(widget).queryByRole('button')).not.toBeInTheDocument();
  });

  it('counts the answers of every form she was asked to fill in', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('button', { name: /Your measurements/ }),
    ).toHaveTextContent('2 of 4 answered');
    expect(
      within(widget).getByRole('button', {
        name: /Your cycle and hormonal health/,
      }),
    ).toBeInTheDocument();
  });

  it('opens a form and reads its answers back, marking the ones she skipped', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: /Your measurements/,
      }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('Waist')).toBeInTheDocument();
    expect(within(widget).getByText('74 cm')).toBeInTheDocument();
    expect(within(widget).getAllByText('Not answered')).toHaveLength(2);
  });

  it('reads her measurements back in kilograms and centimetres whatever she entered them in', async () => {
    // arrange
    window.localStorage.setItem(
      'eli.unitPreferences',
      JSON.stringify({ weightUnit: 'lb', heightUnit: 'ft-in' }),
    );
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: /Your goal and your week/,
      }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('66.1 kg')).toBeInTheDocument();
    expect(within(widget).getByText('165 cm')).toBeInTheDocument();
  });

  it('reads a yes or no back as plain text and marks the ones that need a look', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: /A few safety questions/,
      }),
    );

    // assert
    const widget = onboardingWidget();
    const injury = within(widget).getByText(
      'Bone or joint problem',
    ).nextSibling;
    expect(injury).toHaveTextContent('Yes');
    expect(
      within(injury as HTMLElement).getByLabelText('Needs a look'),
    ).toBeInTheDocument();
    const heart = within(widget).getByText('Heart condition').nextSibling;
    expect(heart).toHaveTextContent('No');
    expect(
      within(heart as HTMLElement).queryByLabelText('Needs a look'),
    ).not.toBeInTheDocument();
  });

  it('offers to build the program without reviewing her answers first', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('link', { name: 'Build her program' }),
    ).toHaveAttribute('href', '/coach/training/builder/ac-demo-client-1');
    expect(
      within(widget).getByRole('button', { name: 'Review answers' }),
    ).toBeInTheDocument();
  });

  it('opens every answer for flagging inside a review dialog the moment the coach reviews', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(screen.getByRole('button', { name: 'Review answers' }));

    // assert
    const dialog = reviewDialog();
    expect(
      within(dialog).getByRole('heading', { name: /Review .+’s answers/ }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    ).not.toBeChecked();
    expect(within(dialog).getByText('0 questions flagged')).toBeVisible();
    expect(
      within(onboardingWidget()).getByText('In review'),
    ).toBeInTheDocument();
  });

  it('closes the review dialog and reopens it with the flags cleared', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');
    await user.click(screen.getByRole('button', { name: 'Review answers' }));
    await user.click(
      within(reviewDialog()).getByRole('checkbox', {
        name: 'Flag Sleep hours',
      }),
    );

    // act
    await user.click(
      within(reviewDialog()).getByRole('button', { name: 'Cancel' }),
    );

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('button', { name: 'Continue review' }),
    ).toBeInTheDocument();

    await user.click(
      within(widget).getByRole('button', { name: 'Continue review' }),
    );
    expect(
      within(reviewDialog()).getByRole('checkbox', {
        name: 'Flag Sleep hours',
      }),
    ).not.toBeChecked();
  });

  it('asks for more details only once a question is flagged and a note written', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');

    // act
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    // assert
    const dialog = reviewDialog();
    const send = within(dialog).getByRole('button', {
      name: 'Ask for more details',
    });
    expect(send).toBeDisabled();

    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    );
    expect(within(dialog).getByText('1 question flagged')).toBeVisible();
    expect(send).toBeDisabled();

    await user.type(
      within(dialog).getByRole('textbox', { name: 'What is missing?' }),
      'Tell me more about your sleep.',
    );
    expect(send).toBeEnabled();
  });

  it('sends the request and moves her back to answering', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));
    const dialog = reviewDialog();

    // act
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'What is missing?' }),
      'Tell me more about your sleep.',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Ask for more details' }),
    );

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const reviewed = onboardingWidget();
    expect(within(reviewed).getByText('Needs details')).toBeInTheDocument();
    expect(
      await screen.findByText('Email sent to jane@example.com.'),
    ).toBeInTheDocument();
    expect(
      within(reviewed).getByText('Tell me more about your sleep.'),
    ).toBeInTheDocument();
    expect(
      within(reviewed).queryByRole('button', { name: /review/i }),
    ).not.toBeInTheDocument();
    expect(
      within(reviewed).getByRole('link', { name: 'Build her program' }),
    ).toBeInTheDocument();
  });

  it('approves the answers from the dialog through the same confirmation and turns the widget to building her program', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    // act
    await user.click(
      within(reviewDialog()).getByRole('button', { name: 'Approve answers' }),
    );

    // assert
    const confirm = screen.getByRole('dialog', {
      name: "Approve Jane's answers?",
    });
    expect(
      within(confirm).getByText(
        "You won't be able to ask for more details once you approve.",
      ),
    ).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Approve' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const widget = onboardingWidget();
    expect(within(widget).getByText('Approved')).toBeInTheDocument();
    expect(
      within(widget).getByRole('link', { name: 'Build her program' }),
    ).toBeInTheDocument();
  });

  it('offers no way to reopen review once approved', () => {
    // arrange
    const urlQuery = '?jstage=approved';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('Approved')).toBeInTheDocument();
    expect(
      within(widget).queryByRole('button', { name: /review/i }),
    ).not.toBeInTheDocument();
  });

  it('hides the build action and explains the wait on the withdrawal-window path', () => {
    // arrange
    const urlQuery = '?jstage=approved&jstart=waiting';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).queryByRole('link', { name: 'Build her program' }),
    ).not.toBeInTheDocument();
    expect(
      within(widget).getByText(/You can start building her program on/),
    ).toBeInTheDocument();
  });

  it('approves answers from the widget through a confirmation, landing on approved', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted', { postMvp: false });

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: 'Approve answers',
      }),
    );

    // assert
    const confirm = screen.getByRole('dialog');
    expect(
      within(confirm).getByRole('heading', { name: /Approve .+'s answers\?/ }),
    ).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Approve' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(onboardingWidget()).getByText('Approved'),
    ).toBeInTheDocument();
  });

  it('leaves a client with her program ready nothing to act on', () => {
    // arrange
    const urlQuery = '?jstage=program-ready';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).queryByRole('link', { name: 'Build her program' }),
    ).not.toBeInTheDocument();
    expect(
      within(widget).queryByRole('button', { name: /review/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the review open with her flags when the coach steps back from approving', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));
    await user.click(
      within(reviewDialog()).getByRole('checkbox', {
        name: 'Flag Sleep hours',
      }),
    );
    await user.click(
      within(reviewDialog()).getByRole('button', { name: 'Approve answers' }),
    );

    // act
    await user.click(
      within(
        screen.getByRole('dialog', { name: "Approve Jane's answers?" }),
      ).getByRole('button', { name: 'Cancel' }),
    );

    // assert
    const review = screen.getByRole('dialog', {
      name: 'Review Jane’s answers',
    });
    expect(
      within(review).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    ).toBeChecked();
    expect(
      within(onboardingWidget()).getByText('In review'),
    ).toBeInTheDocument();
  });
});

describe('the coach reading who a client is', () => {
  it('lays the page out as profile, invitation, onboarding, subscription, measurements and the assessment call last', () => {
    // arrange
    const urlQuery = '?jstage=invited';

    // act
    renderDetails(urlQuery);

    // assert
    const regions = screen
      .getAllByRole('region')
      .flatMap((region) => region.getAttribute('aria-labelledby') ?? [])
      .map((id) => document.getElementById(id)?.textContent);
    expect(regions).toEqual([
      'Profile',
      'Invitation',
      'Onboarding',
      'Subscription',
      'Measurements',
      'Assessment call',
    ]);
  });

  it('reads who she is from her booking, her facts from the onboarding she sent and her weights from her first and latest measurements, in kilograms and centimetres', () => {
    // arrange
    window.localStorage.setItem(
      'eli.unitPreferences',
      JSON.stringify({ weightUnit: 'lb', heightUnit: 'ft-in' }),
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(profileBlock())
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual([
      'Age',
      'Gender',
      'Country',
      'Phone',
      'Height',
      'Starting weight',
      'Current weight',
      'Activity level',
      'Primary goal',
      'Dietary restrictions',
      'Client notes',
    ]);
    expect(profileReading('Age')).toHaveTextContent(/^28 \(15 Jun 1998\)$/);
    expect(profileReading('Gender')).toHaveTextContent('Female');
    expect(profileReading('Country')).toHaveTextContent('Romania');
    expect(
      within(profileReading('Phone')).getByRole('link', {
        name: '+40712345678',
      }),
    ).toHaveAttribute('href', 'tel:+40712345678');
    expect(profileReading('Height')).toHaveTextContent(/^165 cm$/);
    expect(profileReading('Starting weight')).toHaveTextContent(/^67.4 kg$/);
    expect(profileReading('Current weight')).toHaveTextContent(/^66.1 kg$/);
    expect(profileReading('Activity level')).toHaveTextContent(
      /^Mostly sitting$/,
    );
    expect(profileReading('Primary goal')).toHaveTextContent(/^Lose fat$/);
    expect(profileReading('Dietary restrictions')).toHaveTextContent(
      /^Lactose, mild$/,
    );
    expect(profileReading('Client notes')).toHaveTextContent(
      /^Night shifts twice a week, so those days start late\.$/,
    );
    expect(
      within(profileBlock()).queryByText(/profile fills in/),
    ).not.toBeInTheDocument();
  });

  it('reads who she is from her booking and leaves her facts and weights blank until she sends her onboarding', () => {
    // arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    const urlQuery = '?jstage=onboarding';

    // act
    renderDetails(urlQuery);

    // assert
    expect(profileReading('Age')).toHaveTextContent(/^28 \(15 Jun 1998\)$/);
    expect(profileReading('Gender')).toHaveTextContent(/^Female$/);
    expect(profileReading('Country')).toHaveTextContent(/^Romania$/);
    expect(
      within(profileReading('Phone')).getByRole('link', {
        name: '+40712345678',
      }),
    ).toHaveAttribute('href', 'tel:+40712345678');
    expect(
      [
        'Height',
        'Starting weight',
        'Current weight',
        'Activity level',
        'Primary goal',
        'Dietary restrictions',
        'Client notes',
      ].map((label) => profileReading(label).textContent),
    ).toEqual(Array(7).fill('—'));
    expect(
      within(profileBlock()).getByText(
        'Her profile fills in once she sends her onboarding.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the assessment call collapsed until the coach opens it', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');
    const trigger = assessmentCallTrigger();

    // act
    const collapsed = trigger.getAttribute('aria-expanded');
    await user.click(trigger);

    // assert
    expect(collapsed).toBe('false');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(assessmentCallBlock()).getByText('Booking notes'),
    ).toBeVisible();
  });

  it('opens and closes the assessment call from the keyboard', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');
    assessmentCallTrigger().focus();

    // act
    await user.keyboard('{Enter}');
    const afterEnter = assessmentCallTrigger().getAttribute('aria-expanded');
    await user.keyboard(' ');

    // assert
    expect(afterEnter).toBe('true');
    expect(assessmentCallTrigger()).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(assessmentCallBlock()).queryByText('Booking notes'),
    ).not.toBeInTheDocument();
  });

  it('reads what she gave when booking in the assessment call', async () => {
    // arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(assessmentCallTrigger());

    // assert
    expect(
      within(assessmentCallBlock())
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual([
      'Call',
      'Name',
      'Email',
      'Date of birth',
      'Gender',
      'Country',
      'Phone',
      'Primary goal',
      'Booking notes',
    ]);
    expect(assessmentCallReading('Call')).toHaveTextContent(
      /^Wed, Sep 23 · 3:00 PM$/,
    );
    expect(assessmentCallReading('Name')).toHaveTextContent(/^Jane Doe$/);
    expect(assessmentCallReading('Email')).toHaveTextContent(
      /^jane@example.com$/,
    );
    expect(assessmentCallReading('Date of birth')).toHaveTextContent(
      /^15 June 1998$/,
    );
    expect(assessmentCallReading('Gender')).toHaveTextContent(/^Female$/);
    expect(assessmentCallReading('Country')).toHaveTextContent(/^Romania$/);
    expect(
      within(assessmentCallReading('Phone')).getByRole('link', {
        name: '+40712345678',
      }),
    ).toHaveAttribute('href', 'tel:+40712345678');
    expect(assessmentCallReading('Primary goal')).toHaveTextContent(
      /^Lose weight$/,
    );
    expect(assessmentCallReading('Booking notes')).toHaveTextContent(
      'Wants a structured plan with someone to keep her accountable.',
    );
    expect(
      within(assessmentCallBlock()).queryByText('Reduced price'),
    ).not.toBeInTheDocument();
  });

  it('says no to the reduced price last in her subscription when she paid the regular price', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(subscriptionPanel())
        .getAllByRole('term')
        .map((term) => term.textContent)
        .slice(-2),
    ).toEqual(['Renews on', 'Reduced price']);
    expect(readingIn(subscriptionPanel(), 'Reduced price')).toHaveTextContent(
      /^No$/,
    );
  });

  it('says yes to the reduced price in her subscription when she was offered it', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jreduced=1';

    // act
    renderDetails(urlQuery);

    // assert
    expect(readingIn(subscriptionPanel(), 'Reduced price')).toHaveTextContent(
      /^Yes$/,
    );
  });

  it('shows a dash for what she did not give when booking', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted', {
      callId: AWAITING_REVIEW_CALL_ID,
    });

    // act
    await user.click(assessmentCallTrigger());

    // assert
    expect(profileReading('Phone')).toHaveTextContent(/^—$/);
    expect(assessmentCallReading('Phone')).toHaveTextContent(/^—$/);
    expect(assessmentCallReading('Booking notes')).toHaveTextContent(/^—$/);
  });
});

describe('the coach following a client invitation', () => {
  it('shows when the invitation went out and when it expires', () => {
    // arrange
    const urlQuery = '?jstage=invited';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(invitationBlock()).getByText(
        /^Invited \d{1,2} \w+ · expires \d{1,2} \w+$/,
      ),
    ).toBeInTheDocument();
    expect(
      within(invitationBlock()).getByRole('button', {
        name: 'Re-send invitation',
      }),
    ).toBeInTheDocument();
  });

  it('says when the invitation expired', () => {
    // arrange
    const urlQuery = '?jstage=invited&jinv=expired';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(invitationBlock()).getByText(/^Invitation expired \d{1,2} \w+$/),
    ).toBeInTheDocument();
  });

  it('says when the invitation email could not be sent', () => {
    // arrange
    const urlQuery = '?jstage=invited&jinv=email-failed';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(invitationBlock()).getByText('Invitation email could not be sent'),
    ).toBeInTheDocument();
  });

  it('drops the invitation once her account exists', () => {
    // arrange
    const urlQuery = '?jstage=account-created';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      screen.queryByRole('region', { name: 'Invitation' }),
    ).not.toBeInTheDocument();
  });

  it('re-sends a fresh invitation after the coach confirms', async () => {
    // arrange
    const user = renderDetails('?jstage=invited&jinv=expired');
    await user.click(
      within(invitationBlock()).getByRole('button', {
        name: 'Re-send invitation',
      }),
    );
    const confirm = screen.getByRole('dialog', { name: 'Re-send invitation?' });
    expect(
      within(confirm).getByText(
        'A fresh invitation goes to jane@example.com. Her earlier link stops working.',
      ),
    ).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Re-send' }));

    // assert
    expect(
      await screen.findByText(
        'Invitation sent to jane@example.com.',
        {},
        LATENCY_TIMEOUT,
      ),
    ).toBeInTheDocument();
    expect(
      within(invitationBlock()).getByText(
        /^Invited \d{1,2} \w+ · expires \d{1,2} \w+$/,
      ),
    ).toBeInTheDocument();
  });

  it('marks the invitation failed and asks to try again when the email cannot be sent', async () => {
    // arrange
    const user = renderDetails('?jstage=invited&jresend=fails');
    await user.click(
      within(invitationBlock()).getByRole('button', {
        name: 'Re-send invitation',
      }),
    );

    // act
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Re-send invitation?' }),
      ).getByRole('button', { name: 'Re-send' }),
    );

    // assert
    expect(
      await screen.findByText(
        'The invitation email could not be sent. Try again.',
        {},
        LATENCY_TIMEOUT,
      ),
    ).toBeInTheDocument();
    expect(
      within(invitationBlock()).getByText('Invitation email could not be sent'),
    ).toBeInTheDocument();
  });
});

describe('the coach reading about a client by his or their pronouns', () => {
  it('words the page for a man before he sends his answers', () => {
    // arrange
    const urlQuery = '?jstage=invited&jgender=male';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      within(onboardingWidget()).getByText('His answers are not in yet.'),
    ).toBeInTheDocument();
    expect(
      within(profileBlock()).getByText(
        'His profile fills in once he sends his onboarding.',
      ),
    ).toBeInTheDocument();
    expect(
      within(subscriptionPanel()).getByText('Starts when his program is delivered'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('He has not sent any measurements yet.'),
    ).toBeInTheDocument();
  });

  it('words the page for a client who preferred not to say before they send their answers', () => {
    // arrange
    const urlQuery = '?jstage=invited&jgender=prefer-not-to-say';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      within(onboardingWidget()).getByText('Their answers are not in yet.'),
    ).toBeInTheDocument();
    expect(
      within(profileBlock()).getByText(
        'Their profile fills in once they send their onboarding.',
      ),
    ).toBeInTheDocument();
    expect(
      within(subscriptionPanel()).getByText('Starts when their program is delivered'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('They have not sent any measurements yet.'),
    ).toBeInTheDocument();
  });

  it('warns that his earlier invitation link stops working', async () => {
    // arrange
    const user = renderDetails('?jstage=invited&jinv=expired&jgender=male');

    // act
    await user.click(
      within(invitationBlock()).getByRole('button', {
        name: 'Re-send invitation',
      }),
    );

    // assert
    const confirm = screen.getByRole('dialog', { name: 'Re-send invitation?' });
    expect(
      within(confirm).getByText(
        'A fresh invitation goes to jane@example.com. His earlier link stops working.',
      ),
    ).toBeInTheDocument();
  });

  it('warns that their earlier invitation link stops working', async () => {
    // arrange
    const user = renderDetails(
      '?jstage=invited&jinv=expired&jgender=prefer-not-to-say',
    );

    // act
    await user.click(
      within(invitationBlock()).getByRole('button', {
        name: 'Re-send invitation',
      }),
    );

    // assert
    const confirm = screen.getByRole('dialog', { name: 'Re-send invitation?' });
    expect(
      within(confirm).getByText(
        'A fresh invitation goes to jane@example.com. Their earlier link stops working.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to build his program', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jgender=male';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(onboardingWidget()).getByRole('link', {
        name: 'Build his program',
      }),
    ).toBeInTheDocument();
  });

  it('asks which answers the coach wants him to revisit', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted&jgender=male');

    // act
    await user.click(screen.getByRole('button', { name: 'Review answers' }));

    // assert
    expect(
      within(reviewDialog()).getByText(
        'Tick any answer you want him to revisit, then approve or ask for more details.',
      ),
    ).toBeInTheDocument();
  });

  it('asks which answers the coach wants them to revisit', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted&jgender=prefer-not-to-say');

    // act
    await user.click(screen.getByRole('button', { name: 'Review answers' }));

    // assert
    expect(
      within(reviewDialog()).getByText(
        'Tick any answer you want them to revisit, then approve or ask for more details.',
      ),
    ).toBeInTheDocument();
  });

  it('explains when the coach can start building their program', () => {
    // arrange
    const urlQuery = '?jstage=approved&jstart=waiting&jgender=prefer-not-to-say';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(onboardingWidget()).getByText(
        /You can start building their program on/,
      ),
    ).toBeInTheDocument();
  });
});

const PHASE_BASED_FOR_HER =
  'Phase-based — her program follows her cycle phases: she gets a period, is not on the combined pill, is not pregnant, postpartum or breastfeeding, and is not in perimenopause or menopause.';

function cycleModeInfoButton(): HTMLElement {
  return within(onboardingWidget()).getByRole('button', {
    name: 'What cycle mode means',
  });
}

async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
) {
  for (let step = 0; step < 50 && document.activeElement !== target; step++) {
    await user.tab();
  }
}

describe('the coach reading what cycle mode means', () => {
  it('offers an info button beside the cycle mode fact', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    const term = within(onboardingWidget()).getByText('Cycle mode');
    expect(term.closest('dt')).toContainElement(cycleModeInfoButton());
  });

  it('explains every cycle mode when the coach hovers the info button', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted', { postMvp: false });

    // act
    await user.hover(cycleModeInfoButton());

    // assert
    const hint = await screen.findByRole('dialog');
    expect(hint).toHaveTextContent(PHASE_BASED_FOR_HER);
    expect(hint).toHaveTextContent(
      'Symptom-based — one of those does not hold, so her program follows the symptoms she reports.',
    );
    expect(hint).toHaveTextContent(
      'Set by Eli — her contraception is one the product does not classify; you decide how her program adapts.',
    );
    expect(hint).toHaveTextContent(
      'Not answered yet — the cycle form is empty.',
    );
  });

  it('explains the cycle modes when the info button takes keyboard focus', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted', { postMvp: false });

    // act
    await tabTo(user, cycleModeInfoButton());

    // assert
    expect(cycleModeInfoButton()).toHaveFocus();
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      PHASE_BASED_FOR_HER,
    );
  });

  it.each([
    ['a man', 'male'],
    ['a client who preferred not to say', 'prefer-not-to-say'],
  ])('leaves cycle mode out of the facts for %s', (_who, gender) => {
    // arrange
    const urlQuery = `?jstage=submitted&jgender=${gender}`;

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      within(onboardingWidget()).queryByText('Cycle mode'),
    ).not.toBeInTheDocument();
    expect(
      within(onboardingWidget()).queryByRole('button', {
        name: 'What cycle mode means',
      }),
    ).not.toBeInTheDocument();
  });

  it('flags a client who still needs her refund next to her name', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jstart=waiting&jrefund=due';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(within(pageHeader()).getByText('Needs refund')).toBeInTheDocument();
    expect(readingIn(subscriptionPanel(), 'Ended on')).toHaveTextContent(
      /^\d{1,2} \w+$/,
    );
    expect(readingIn(subscriptionPanel(), 'Refund due')).toHaveTextContent(
      /^€447 by \d{1,2} \w+$/,
    );
    expect(
      within(subscriptionPanel()).getByText(
        'Full refund: cancelled within the 14-day withdrawal period.',
      ),
    ).toBeInTheDocument();
  });

  it('reads what is still due after a partial refund', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jrefund=part-refunded';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(within(pageHeader()).getByText('Needs refund')).toBeInTheDocument();
    expect(readingIn(subscriptionPanel(), 'Refund due')).toHaveTextContent(
      /^€298 by \d{1,2} \w+$/,
    );
    expect(
      within(subscriptionPanel()).getByText(
        'Full refund: cancelled within the 14-day withdrawal period. €149 refunded so far.',
      ),
    ).toBeInTheDocument();
  });

  it('reads the refund date and drops the flag once she is refunded', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jrefund=refunded';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      within(pageHeader()).queryByText('Needs refund'),
    ).not.toBeInTheDocument();
    expect(readingIn(subscriptionPanel(), 'Refunded')).toHaveTextContent(
      /^\d{1,2} \w+$/,
    );
    expect(
      within(subscriptionPanel()).queryByText('Refund due'),
    ).not.toBeInTheDocument();
  });

  it('reads when a cancelled client loses access', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jsub=cancelled&jpaid=14';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(readingIn(subscriptionPanel(), 'Ends on')).toHaveTextContent(
      /^\d{1,2} \w+$/,
    );
    expect(
      within(pageHeader()).queryByText('Needs refund'),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['cancelled', '?jstage=submitted&jsub=cancelled'],
    ['ended', '?jstage=submitted&jsub=ended'],
  ])('keeps the answers readable but offers no review actions once %s', (_state, urlQuery) => {
    // arrange
    renderDetails(urlQuery, { postMvp: false });

    // act
    const onboarding = onboardingWidget();

    // assert
    expect(within(onboarding).getByText('Answers')).toBeInTheDocument();
    expect(
      within(onboarding).queryByRole('button', { name: 'Review answers' }),
    ).not.toBeInTheDocument();
    expect(
      within(onboarding).queryByRole('button', { name: 'Approve answers' }),
    ).not.toBeInTheDocument();
  });

  it('offers no review action on a client in review once her coaching has ended', () => {
    // arrange
    const urlQuery = '?jstage=reviewing&jsub=ended';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      within(onboardingWidget()).queryByRole('button', {
        name: 'Continue review',
      }),
    ).not.toBeInTheDocument();
  });

  it('offers no invitation re-send once her coaching has ended', () => {
    // arrange
    const urlQuery = '?jstage=invited&jsub=ended';

    // act
    renderDetails(urlQuery, { postMvp: false });

    // assert
    expect(
      screen.queryByRole('button', { name: 'Re-send invitation' }),
    ).not.toBeInTheDocument();
  });
});
