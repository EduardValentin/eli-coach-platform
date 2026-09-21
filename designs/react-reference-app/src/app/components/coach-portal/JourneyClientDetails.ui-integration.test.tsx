import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JourneyClientDetails } from './JourneyClientDetails';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import {
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
  window.history.replaceState({}, '', '/');
});

function DemoJourneyDetails() {
  const { demoJourney } = useClientJourneys();

  return <JourneyClientDetails journey={demoJourney} />;
}

function renderDetails(urlQuery: string) {
  const url = `/coach/clients/c1${urlQuery}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <DemoJourneyDetails />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function onboardingWidget(): HTMLElement {
  return screen.getByRole('region', { name: 'Onboarding' });
}

function pageHeader(): HTMLElement {
  const header = screen.getByRole('heading', { level: 1 }).closest('header');
  if (!header) throw new Error('No page header');

  return header;
}

describe('the coach view of a client in onboarding', () => {
  it('badges an immediate start beside her name and keeps the stage out of the header', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const header = pageHeader();
    expect(within(header).getByText('Immediate start')).toBeInTheDocument();
    expect(within(header).queryByText('Sent to coach')).not.toBeInTheDocument();
  });

  it('names the day a waiting client starts beside her name', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jstart=waiting';

    // act
    renderDetails(urlQuery);

    // assert
    expect(within(pageHeader()).getByText(/^Starts on /)).toBeInTheDocument();
  });

  it('shows the journey status only inside the onboarding widget', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(onboardingWidget()).getByText('Sent to coach'),
    ).toBeInTheDocument();
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
      within(widget).getByRole('button', { name: /Your cycle and hormonal context/ }),
    ).toBeInTheDocument();
  });

  it('opens a form and reads its answers back, marking the ones she skipped', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', { name: /Your measurements/ }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('Waist')).toBeInTheDocument();
    expect(within(widget).getByText('74 cm')).toBeInTheDocument();
    expect(within(widget).getAllByText('Not answered')).toHaveLength(2);
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
    const injury = within(widget).getByText('Bone or joint problem').nextSibling;
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

  it('opens the answers the moment the coach starts the review', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(screen.getByRole('button', { name: 'Start review' }));

    // assert
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { level: 3, name: "Jane's answers" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Ask for more details' }),
    ).toBeInTheDocument();
  });

  it('offers to continue a review she has already started', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');
    await user.click(screen.getByRole('button', { name: 'Start review' }));

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(
      within(onboardingWidget()).getByRole('button', { name: 'Continue review' }),
    ).toBeInTheDocument();
    expect(
      within(onboardingWidget()).queryByRole('button', { name: 'Start review' }),
    ).not.toBeInTheDocument();
  });

  it('closes the review without moving her on', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    const dialog = screen.getByRole('dialog');
    const actions = within(dialog).getByRole('button', {
      name: 'Ask for more details',
    }).parentElement as HTMLElement;

    // act
    await user.click(within(actions).getByRole('button', { name: 'Close' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(onboardingWidget()).getByRole('button', { name: 'Continue review' }),
    ).toBeInTheDocument();
  });

  it('asks for more details only once a question is flagged and a note written', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');

    // act
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    // assert
    const dialog = screen.getByRole('dialog');
    const send = within(dialog).getByRole('button', {
      name: 'Ask for more details',
    });
    expect(send).toBeDisabled();
    expect(within(dialog).getByText('0 questions flagged')).toBeVisible();

    await user.click(
      within(dialog).getByRole('checkbox', { name: /Sleep hours/ }),
    );
    expect(within(dialog).getByText('1 question flagged')).toBeVisible();
    expect(send).toBeDisabled();

    await user.type(
      within(dialog).getByRole('textbox', { name: 'What is missing' }),
      'Tell me more about your sleep.',
    );
    expect(send).toBeEnabled();
  });

  it('sends the request and moves her back to answering', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));
    const dialog = screen.getByRole('dialog');

    // act
    await user.click(
      within(dialog).getByRole('checkbox', { name: /Sleep hours/ }),
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'What is missing' }),
      'Tell me more about your sleep.',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Ask for more details' }),
    );

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
