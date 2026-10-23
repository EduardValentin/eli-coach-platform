import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { ClientProgramDocument } from './ClientProgramDocument';

const WEDNESDAY_OF_WEEK_ONE = new Date(2026, 8, 23, 10);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(WEDNESDAY_OF_WEEK_ONE);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderDocumentRoute(path: string) {
  const url = `${path}?session=client&pseed=published&jstage=program-ready`;
  window.history.replaceState({}, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <UnitPreferencesProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <ProgramProvider>
                    <Routes>
                      <Route element={<ClientProgramDocument />} path="/portal/program/document" />
                      <Route element={<ClientProgramDocument />} path="/portal/program/document/:version" />
                      <Route element={<p>program page</p>} path="/portal/program" />
                    </Routes>
                  </ProgramProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </UnitPreferencesProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('the client program document opened by direct link', () => {
  it('shows the document instead of redirecting before the program is seeded', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document');

    // act
    const heading = await screen.findByRole('heading', { level: 1 });

    // assert
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('shows a published version opened by direct link', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document/1');

    // act
    const heading = await screen.findByRole('heading', { level: 1 });

    // assert
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('redirects to the program once seeded when the version does not exist', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document/99');

    // act
    const page = await screen.findByText('program page');

    // assert
    expect(page).toBeInTheDocument();
  });
});
