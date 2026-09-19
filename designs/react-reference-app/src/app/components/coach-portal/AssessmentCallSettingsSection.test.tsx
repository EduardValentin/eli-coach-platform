import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { AssessmentCallSettingsSection } from './AssessmentCallSettingsSection';

const SAVE_WAIT = { timeout: 4000 };

function stubBrowserTimeZone(timeZone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

function renderSection(search = '') {
  window.history.replaceState({}, '', `/coach/settings${search}`);

  return render(
    <MemoryRouter initialEntries={[`/coach/settings${search}`]}>
      <AppProvider>
        <AssessmentCallProvider>
          <Toaster />
          <AssessmentCallSettingsSection />
        </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function selectHour(user: UserEvent, label: string, hour: string) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: hour }));
}

async function fillValidMeetingLink(user: UserEvent) {
  await user.type(
    screen.getByLabelText('Meeting link'),
    'https://meet.google.com/abc-defg-hij',
  );
}

const saveButton = () => screen.getByRole('button', { name: /save changes|saving/i });

beforeEach(() => {
  stubBrowserTimeZone('Europe/Bucharest');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AssessmentCallSettingsSection', () => {
  it('shows the defaults before any save', () => {
    // arrange
    // act
    renderSection();

    // assert
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Friday' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Saturday' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sunday' })).not.toBeChecked();
    expect(screen.getByLabelText('Start')).toHaveTextContent('17:00');
    expect(screen.getByLabelText('End')).toHaveTextContent('20:00');
    expect(screen.getByLabelText('Meeting link')).toHaveValue('');
    expect(
      screen.getByText('Visitors cannot join calls until a link is set.'),
    ).toBeInTheDocument();
  });

  it('refuses a save with no weekday, keeps values, and announces the message', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection();
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(screen.getByRole('checkbox', { name: day }));
    }
    await fillValidMeetingLink(user);

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick at least one day.');
    expect(screen.getByRole('checkbox', { name: 'Monday' })).not.toBeChecked();
    expect(screen.getByLabelText('Meeting link')).toHaveValue(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('refuses a save when the start is not before the end, and keeps values', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection();
    await selectHour(user, 'Start', '20:00');
    await selectHour(user, 'End', '20:00');
    await fillValidMeetingLink(user);

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The start hour must be before the end hour.',
    );
    expect(screen.getByLabelText('Start')).toHaveTextContent('20:00');
    expect(screen.getByLabelText('End')).toHaveTextContent('20:00');
  });

  it('refuses a save with an invalid meeting link, and keeps it as typed', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByLabelText('Meeting link'), 'http://meet.google.com/abc');

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a full https:// link, or leave it empty.',
    );
    expect(screen.getByLabelText('Meeting link')).toHaveValue('http://meet.google.com/abc');
  });

  it('hides the no-link warning once a link is typed and shows it again once cleared', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection();
    const warning = 'Visitors cannot join calls until a link is set.';
    expect(screen.getByText(warning)).toBeInTheDocument();

    // act
    await user.type(screen.getByLabelText('Meeting link'), 'https://meet.google.com/abc');

    // assert
    expect(screen.queryByText(warning)).not.toBeInTheDocument();

    // act
    await user.clear(screen.getByLabelText('Meeting link'));

    // assert
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('shows a success toast when the save succeeds', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection();
    await fillValidMeetingLink(user);

    // act
    await user.click(saveButton());

    // assert
    expect(saveButton()).toHaveTextContent('Saving…');
    expect(await screen.findByText('Settings saved', {}, SAVE_WAIT)).toBeInTheDocument();
  });

  it('shows an error toast and keeps values on a server failure', async () => {
    // arrange
    const user = userEvent.setup();
    renderSection('?callsettingssave=server_error');
    await fillValidMeetingLink(user);

    // act
    await user.click(saveButton());

    // assert
    expect(
      await screen.findByText(
        "We couldn't save your settings. Try again in a moment.",
        {},
        SAVE_WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Meeting link')).toHaveValue(
      'https://meet.google.com/abc-defg-hij',
    );
    expect(saveButton()).toHaveTextContent('Save changes');
  });
});
