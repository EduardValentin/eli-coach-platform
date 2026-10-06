import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ResourceProvider } from '../../context/ResourceContext';
import { ClientResources } from './ClientResources';

const SERVICE_TIMEOUT = { timeout: 4000 };
const WARM_UP_PAGES = 6;

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
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

function renderPage(devParams = '') {
  const url = `/portal/resources?session=client${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <ResourceProvider>
            <ClientResources />
          </ResourceProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function resourceCard(title: string): Promise<HTMLElement> {
  return screen.findByRole('button', { name: title }, SERVICE_TIMEOUT);
}

describe('client resources page', () => {
  it('shows her resources with the unopened ones marked new', async () => {
    // arrange
    renderPage();

    // act
    const plate = await resourceCard('Plate portions guide');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Resources' })).toBeInTheDocument();
    expect(plate).toHaveAccessibleDescription(/New/);
    expect(screen.getByRole('button', { name: 'Weekly macro tracker' })).not.toHaveAccessibleDescription(/New/);
    expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument();
  });

  it('clears the new marker once she opens a resource', async () => {
    // arrange
    renderPage();
    const warmUp = await resourceCard('Glute activation warm-up');

    // act
    await userEvent.click(warmUp);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    // assert
    expect(within(screen.getByRole('button', { name: 'Glute activation warm-up' })).queryByText('New')).not.toBeInTheDocument();
  });

  it('lets her read and download as usual when her opening is not recorded, and keeps the resource new', async () => {
    // arrange
    renderPage('&rmark=fails');
    await userEvent.click(await resourceCard('Glute activation warm-up'));
    const viewer = screen.getByRole('dialog', { name: 'Glute activation warm-up' });

    // act
    await userEvent.click(within(viewer).getByRole('button', { name: 'Next page' }));

    // assert
    expect(within(viewer).getByText('Page 2 of 6')).toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Download' })).toBeInTheDocument();

    // act
    await userEvent.click(within(viewer).getByRole('button', { name: 'Close' }));

    // assert
    await waitFor(
      () =>
        expect(
          within(screen.getByRole('button', { name: 'Glute activation warm-up' })).getByText('New'),
        ).toBeInTheDocument(),
      SERVICE_TIMEOUT,
    );
  });

  it('pages through a resource and announces each page', async () => {
    // arrange
    renderPage();
    await userEvent.click(await resourceCard('Glute activation warm-up'));
    const viewer = screen.getByRole('dialog', { name: 'Glute activation warm-up' });

    // act
    await userEvent.click(within(viewer).getByRole('button', { name: 'Next page' }));

    // assert
    expect(within(viewer).getByRole('img', { name: 'Glute activation warm-up, page 2' })).toBeInTheDocument();
    expect(within(viewer).getByText('Page 2 of 6')).toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(within(viewer).getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('hands focus to the other page control when the one she pressed stops at an end', async () => {
    // arrange
    renderPage();
    await userEvent.click(await resourceCard('Glute activation warm-up'));
    const viewer = screen.getByRole('dialog', { name: 'Glute activation warm-up' });
    const previousPage = within(viewer).getByRole('button', { name: 'Previous page' });
    const nextPage = within(viewer).getByRole('button', { name: 'Next page' });

    // act
    for (let turn = 1; turn < WARM_UP_PAGES; turn += 1) {
      await userEvent.click(nextPage);
    }

    // assert
    expect(nextPage).toBeDisabled();
    expect(previousPage).toHaveFocus();

    // act
    for (let turn = 1; turn < WARM_UP_PAGES; turn += 1) {
      await userEvent.keyboard('{Enter}');
    }

    // assert
    expect(previousPage).toBeDisabled();
    expect(nextPage).toHaveFocus();
  });

  it('turns pages with the arrow keys', async () => {
    // arrange
    renderPage();
    await userEvent.click(await resourceCard('Sleep and recovery basics'));
    const viewer = screen.getByRole('dialog', { name: 'Sleep and recovery basics' });

    // act
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');

    // assert
    expect(within(viewer).getByRole('img', { name: 'Sleep and recovery basics, page 2' })).toBeInTheDocument();
  });

  it('shows a single-page resource without paging controls', async () => {
    // arrange
    renderPage();

    // act
    await userEvent.click(await resourceCard('Hip thrust form checklist'));

    // assert
    const viewer = screen.getByRole('dialog', { name: 'Hip thrust form checklist' });
    expect(within(viewer).getByRole('img', { name: 'Hip thrust form checklist' })).toBeInTheDocument();
    expect(within(viewer).queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('offers a Word resource as a download with no pages to turn', async () => {
    // arrange
    renderPage();
    const mealIdeas = await resourceCard('Luteal phase meal ideas');

    // act
    await userEvent.click(mealIdeas);

    // assert
    const viewer = screen.getByRole('dialog', { name: 'Luteal phase meal ideas' });
    expect(mealIdeas).not.toHaveAccessibleDescription(/pages/);
    expect(within(viewer).getByText('luteal-phase-meal-ideas.docx')).toBeInTheDocument();
    expect(within(viewer).queryByRole('img')).not.toBeInTheDocument();
    expect(within(viewer).queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(within(viewer).queryByText('Pages')).not.toBeInTheDocument();
    expect(within(viewer).getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('returns focus to the card she opened', async () => {
    // arrange
    renderPage();
    const tracker = await resourceCard('Weekly macro tracker');
    await userEvent.click(tracker);

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(tracker).toHaveFocus());
  });

  it('says plainly when nothing has been shared yet', async () => {
    // arrange
    renderPage('&rseed=empty');

    // act
    const empty = await screen.findByText('Nothing here yet', {}, SERVICE_TIMEOUT);

    // assert
    expect(empty).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
