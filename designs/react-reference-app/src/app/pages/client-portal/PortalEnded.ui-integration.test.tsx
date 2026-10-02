import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { PortalEnded } from './PortalEnded';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

const REFUND_LINE =
  'Eli will refund you in the next few days; it reaches your card within 5–10 business days.';

function renderEnded(devParams: string) {
  const url = `/portal/ended?session=client&jstage=reviewing&${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <PortalEnded />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('the ended page', () => {
  it('says goodbye without an action', () => {
    // arrange
    renderEnded('jsub=ended');

    // act
    const heading = screen.getByRole('heading', { level: 1 });

    // assert
    expect(heading).toHaveTextContent('Your coaching has ended');
    expect(screen.getByText('It was good to train together.')).toBeVisible();
    expect(screen.queryByText(REFUND_LINE)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tells her the refund is on its way while it is due', () => {
    // arrange
    renderEnded('jrefund=due');

    // act
    const line = screen.getByText(REFUND_LINE);

    // assert
    expect(line).toBeVisible();
  });

  it('keeps the refund line while part of it is still due', () => {
    // arrange
    renderEnded('jrefund=part-refunded');

    // act
    const line = screen.getByText(REFUND_LINE);

    // assert
    expect(line).toBeVisible();
  });

  it('drops the refund line once the refund is settled', () => {
    // arrange
    renderEnded('jrefund=refunded');

    // act
    const line = screen.queryByText(REFUND_LINE);

    // assert
    expect(line).not.toBeInTheDocument();
  });
});
