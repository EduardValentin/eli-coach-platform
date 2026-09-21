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
    ).toHaveTextContent('3 of 5 answered');
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

  it('asks for more details only once a question is flagged and a note written', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');

    // act
    await user.click(screen.getByRole('button', { name: 'Needs more details' }));

    // assert
    const dialog = screen.getByRole('dialog');
    const send = within(dialog).getByRole('button', { name: 'Send the request' });
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
    await user.click(screen.getByRole('button', { name: 'Needs more details' }));
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
      within(dialog).getByRole('button', { name: 'Send the request' }),
    );

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
