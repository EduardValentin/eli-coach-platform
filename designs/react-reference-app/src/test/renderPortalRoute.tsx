import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Routes } from 'react-router';
import { AppProvider } from '../app/context/AppContext';
import { AssessmentCallProvider } from '../app/context/AssessmentCallContext';
import { ClientJourneyProvider } from '../app/context/ClientJourneyContext';
import { ProgramProvider } from '../app/context/ProgramContext';
import { TrainingProvider } from '../app/context/TrainingContext';
import { UnitPreferencesProvider } from '../app/context/UnitPreferencesContext';

/** Renders the routes at a URL inside the portal's providers; the URL's query sets the Dev Toggle state, as it does in the browser. */
export function renderPortalRoute(url: string, routes: ReactNode) {
  window.history.replaceState({}, '', url);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <UnitPreferencesProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>{routes}</Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </UnitPreferencesProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}
