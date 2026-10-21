import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClientProgramPage } from './ClientProgramPage';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { TrainingProvider } from '../../context/TrainingContext';

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

function renderPage(clientId: string, query: string) {
  const url = `/coach/clients/${clientId}/program?session=coach${query}`;
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
                    <Route path="/coach/clients/:id/program" element={<ClientProgramPage />} />
                  </Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('ClientProgramPage', () => {
  it('lists both versions with what changed and the plan of the current one', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Program' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Back to / })).toHaveAttribute('href', '/coach/clients/c1');
    expect(screen.getAllByRole('definition').map(definition => definition.textContent)).toContainEqual(
      expect.stringMatching(/^Version 2 · \d+ \w+$/),
    );
    const versions = screen.getByRole('region', { name: 'Versions' });
    expect(within(versions).getByText(/^Version 2 · Published/)).toBeInTheDocument();
    expect(within(versions).getByText(/^Version 1 · Superseded/)).toBeInTheDocument();
    expect(within(versions).getByText(/^Version 3 · Draft$/)).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Your plan' })).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('shows the document of the current version and links each version to its document', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'What changed in v2' })).toBeInTheDocument();
    const versions = screen.getByRole('region', { name: 'Versions' });
    expect(within(versions).getAllByRole('link', { name: 'Open document' })[0]).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/document/3',
    );
  });

  it('says the client was not found when there is no program', () => {
    // arrange
    const query = '&pseed=none';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByText('Client not found')).toBeInTheDocument();
  });
});
