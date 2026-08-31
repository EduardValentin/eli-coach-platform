import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Library } from './Library';
import { AppProvider } from '../context/AppContext';
import { StoreProvider, STORE_PRODUCTS } from '../context/StoreContext';
import {
  LibraryError,
  LIBRARY_ERROR_MESSAGES,
} from '../services/libraryService';

const fetchOwnedProducts = vi.hoisted(() => vi.fn());
const issueFreshDownloadAccess = vi.hoisted(() => vi.fn());

vi.mock('../services/libraryService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../services/libraryService')>();

  return {
    ...actual,
    fetchOwnedProducts,
    issueFreshDownloadAccess,
  };
});

const ownedPaidPlan = STORE_PRODUCTS.find((p) => p.id === 'fat-loss-30')!;
const ownedFreeEbook = STORE_PRODUCTS.find(
  (p) => p.id === 'hormone-harmony-ebook',
)!;

function renderLibrary() {
  window.history.replaceState({}, '', '/library?session=user');

  return render(
    <MemoryRouter initialEntries={['/library']}>
      <AppProvider>
        <StoreProvider>
          <Library />
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

// jsdom ships no object-URL support, so the placeholder-download seam is
// defined here rather than spied upon.
const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

describe('Library', () => {
  beforeEach(() => {
    fetchOwnedProducts.mockReset();
    issueFreshDownloadAccess.mockReset();
    createObjectURL.mockReset();
    createObjectURL.mockReturnValue('blob:placeholder');
    revokeObjectURL.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
  });

  it('shows a loading state while owned products are being fetched', () => {
    // arrange
    fetchOwnedProducts.mockReturnValue(new Promise(() => {}));

    // act
    renderLibrary();

    // assert
    expect(screen.getByRole('status')).toHaveTextContent(/loading your library/i);
  });

  it('lists owned products with their free or purchased distinction', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan, ownedFreeEbook]);

    // act
    renderLibrary();

    // assert
    const paidRow = (
      await screen.findByRole('heading', { name: ownedPaidPlan.title })
    ).closest('li')!;
    const freeRow = screen
      .getByRole('heading', { name: ownedFreeEbook.title })
      .closest('li')!;
    expect(within(paidRow).getByText('Purchased')).toBeInTheDocument();
    expect(within(freeRow).getByText('Free')).toBeInTheDocument();
    expect(
      within(paidRow).getByRole('button', {
        name: new RegExp(`download ${ownedPaidPlan.title}`, 'i'),
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ['empty', () => fetchOwnedProducts.mockResolvedValue([])],
    [
      'failed',
      () =>
        fetchOwnedProducts.mockRejectedValue(
          new LibraryError('LOAD_FAILURE', LIBRARY_ERROR_MESSAGES.LOAD_FAILURE),
        ),
    ],
  ] as const)(
    'drops the owned-products subtitle when the Library is %s',
    async (_state, arrangeFetch) => {
      // arrange
      arrangeFetch();

      // act
      renderLibrary();
      await screen.findByRole('heading', { level: 2 });

      // assert
      expect(screen.queryByText(/every product you own/i)).not.toBeInTheDocument();
    },
  );

  it('keeps the owned-products subtitle when products are listed', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan]);

    // act
    renderLibrary();
    await screen.findByRole('heading', { name: ownedPaidPlan.title });

    // assert
    expect(screen.getByText(/every product you own/i)).toBeInTheDocument();
  });

  it('shows the empty state with a path back to the store when nothing is owned', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([]);

    // act
    renderLibrary();

    // assert
    expect(
      await screen.findByText(/nothing in your library yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse the store/i })).toHaveAttribute(
      'href',
      '/store',
    );
  });

  it('shows the load failure and recovers through retry', async () => {
    // arrange
    fetchOwnedProducts
      .mockRejectedValueOnce(
        new LibraryError('LOAD_FAILURE', LIBRARY_ERROR_MESSAGES.LOAD_FAILURE),
      )
      .mockResolvedValueOnce([ownedPaidPlan]);
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByText(LIBRARY_ERROR_MESSAGES.LOAD_FAILURE);

    // act
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // assert
    expect(
      await screen.findByRole('heading', { name: ownedPaidPlan.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(LIBRARY_ERROR_MESSAGES.LOAD_FAILURE),
    ).not.toBeInTheDocument();
  });

  it('issues fresh download access and delivers the placeholder file', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan]);
    issueFreshDownloadAccess.mockResolvedValue({ productId: ownedPaidPlan.id });
    const user = userEvent.setup();
    renderLibrary();
    const downloadButton = await screen.findByRole('button', {
      name: new RegExp(`download ${ownedPaidPlan.title}`, 'i'),
    });

    // act
    await user.click(downloadButton);

    // assert
    expect(issueFreshDownloadAccess).toHaveBeenCalledWith(
      ownedPaidPlan.id,
      'success',
    );
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('keeps concurrent row downloads independent of each other', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan, ownedFreeEbook]);
    const resolvers: Array<() => void> = [];
    issueFreshDownloadAccess.mockImplementation(
      (productId: string) =>
        new Promise((resolve) => {
          resolvers.push(() => resolve({ productId }));
        }),
    );
    const user = userEvent.setup();
    renderLibrary();
    const paidButton = await screen.findByRole('button', {
      name: new RegExp(`download ${ownedPaidPlan.title}`, 'i'),
    });
    const freeButton = screen.getByRole('button', {
      name: new RegExp(`download ${ownedFreeEbook.title}`, 'i'),
    });

    // act
    await user.click(paidButton);
    await user.click(freeButton);

    // assert: both rows stay busy while both requests are in flight
    expect(paidButton).toHaveAttribute('aria-busy', 'true');
    expect(freeButton).toHaveAttribute('aria-busy', 'true');

    // act: the first request settles while the second is still pending
    resolvers[0]();

    // assert: only the settled row goes idle
    await waitFor(() => expect(paidButton).toHaveAttribute('aria-busy', 'false'));
    expect(freeButton).toHaveAttribute('aria-busy', 'true');

    // act
    resolvers[1]();

    // assert
    await waitFor(() => expect(freeButton).toHaveAttribute('aria-busy', 'false'));
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('keeps a row failure visible while another row downloads', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan, ownedFreeEbook]);
    issueFreshDownloadAccess.mockImplementation((productId: string) =>
      productId === ownedPaidPlan.id
        ? Promise.reject(
            new LibraryError(
              'DOWNLOAD_FAILURE',
              LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE,
            ),
          )
        : Promise.resolve({ productId }),
    );
    const user = userEvent.setup();
    renderLibrary();
    const paidButton = await screen.findByRole('button', {
      name: new RegExp(`download ${ownedPaidPlan.title}`, 'i'),
    });
    await user.click(paidButton);
    await screen.findByText(LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE);

    // act
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`download ${ownedFreeEbook.title}`, 'i'),
      }),
    );

    // assert
    expect(
      await screen.findByText(LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE),
    ).toBeInTheDocument();
  });

  it('shows a row-level failure when download access cannot be issued', async () => {
    // arrange
    fetchOwnedProducts.mockResolvedValue([ownedPaidPlan]);
    issueFreshDownloadAccess.mockRejectedValue(
      new LibraryError(
        'DOWNLOAD_FAILURE',
        LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE,
      ),
    );
    const user = userEvent.setup();
    renderLibrary();
    const downloadButton = await screen.findByRole('button', {
      name: new RegExp(`download ${ownedPaidPlan.title}`, 'i'),
    });

    // act
    await user.click(downloadButton);

    // assert
    expect(
      await screen.findByText(LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE),
    ).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
