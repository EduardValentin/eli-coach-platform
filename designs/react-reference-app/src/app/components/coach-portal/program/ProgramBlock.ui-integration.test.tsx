import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProgramBlock } from './ProgramBlock';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider, useClientJourneys } from '../../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../../context/ClientProfileContext';
import { ProgramProvider } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';

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
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function DemoProgramBlock() {
  const { demoJourney } = useClientJourneys();
  return <ProgramBlock journey={demoJourney} />;
}

function renderBlock(query: string) {
  const url = `/coach/clients/c1?session=coach${query}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>
                    <Route path="*" element={<><DemoProgramBlock /><Location /></>} />
                  </Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function programSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Program' });
}

describe('ProgramBlock', () => {
  it('offers to build a program once her onboarding is sent', () => {
    // arrange
    const query = '&pseed=none&jstage=approved';

    // act
    renderBlock(query);

    // assert
    expect(within(programSection()).getByRole('link', { name: 'Build program' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/new',
    );
  });

  it('holds the program back until her onboarding is sent', () => {
    // arrange
    const query = '&pseed=none&jstage=invited';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText('Available once her onboarding is sent')).toBeInTheDocument();
    expect(within(section).queryByRole('link', { name: 'Build program' })).not.toBeInTheDocument();
  });

  it('continues a draft that is not published yet', () => {
    // arrange
    const query = '&pseed=draft&jstage=approved';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText(/^Draft version 1, started \d+ \w+$/)).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Continue draft' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/draft',
    );
  });

  it('summarises the published version and where she is in the plan', () => {
    // arrange
    const query = '&pseed=published&jstage=program-ready';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText(/Version 1 · published/)).toBeInTheDocument();
    expect(within(section).getByText(/week 1 of 11/)).toBeInTheDocument();
    expect(within(section).getByText(/^Next check-in form \d+ \w+$/)).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'View program' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program',
    );
  });

  it('starts a new version and then offers to continue the draft', async () => {
    // arrange
    const user = renderBlock('&pseed=published&jstage=program-ready');

    // act
    await user.click(within(programSection()).getByRole('button', { name: 'New version' }));

    // assert
    expect(screen.getByTestId('location')).toHaveTextContent('/coach/clients/c1/program/draft');
    const section = programSection();
    expect(within(section).getByRole('link', { name: 'Continue draft' })).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
  });
});
