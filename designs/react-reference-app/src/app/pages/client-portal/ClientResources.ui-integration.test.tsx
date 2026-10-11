import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
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

function LocationProbe() {
  const { search } = useLocation();

  return <p data-testid="location-probe">{search}</p>;
}

function renderPageAt(search: string) {
  const url = `/portal/resources${search}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <ResourceProvider>
            <ClientResources />
            <LocationProbe />
          </ResourceProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderPage(devParams = '') {
  renderPageAt(`?session=client${devParams}`);
}

function currentAddress(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

async function resourceCard(title: string): Promise<HTMLElement> {
  return screen.findByRole('button', { name: title }, SERVICE_TIMEOUT);
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

async function chooseTag(tag: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Tag' }));
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(`^${tag}`) }));
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

  it('writes her tag to the address at once and her search once she pauses typing', async () => {
    // arrange
    renderPage();
    await resourceCard('Plate portions guide');
    await chooseTag('Nutrition');
    const afterTag = currentAddress();

    // act
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'meal');
    const whileTyping = currentAddress();

    // assert
    expect(afterTag).toBe('?session=client&tag=Nutrition');
    expect(whileTyping).toBe('?session=client&tag=Nutrition');
    await waitFor(() => expect(currentAddress()).toBe('?session=client&tag=Nutrition&q=meal'));
    expect(shownTitles()).toEqual(['Luteal phase meal ideas']);
  });

  it('keeps her tag and search when the page opens again at the same address', async () => {
    // arrange
    renderPage();
    await resourceCard('Plate portions guide');
    await chooseTag('Nutrition');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'te');
    await waitFor(() => expect(currentAddress()).toContain('q=te'));
    const address = currentAddress();
    cleanup();

    // act
    renderPageAt(address);
    await resourceCard('Plate portions guide');

    // assert
    expect(shownTitles()).toEqual(['Plate portions guide', 'Luteal phase meal ideas']);
    expect(screen.getByRole('searchbox', { name: 'Search resources' })).toHaveValue('te');
    expect(screen.getByRole('combobox', { name: 'Tag' })).toHaveTextContent('Nutrition');
    expect(screen.queryByRole('combobox', { name: 'Sort by' })).not.toBeInTheDocument();
  });

  it('counts “All tags” and each tag over the resources her search matches', async () => {
    // arrange
    renderPage();
    await resourceCard('Plate portions guide');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'meal');
    await waitFor(() => expect(currentAddress()).toContain('q=meal'));

    // act
    await userEvent.click(screen.getByRole('combobox', { name: 'Tag' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All tags 1',
      'Cycle 1',
      'Form 0',
      'Glutes 0',
      'Habits 0',
      'Nutrition 1',
      'Recovery 0',
      'Sleep 0',
      'Tracking 0',
      'Training 0',
    ]);
  });

  it('shows every resource under “All tags” when the address names a tag none of hers holds', async () => {
    // arrange
    renderPage('&tag=Mobility');

    // act
    await resourceCard('Plate portions guide');

    // assert
    expect(screen.getByRole('combobox', { name: 'Tag' })).toHaveTextContent('All tags');
    expect(shownTitles()).toHaveLength(6);
    expect(currentAddress()).toBe('?session=client&tag=Mobility');
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
