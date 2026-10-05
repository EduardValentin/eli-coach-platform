import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DevToggle } from '../../components/DevToggle';
import { Toaster } from '../../components/ui/sonner';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import {
  AWAITING_REVIEW_CALL_ID,
  ClientJourneyProvider,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ResourceProvider } from '../../context/ResourceContext';
import { ClientResources } from './ClientResources';

const SERVICE_TIMEOUT = { timeout: 4000 };

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width'),
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
  toast.dismiss();
  window.history.replaceState({}, '', '/');
});

const PREPARING_HINT = 'Large files can take a minute or two.';

function renderPageTree(url: string, beside: ReactNode) {
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <ResourceProvider>
                  <Routes>
                    <Route element={<ClientResources />} path="/coach/clients/:id/resources" />
                  </Routes>
                  <Toaster />
                  {beside}
                </ResourceProvider>
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderPage(devParams = '', clientId = 'c1') {
  renderPageTree(`/coach/clients/${clientId}/resources?session=coach${devParams}`, null);
}

function renderPageBesideDevToggle(devParams: string) {
  renderPageTree(`/coach/clients/c1/resources?session=coach${devParams}`, <DevToggle />);
}

const NOTE = 'Read before Monday.';

async function chooseAndSend() {
  await userEvent.click(screen.getByRole('button', { name: 'Add resource' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add resource' });
  await userEvent.upload(within(dialog).getByLabelText('Drop a file here or choose one'), pdf());
  await userEvent.type(within(dialog).getByLabelText(/Description/), NOTE);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Add resource' }));

  return dialog;
}

function shownTitles(): string[] {
  const region = screen.getByRole('region', { name: 'Resources' });

  return within(region)
    .queryAllByRole('button')
    .filter((button) => button.hasAttribute('aria-labelledby'))
    .map((button) => {
      const titleId = button.getAttribute('aria-labelledby') ?? '';
      return document.getElementById(titleId)?.textContent ?? '';
    });
}

async function waitForResources() {
  await screen.findByRole('region', { name: 'Resources' }, SERVICE_TIMEOUT);
}

async function chooseTag(tag: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Tag' }));
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(`^${tag}`) }));
}

function pdf(name = 'Cycle-syncing_starter-guide.pdf'): File {
  return new File([new Uint8Array(400_000)], name, { type: 'application/pdf' });
}

describe('coach resources page', () => {
  it('lists the client’s resources newest first under her name', async () => {
    // arrange
    renderPage();

    // act
    await waitForResources();

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Jane’s resources' })).toBeInTheDocument();
    expect(shownTitles()).toEqual([
      'Plate portions guide',
      'Glute activation warm-up',
      'Luteal phase meal ideas',
      'Weekly macro tracker',
      'Hip thrust form checklist',
      'Sleep and recovery basics',
    ]);
  });

  it('resolves a client from her journey, under her name and with the way back to her record', async () => {
    // arrange
    renderPage('', AWAITING_REVIEW_CALL_ID);

    // act
    await waitForResources();

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Andreea’s resources' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Andreea Popescu' })).toHaveAttribute(
      'href',
      `/coach/clients/${AWAITING_REVIEW_CALL_ID}`,
    );
    expect(shownTitles().length).toBeGreaterThan(0);
  });

  it('answers that the client is not found for an id no client has', () => {
    // arrange
    const unknownId = 'no-such-client';

    // act
    renderPage('', unknownId);

    // assert
    expect(screen.getByRole('heading', { name: 'Client not found' })).toBeInTheDocument();
  });

  it('narrows the grid to one tag', async () => {
    // arrange
    renderPage();
    await waitForResources();

    // act
    await chooseTag('Tracking');

    // assert
    expect(shownTitles()).toEqual(['Weekly macro tracker']);
  });

  it('finds resources by part of their title and clears the filters', async () => {
    // arrange
    renderPage();
    await waitForResources();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'GLUTE');
    const narrowed = shownTitles();

    // act
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(narrowed).toEqual(['Glute activation warm-up']);
    expect(shownTitles()).toHaveLength(6);
  });

  it('adds a resource whose tags resolve to the coach’s existing tags', async () => {
    // arrange
    renderPage();
    await waitForResources();
    await userEvent.click(screen.getByRole('button', { name: 'Add resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add resource' });
    await userEvent.upload(within(dialog).getByLabelText('Drop a file here or choose one'), pdf());
    const prefilledTitle = within(dialog).getByLabelText('Title').getAttribute('value');
    const tags = within(dialog).getByRole('combobox', { name: /^Tags/ });
    await userEvent.type(tags, 'nutr');
    const suggestions = screen.getAllByRole('option').map((option) => option.textContent);
    await userEvent.keyboard('{Enter}');
    await userEvent.type(tags, 'TRAINING');
    const exactMatchOptions = screen.getAllByRole('option').map((option) => option.textContent);
    await userEvent.keyboard('{Enter}');

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add resource' }));

    // assert
    expect(prefilledTitle).toBe('Cycle syncing starter guide');
    expect(suggestions).toEqual(['Nutrition', 'Create “nutr”']);
    expect(exactMatchOptions).toEqual(['Training']);
    await waitFor(() => expect(shownTitles()[0]).toBe('Cycle syncing starter guide'), SERVICE_TIMEOUT);
    expect(screen.queryByRole('dialog', { name: 'Add resource' })).not.toBeInTheDocument();
    const newCard = screen.getByRole('button', { name: 'Cycle syncing starter guide' });
    expect(within(newCard).getByText('Nutrition')).toBeInTheDocument();
    expect(within(newCard).getByText('Training')).toBeInTheDocument();
    expect(await screen.findByText('Resource added.')).toBeInTheDocument();
  });

  it('keeps everything she typed when the upload fails', async () => {
    // arrange
    renderPage('&rupload=fails');
    await waitForResources();
    await userEvent.click(screen.getByRole('button', { name: 'Add resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add resource' });
    await userEvent.upload(within(dialog).getByLabelText('Drop a file here or choose one'), pdf());
    await userEvent.type(within(dialog).getByLabelText(/Description/), 'Read before Monday.');

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add resource' }));

    // assert
    expect(await within(dialog).findByRole('alert', {}, SERVICE_TIMEOUT)).toHaveTextContent(
      'The upload didn’t go through. Try again.',
    );
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Cycle syncing starter guide');
    expect(within(dialog).getByLabelText(/Description/)).toHaveValue('Read before Monday.');
    expect(within(dialog).getByText('Cycle-syncing_starter-guide.pdf')).toBeInTheDocument();
  });

  it('holds the dialog at preparing pages once the file is sent, with nothing to press', async () => {
    // arrange
    renderPage('&rupload=holds');
    await waitForResources();

    // act
    const dialog = await chooseAndSend();

    // assert
    const submit = await within(dialog).findByRole(
      'button',
      { name: 'Preparing pages…' },
      SERVICE_TIMEOUT,
    );
    expect(submit).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const preparing = within(dialog).getByRole('progressbar', { name: 'Preparing pages' });
    expect(preparing).not.toHaveAttribute('aria-valuenow');
    expect(preparing).toHaveAccessibleDescription(PREPARING_HINT);
    expect(within(dialog).queryByRole('progressbar', { name: 'Upload progress' })).toBeNull();
  });

  it('keeps the dialog open with no close control while the file is sending', async () => {
    // arrange
    renderPage();
    await waitForResources();
    const dialog = await chooseAndSend();

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    expect(screen.getByRole('dialog', { name: 'Add resource' })).toBe(dialog);
    expect(within(dialog).getByRole('progressbar', { name: 'Upload progress' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(PREPARING_HINT)).not.toBeInTheDocument();
  });

  it('keeps the dialog open with no close control while the pages are prepared', async () => {
    // arrange
    renderPage('&rupload=holds');
    await waitForResources();
    const dialog = await chooseAndSend();
    await within(dialog).findByRole('button', { name: 'Preparing pages…' }, SERVICE_TIMEOUT);

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    expect(screen.getByRole('dialog', { name: 'Add resource' })).toBe(dialog);
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it.each([
    ['refuses the PDF', 'too-many-pages'],
    ['fails', 'fails'],
  ])('lets her close the dialog again once the server %s', async (_answer, outcome) => {
    // arrange
    renderPage(`&rupload=${outcome}`);
    await waitForResources();
    const dialog = await chooseAndSend();
    await within(dialog).findByRole('button', { name: 'Close' }, SERVICE_TIMEOUT);

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add resource' })).not.toBeInTheDocument(),
    );
  });

  it('releases a held upload when the Dev Toggle answers it another way', async () => {
    // arrange
    const devUser = userEvent.setup({ pointerEventsCheck: 0 });
    renderPageBesideDevToggle('&rupload=holds');
    await waitForResources();
    await devUser.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
    await devUser.click(screen.getByRole('tab', { name: 'Resources' }));
    const dialog = await chooseAndSend();
    await within(dialog).findByRole('button', { name: 'Preparing pages…' }, SERVICE_TIMEOUT);
    await devUser.click(screen.getByRole('combobox', { name: 'Resource upload', hidden: true }));

    // act
    await devUser.click(screen.getByRole('option', { name: 'Works', hidden: true }));

    // assert
    await waitFor(() => expect(shownTitles()[0]).toBe('Cycle syncing starter guide'), SERVICE_TIMEOUT);
    expect(screen.queryByRole('dialog', { name: 'Add resource' })).not.toBeInTheDocument();
  });

  it.each([
    ['too-many-pages', 'That PDF has more than 50 pages.'],
    ['unreadable', 'That PDF can’t be opened. It may be damaged or password protected.'],
  ])(
    'shows the server refusing a PDF (%s) at the file and keeps everything she gave',
    async (outcome, message) => {
      // arrange
      renderPage(`&rupload=${outcome}`);
      await waitForResources();

      // act
      const dialog = await chooseAndSend();

      // assert
      expect(await within(dialog).findByText(message, {}, SERVICE_TIMEOUT)).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Replace')).toHaveAccessibleDescription(message);
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
      expect(within(dialog).getByText('Cycle-syncing_starter-guide.pdf')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Cycle syncing starter guide');
      expect(within(dialog).getByLabelText(/Description/)).toHaveValue('Read before Monday.');
      expect(within(dialog).getByRole('button', { name: 'Add resource' })).toBeEnabled();
    },
  );

  it('refuses a file type it cannot hold at the drop zone', async () => {
    // arrange
    renderPage();
    await waitForResources();
    await userEvent.click(screen.getByRole('button', { name: 'Add resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add resource' });
    const zone = within(dialog).getByLabelText('Drop a file here or choose one');

    // act
    await userEvent.upload(zone, new File(['clip'], 'clip.mp4', { type: 'video/mp4' }), {
      applyAccept: false,
    });

    // assert
    expect(zone).toHaveAccessibleDescription(/That file type can’t be added\./);
  });

  it('edits the details and saves only once something changed', async () => {
    // arrange
    renderPage();
    await waitForResources();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Weekly macro tracker' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit details' });
    const save = within(dialog).getByRole('button', { name: 'Save' });
    const disabledBeforeChange = save.hasAttribute('disabled');
    const title = within(dialog).getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Daily macro tracker');

    // act
    await userEvent.click(save);

    // assert
    expect(disabledBeforeChange).toBe(true);
    expect(within(dialog).queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Daily macro tracker' })).toBeInTheDocument(),
      SERVICE_TIMEOUT,
    );
  });

  it('opens a spreadsheet as a download with the coach’s actions and no pages', async () => {
    // arrange
    renderPage();
    await waitForResources();

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Weekly macro tracker' }));

    // assert
    const viewer = screen.getByRole('dialog', { name: 'Weekly macro tracker' });
    expect(within(viewer).getByText('weekly-macro-tracker.xlsx')).toBeInTheDocument();
    expect(within(viewer).queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
  });

  it('deletes a resource after naming it in the confirmation', async () => {
    // arrange
    renderPage();
    await waitForResources();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Hip thrust form checklist' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete “Hip thrust form checklist”?' });

    // act
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    // assert
    await waitFor(
      () => expect(shownTitles()).not.toContain('Hip thrust form checklist'),
      SERVICE_TIMEOUT,
    );
  });

  it('offers to add the first resource when the client has none', async () => {
    // arrange
    renderPage('&rseed=empty');

    // act
    const empty = await screen.findByText('No resources yet', {}, SERVICE_TIMEOUT);

    // assert
    expect(empty).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add resource' })).toHaveLength(1);
    expect(screen.queryByRole('combobox', { name: 'Tag' })).not.toBeInTheDocument();
  });

  it('says so when the resources do not load', async () => {
    // arrange
    renderPage('&rload=fails');

    // act
    const failure = await screen.findByText('Resources didn’t load', {}, SERVICE_TIMEOUT);

    // assert
    expect(failure).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
