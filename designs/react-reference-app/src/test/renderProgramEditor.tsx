import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { Toaster } from '../app/components/ui/sonner';
import { AppProvider } from '../app/context/AppContext';
import { AssessmentCallProvider } from '../app/context/AssessmentCallContext';
import { ClientJourneyProvider } from '../app/context/ClientJourneyContext';
import { ClientProfileProvider } from '../app/context/ClientProfileContext';
import { ProgramProvider } from '../app/context/ProgramContext';
import { TrainingProvider } from '../app/context/TrainingContext';
import { UnitPreferencesProvider } from '../app/context/UnitPreferencesContext';
import { ProgramEditorPage } from '../app/pages/coach-portal/ProgramEditorPage';

function stubViewport(matchesWidth: (query: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') || matchesWidth(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

export function stubPhoneViewport() {
  stubViewport(() => false);
}

export function stubEditorBrowserApis() {
  stubViewport(query => query.includes('min-width'));
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
}

export function renderProgramEditor(search: string, path = '/coach/clients/c1/program/draft') {
  const url = `${path}?session=coach${search}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <ClientProfileProvider>
            <TrainingProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <ProgramProvider>
                    <Routes>
                      <Route path="/coach/clients/:id/program/draft" element={<ProgramEditorPage />} />
                      <Route path="/coach/clients/:id/program" element={<p>Program page</p>} />
                      <Route path="/coach/clients/:id" element={<p>Client page</p>} />
                    </Routes>
                    <Toaster />
                  </ProgramProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </TrainingProvider>
          </ClientProfileProvider>
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
