import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../../context/ClientProfileContext';
import { ProgramProvider } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';

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
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderSheet(query: string) {
  const url = `/coach/clients/c1/program/new?session=coach${query}`;
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
                    <Route path="/coach/clients/:id/program/new" element={<ProgramEditorPage />} />
                    <Route path="/coach/clients/:id/program/draft" element={<p>Editor</p>} />
                    <Route path="/coach/clients/:id" element={<p>Client page</p>} />
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

describe('ProgramSetupSheet', () => {
  it('prefills from onboarding and creates the draft', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(screen.getByRole('heading', { name: 'Set up the program' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Beginner');
    expect(screen.getByRole('combobox', { name: 'Training days' })).toHaveTextContent('3 days');
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveTextContent('60 min');
    expect(screen.getByRole('combobox', { name: 'Daily steps' })).toHaveTextContent('6,000');

    // act
    await user.click(screen.getByRole('button', { name: 'Continue to plan' }));

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('changes a choice before creating the draft', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('combobox', { name: 'Level' }));
    await user.click(screen.getByRole('option', { name: 'Advanced' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Advanced');
  });

  it('returns to the client page on cancel', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });

  it('opens the existing draft instead of setting up again', () => {
    // arrange / act
    renderSheet('&pseed=draft&jstage=approved');

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
