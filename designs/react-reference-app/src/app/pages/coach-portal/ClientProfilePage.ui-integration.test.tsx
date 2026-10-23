import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { ClientProfilePage } from './ClientProfilePage';

const SAVE_TIMEOUT = { timeout: 3000 };

const ADAPTED_FOR_HER =
  'Adapted to symptoms — the program keeps the same sessions all cycle and adds adjustment rules for the days she reports symptoms.';

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
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:avatar'),
  });
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderProfilePage(devParams: string) {
  const url = `/coach/clients/c1/profile?session=coach&${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <Routes>
                <Route path="/coach/clients/:id/profile" element={<ClientProfilePage />} />
                <Route path="/coach/clients/:id" element={<p>client record</p>} />
              </Routes>
              <Toaster />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

function saveButton(sectionName: string): HTMLElement {
  return within(section(sectionName)).getByRole('button', { name: 'Save changes' });
}

describe('the coach client profile page', () => {
  it('groups her full profile as about her, coaching and preferences once her answers are approved', () => {
    // act
    renderProfilePage('jstage=approved');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Jane Doe/ })).toHaveAttribute('href', '/coach/clients/c1');
    expect(screen.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeInTheDocument();
    for (const name of ['About her', 'Coaching', 'Preferences']) {
      expect(section(name)).toBeInTheDocument();
    }
    expect(within(section('About her')).getByRole('textbox', { name: /First name/ })).toHaveValue('Jane');
    expect(within(section('Coaching')).getByRole('radio', { name: '3 days' })).toBeChecked();
    expect(within(section('Coaching')).getByRole('radio', { name: 'Gym' })).toBeChecked();
    expect(within(section('Coaching')).getByRole('textbox', { name: /Limitations/ })).toHaveValue(
      'Right shoulder aches on overhead pressing.',
    );
  });

  it('says her coaching facts fill in once her answers are approved, and shows no preferences before then', () => {
    // act
    renderProfilePage('jstage=submitted');

    // assert
    expect(within(section('Coaching')).getByText('These fill in once her answers are approved.')).toBeInTheDocument();
    expect(within(section('Coaching')).queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Preferences' })).not.toBeInTheDocument();
    expect(within(section('About her')).getByRole('textbox', { name: /First name/ })).toHaveValue('Jane');
  });

  it('keeps her email read-only and says why', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');

    // act
    await user.hover(screen.getByRole('button', { name: "Why the email can't be changed" }));

    // assert
    expect(within(section('About her')).queryByRole('textbox', { name: /Email/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      "She signs in and pays with this address, so it can't be changed.",
    );
  });

  it('saves a section only once something in it changed', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    expect(saveButton('About her')).toBeDisabled();

    // act
    await user.clear(within(section('About her')).getByRole('textbox', { name: /First name/ }));
    await user.type(within(section('About her')).getByRole('textbox', { name: /First name/ }), 'Anna');

    // assert
    expect(saveButton('About her')).toBeEnabled();
    expect(saveButton('Coaching')).toBeDisabled();
  });

  it('saves her identity, confirms it and shows the new name', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    const firstName = within(section('About her')).getByRole('textbox', { name: /First name/ });
    await user.clear(firstName);
    await user.type(firstName, 'Anna');

    // act
    await user.click(saveButton('About her'));

    // assert
    expect(await screen.findByText('Changes saved', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Anna Doe' })).toBeInTheDocument();
    expect(saveButton('About her')).toBeDisabled();
  });

  it('saves her coaching facts and coach notes in their own section', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    await user.click(within(section('Coaching')).getByRole('radio', { name: '5+ days' }));
    await user.type(within(section('Coaching')).getByRole('textbox', { name: /Coach notes/ }), 'Prefers mornings.');

    // act
    await user.click(saveButton('Coaching'));

    // assert
    expect(await screen.findByText('Changes saved', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(within(section('Coaching')).getByRole('radio', { name: '5+ days' })).toBeChecked();
    expect(within(section('Coaching')).getByRole('textbox', { name: /Coach notes/ })).toHaveValue('Prefers mornings.');
    expect(saveButton('Coaching')).toBeDisabled();
  });

  it('keeps what the coach entered and says so when the save fails', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved&jprofile=fails');
    const firstName = within(section('About her')).getByRole('textbox', { name: /First name/ });
    await user.clear(firstName);
    await user.type(firstName, 'Anna');

    // act
    await user.click(saveButton('About her'));

    // assert
    expect(await screen.findByText("Your changes weren't saved. Try again.", {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(firstName).toHaveValue('Anna');
    expect(screen.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeInTheDocument();
    expect(saveButton('About her')).toBeEnabled();
  });

  it('explains a field problem at the field and does not save', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    await user.clear(within(section('About her')).getByRole('textbox', { name: /First name/ }));
    const height = within(section('Coaching')).getByRole('spinbutton', { name: /Height/ });
    await user.clear(height);
    await user.type(height, '80');

    // act
    await user.click(saveButton('About her'));
    await user.click(saveButton('Coaching'));

    // assert
    expect(within(section('About her')).getByText('Enter an answer.')).toBeInTheDocument();
    expect(within(section('Coaching')).getByText('Enter a height between 120 and 230 cm.')).toBeInTheDocument();
    expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
  });

  it('shows her height and goal weight in the coach units', () => {
    // arrange
    window.localStorage.setItem('eli.unitPreferences', JSON.stringify({ weightUnit: 'lb', heightUnit: 'ft-in' }));

    // act
    renderProfilePage('jstage=approved');

    // assert
    expect(within(section('Coaching')).getByRole('spinbutton', { name: /Height/ })).toHaveValue(65);
    expect(within(section('Coaching')).getByRole('spinbutton', { name: /Goal weight/ })).toHaveValue(136.7);
  });

  it('explains every cycle mode beside the cycle mode choice', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');

    // act
    await user.hover(screen.getByRole('button', { name: 'What cycle mode means' }));

    // assert
    const hint = await screen.findByRole('dialog');
    expect(hint).toHaveTextContent(ADAPTED_FOR_HER);
    expect(hint).toHaveTextContent('General — no cycle-driven adjustments; the low-energy session stays available.');
  });

  it('leaves the cycle mode out for a man', () => {
    // act
    renderProfilePage('jstage=approved&jgender=male');

    // assert
    expect(within(section('Coaching')).queryByRole('radiogroup', { name: /Cycle mode/ })).not.toBeInTheDocument();
    expect(section('About him')).toBeInTheDocument();
  });

  it('shows her preferences read-only and says why', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    const preferences = section('Preferences');

    // act
    await user.hover(within(preferences).getByRole('button', { name: "Why the check-in day can't be changed" }));

    // assert
    expect(within(preferences).getByText('Monday')).toBeInTheDocument();
    expect(within(preferences).getByText('Email')).toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'These come from her onboarding answers and stay as she chose them.',
    );
  });
});

describe('the coach managing her profile picture', () => {
  it('uploads a picture and then offers to change or remove it', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    const picture = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    // act
    await user.upload(screen.getByLabelText('Upload picture'), picture);

    // assert
    expect(await screen.findByText('Profile picture updated', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByLabelText('Change picture')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('offers to change or remove a picture she already has', () => {
    // act
    renderProfilePage('jstage=approved&javatar=picture');

    // assert
    expect(screen.getByLabelText('Change picture')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('removes the picture after the coach confirms', async () => {
    // arrange
    const user = renderProfilePage('jstage=approved');
    await user.upload(screen.getByLabelText('Upload picture'), new File(['avatar'], 'avatar.png', { type: 'image/png' }));
    await screen.findByText('Profile picture updated', {}, SAVE_TIMEOUT);

    // act
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    // assert
    expect(await screen.findByText('Profile picture removed', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByLabelText('Upload picture')).toBeInTheDocument();
  });

  it('refuses a file that is not a JPEG, PNG or WebP image', async () => {
    // arrange
    renderProfilePage('jstage=approved');
    const user = userEvent.setup({ applyAccept: false });

    // act
    await user.upload(screen.getByLabelText('Upload picture'), new File(['gif'], 'avatar.gif', { type: 'image/gif' }));

    // assert
    expect(await screen.findByText('Choose a JPEG, PNG or WebP under 10 MB.')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload picture')).toBeInTheDocument();
  });
});
