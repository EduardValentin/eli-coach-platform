import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOwnedProducts,
  issueFreshDownloadAccess,
  LibraryError,
  LIBRARY_ERROR_MESSAGES,
} from './libraryService';
import { STORE_PRODUCTS } from '../context/StoreContext';

describe('fetchOwnedProducts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with paid and free owned products when the mocked outcome is populated', async () => {
    // arrange
    const request = fetchOwnedProducts('populated');

    // act
    await vi.advanceTimersByTimeAsync(1200);
    const owned = await request;

    // assert
    expect(owned.length).toBeGreaterThan(0);
    expect(owned.some((product) => product.type === 'paid')).toBe(true);
    expect(owned.some((product) => product.type === 'free')).toBe(true);
    for (const product of owned) {
      expect(STORE_PRODUCTS).toContain(product);
    }
  });

  it('resolves with no products when the mocked outcome is empty', async () => {
    // arrange
    const request = fetchOwnedProducts('empty');

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(request).resolves.toEqual([]);
  });

  it('rejects with the load failure message when the mocked outcome is server-error', async () => {
    // arrange
    const request = fetchOwnedProducts('server-error');
    request.catch(() => {});

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(request).rejects.toBeInstanceOf(LibraryError);
    await expect(request).rejects.toMatchObject({
      code: 'LOAD_FAILURE',
      message: LIBRARY_ERROR_MESSAGES.LOAD_FAILURE,
    });
  });
});

describe('issueFreshDownloadAccess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves for the requested product when the mocked outcome is success', async () => {
    // arrange
    const request = issueFreshDownloadAccess('fat-loss-30', 'success');

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(request).resolves.toEqual({ productId: 'fat-loss-30' });
  });

  it('rejects with the download failure message when the mocked outcome is server-error', async () => {
    // arrange
    const request = issueFreshDownloadAccess('fat-loss-30', 'server-error');
    request.catch(() => {});

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(request).rejects.toBeInstanceOf(LibraryError);
    await expect(request).rejects.toMatchObject({
      code: 'DOWNLOAD_FAILURE',
      message: LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE,
    });
  });
});
