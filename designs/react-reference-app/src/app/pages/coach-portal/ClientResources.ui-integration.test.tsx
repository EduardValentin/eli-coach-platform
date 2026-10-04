import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../../components/ui/sonner';
import { AppProvider } from '../../context/AppContext';
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

function renderPage(devParams = '') {
  const url = `/coach/clients/c1/resources?session=coach${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <ResourceProvider>
            <Routes>
              <Route element={<ClientResources />} path="/coach/clients/:id/resources" />
            </Routes>
            <Toaster />
          </ResourceProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
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
