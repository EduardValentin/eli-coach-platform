import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider } from '../context/CheckinContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { DevToggle } from './DevToggle';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
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
  window.history.replaceState(null, '', '/');
});

function renderDevToggle(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <AppProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <NotificationProvider>
              <CheckinProvider>
                <DevToggle />
              </CheckinProvider>
              </NotificationProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function openDevSettings() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
}

describe('DevToggle prototype mode', () => {
  it('shows only MVP settings by default', async () => {
    // arrange
    renderDevToggle();

    // act
    await openDevSettings();

    // assert
    expect(screen.getByRole('combobox', { name: 'Prototype mode' })).toHaveTextContent('MVP');
    expect(screen.queryByRole('tab', { name: 'Nutrition' })).not.toBeInTheDocument();
  });

  it('adds Post-MVP settings in Post-MVP mode', async () => {
    // arrange
    renderDevToggle('?scope=post-mvp');

    // act
    await openDevSettings();

    // assert
    expect(screen.getByRole('combobox', { name: 'Prototype mode' })).toHaveTextContent('Post-MVP');
    expect(screen.getByRole('tab', { name: 'Nutrition' })).toBeInTheDocument();
  });
});

describe('DevToggle journey stage on leaving Post-MVP', () => {
  it.each([
    ['review-call-scheduled', 'approved'],
    ['program-ready', 'program-ready'],
  ])('moves %s to %s', async (stage, expected) => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle(`?scope=post-mvp&jstage=${stage}`);
    await openDevSettings();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Prototype mode' }));
    await user.click(screen.getByRole('option', { name: 'MVP' }));

    // assert
    const params = new URLSearchParams(window.location.search);
    expect(params.get('jstage') ?? 'approved').toBe(expected);
  });
});

describe('DevToggle links sent by the coach', () => {
  it('opens the payment link with its token in the fragment and the dev settings in the query', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?jstage=payment-link-sent');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // assert
    const [paymentLink] = screen.getAllByRole('link', {
      name: /^Open payment link · /,
    });
    expect(paymentLink).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^\/select-bundle\?jstage=payment-link-sent#pl-seed-[\w-]+$/,
      ),
    );
  });
});

describe('DevToggle resource upload', () => {
  it('drives the upload through to an answer, a held preparing state or either server refusal', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Resource upload' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Works',
      'Fails',
      'Holds at preparing',
      'Refused: over 50 pages',
      'Refused: cannot be read',
    ]);
  });

  it('keeps the chosen outcome in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));
    await user.click(screen.getByRole('combobox', { name: 'Resource upload' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Holds at preparing' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource upload' })).toHaveTextContent(
      'Holds at preparing',
    );
    expect(new URLSearchParams(window.location.search).get('rupload')).toBe('holds');
  });
});

describe('DevToggle exercise video upload', () => {
  it('drives the exercise video save through, holds it, fails it or has the server refuse it', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Video upload' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Works',
      'Holds while uploading',
      'Holds while finishing',
      'Fails',
      'Refused as not a video',
    ]);
  });

  it('keeps the chosen outcome in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));
    await user.click(screen.getByRole('combobox', { name: 'Video upload' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Holds while uploading' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Video upload' })).toHaveTextContent(
      'Holds while uploading',
    );
    expect(new URLSearchParams(window.location.search).get('exupload')).toBe('holds-uploading');
  });

  it('offers the builder sessions setting under the builder week dates, defaulting to the weekly sets and cardio', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // act
    const weekDates = screen.getByRole('combobox', { name: 'Builder week dates' });
    const select = screen.getByRole('combobox', { name: 'Builder sessions' });
    await user.click(select);

    // assert
    expect(weekDates.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(select).toHaveTextContent('Weekly sets and cardio');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Weekly sets and cardio',
      'First week, no cardio (as production)',
    ]);
    expect(new URLSearchParams(window.location.search).has('psessions')).toBe(false);
  });

  it('keeps the builder sessions in the address only while they are not the default', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Builder sessions' }));

    // act
    await user.click(screen.getByRole('option', { name: 'First week, no cardio (as production)' }));

    // assert
    expect(new URLSearchParams(window.location.search).get('psessions')).toBe('first-week');

    // act
    await user.click(screen.getByRole('combobox', { name: 'Builder sessions' }));
    await user.click(screen.getByRole('option', { name: 'Weekly sets and cardio' }));

    // assert
    expect(new URLSearchParams(window.location.search).has('psessions')).toBe(false);
  });

  it('reads the builder sessions from a shared address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?psessions=first-week');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Builder sessions' })).toHaveTextContent('First week, no cardio (as production)');
  });

  it('reads the outcome from a shared address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?exupload=fails');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Video upload' })).toHaveTextContent('Fails');
    expect(new URLSearchParams(window.location.search).get('exupload')).toBe('fails');
  });

  it('keeps the exercise library seed beside the video upload', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Exercise library' })).toHaveTextContent('Populated');
  });
});

describe('DevToggle recipe photo upload', () => {
  it('drives the recipe photo save through, holds it, fails it or has the server refuse it', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Recipe photo upload' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Works',
      'Holds',
      'Fails',
      'Refused',
    ]);
  });

  it('keeps the chosen outcome in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));
    await user.click(screen.getByRole('combobox', { name: 'Recipe photo upload' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Holds' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Recipe photo upload' })).toHaveTextContent('Holds');
    expect(new URLSearchParams(window.location.search).get('rphoto')).toBe('holds');
  });

  it('reads the outcome from a shared address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?rphoto=refused');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Exercises' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Recipe photo upload' })).toHaveTextContent('Refused');
    expect(new URLSearchParams(window.location.search).get('rphoto')).toBe('refused');
  });
});

describe('DevToggle resource opening', () => {
  it('keeps a failing opening in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));
    await user.click(screen.getByRole('combobox', { name: 'Resource opening' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Fails' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource opening' })).toHaveTextContent('Fails');
    expect(new URLSearchParams(window.location.search).get('rmark')).toBe('fails');
  });

  it('restores a failing opening from the address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?rmark=fails');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Resources' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource opening' })).toHaveTextContent('Fails');
  });
});

describe('DevToggle draft saves', () => {
  it('lets a draft save work, fail until switched back, or be refused because the draft changed elsewhere', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Draft saves' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Works',
      'Fails (retries until switched back)',
      'Changed elsewhere (save refused)',
    ]);
  });

  it('keeps the chosen outcome in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Draft saves' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Changed elsewhere (save refused)' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Draft saves' })).toHaveTextContent(
      'Changed elsewhere (save refused)',
    );
    expect(new URLSearchParams(window.location.search).get('pdraft')).toBe('stale');
  });

  it('keeps the builder week dates in the address so a state without day 1 dates can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Builder week dates' }));

    // act
    await user.click(screen.getByRole('option', { name: 'None (as production before publishing)' }));

    // assert
    expect(new URLSearchParams(window.location.search).get('pweekdates')).toBe('undated');
  });

  it('reads the outcome from a shared address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?pdraft=fails');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Draft saves' })).toHaveTextContent(
      'Fails (retries until switched back)',
    );
  });
});
