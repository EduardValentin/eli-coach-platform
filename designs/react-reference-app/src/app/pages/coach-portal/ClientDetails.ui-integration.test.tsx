import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ClientDetails } from './ClientDetails';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

function renderClientPage(clientId: string) {
  render(
    <MemoryRouter initialEntries={[`/coach/clients/${clientId}`]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <Routes>
                <Route path="/coach/clients/:id" element={<ClientDetails />} />
              </Routes>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('the client page for an id on no roster', () => {
  it('shows the client-not-found dead end', () => {
    // arrange, act
    renderClientPage('unknown-id');

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Client not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This client is not on your roster, or the link is incorrect.',
    );
  });
});
