import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Download, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LegalFooter } from '../components/legal/LegalNav';
import { Skeleton } from '../components/ui/skeleton';
import { useAppState } from '../context/AppContext';
import type { Product } from '../context/StoreContext';
import {
  fetchOwnedProducts,
  issueFreshDownloadAccess,
  LIBRARY_ERROR_MESSAGES,
} from '../services/libraryService';

type LibraryPhase = 'loading' | 'loaded' | 'load-failed';

// The empty and failed states stand in for the product list, so they sit in the
// same card the products would have filled rather than loose on the page.
const STATE_CARD_CLASS =
  'flex flex-col items-center gap-4 text-center px-6 py-16 bg-card rounded-2xl border border-stroke-faint shadow-sm';

function downloadPlaceholderFile(product: Product) {
  const blob = new Blob(
    [`Evoa Fitness — placeholder for "${product.title}".`],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `evoa-fitness-${product.id}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function Library() {
  const { appState } = useAppState();
  const [phase, setPhase] = useState<LibraryPhase>('loading');
  const [ownedProducts, setOwnedProducts] = useState<Product[]>([]);
  // Every row's download runs independently, so busy and failed state is keyed
  // by product rather than held as one "current download" that rows would
  // overwrite for each other.
  const [downloadingProductIds, setDownloadingProductIds] = useState<ReadonlySet<string>>(new Set());
  const [failedDownloadProductIds, setFailedDownloadProductIds] = useState<ReadonlySet<string>>(new Set());
  // The requests outlive navigation away from the page; a stale completion
  // must not then update state on an unmounted component.
  const isMounted = useRef(true);
  useEffect(() => () => {
    isMounted.current = false;
  }, []);
  // A reload can start while an earlier fetch is still pending (retry, or the
  // dev outcome changing); only the most recent request may settle the page.
  const loadRequestId = useRef(0);

  const loadOwnedProducts = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setPhase('loading');
    try {
      const owned = await fetchOwnedProducts(appState.libraryOutcome);
      if (!isMounted.current || requestId !== loadRequestId.current) return;
      setOwnedProducts(owned);
      setPhase('loaded');
    } catch {
      if (!isMounted.current || requestId !== loadRequestId.current) return;
      setPhase('load-failed');
    }
  }, [appState.libraryOutcome]);

  useEffect(() => {
    void loadOwnedProducts();
  }, [loadOwnedProducts]);

  const downloadProduct = async (product: Product) => {
    setDownloadingProductIds((prev) => new Set(prev).add(product.id));
    setFailedDownloadProductIds((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
    try {
      await issueFreshDownloadAccess(product.id, appState.libraryDownloadOutcome);
      if (!isMounted.current) return;
      downloadPlaceholderFile(product);
    } catch {
      if (!isMounted.current) return;
      setFailedDownloadProductIds((prev) => new Set(prev).add(product.id));
    } finally {
      if (isMounted.current) {
        setDownloadingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }
    }
  };

  const hasOwnedProducts = phase === 'loaded' && ownedProducts.length > 0;
  // The empty and failed states each state their own case and take the page
  // heading with it, so the library header would only say it a second time.
  // Loading keeps the header because the outcome isn't known yet.
  const showsLibraryHeader = phase === 'loading' || hasOwnedProducts;

  return (
    <>
    <main className="w-full min-h-screen pb-24 bg-surface-page">
      <Navbar theme="dark" />

      <div className="max-w-3xl mx-auto px-6 pt-32">
        <div className="py-8">
          {showsLibraryHeader && (
            <>
              <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4 tracking-tight">
                Your Library
              </h1>
              <p className="text-lg text-copy-muted mb-10">
                Every product you own, ready to download again whenever you need it.
              </p>
            </>
          )}

          {phase === 'loading' && (
            <div>
              <p role="status" className="sr-only">
                Loading your Library
              </p>
              <ul aria-hidden="true" className="space-y-4">
                {[0, 1, 2].map((row) => (
                  <li
                    key={row}
                    className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-stroke-faint shadow-sm"
                  >
                    <Skeleton className="w-16 h-16 shrink-0 rounded-lg" />
                    <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase === 'load-failed' && (
            <div
              role="alert"
              className={STATE_CARD_CLASS}
            >
              <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-2">
                <RefreshCw size={36} aria-hidden="true" />
              </div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
                We couldn't load your Library
              </h1>
              <p className="text-copy-muted max-w-md leading-relaxed">
                {LIBRARY_ERROR_MESSAGES.LOAD_FAILURE}
              </p>
              <button
                onClick={() => void loadOwnedProducts()}
                className="mt-6 px-8 py-4 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm inline-flex items-center justify-center gap-2 hover:bg-brand transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {phase === 'loaded' && ownedProducts.length === 0 && (
            <div className={STATE_CARD_CLASS}>
              <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-2">
                <BookOpen size={36} aria-hidden="true" />
              </div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
                Nothing in your Library yet
              </h1>
              <p className="text-copy-muted max-w-md leading-relaxed">
                Products you purchase or request appear here, ready to download
                whenever you need them.
              </p>
              <Link
                to="/store"
                className="mt-6 px-8 py-4 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm inline-flex items-center justify-center gap-2 hover:bg-brand transition-colors"
              >
                Browse the Store
              </Link>
            </div>
          )}

          {phase === 'loaded' && ownedProducts.length > 0 && (
            <ul className="space-y-4">
              {ownedProducts.map((product) => {
                const isDownloading = downloadingProductIds.has(product.id);
                const hasDownloadFailed = failedDownloadProductIds.has(product.id);
                return (
                  <li
                    key={product.id}
                    className="p-5 bg-card rounded-2xl border border-stroke-faint shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="w-16 h-16 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="font-serif text-xl font-medium text-foreground">
                            {product.title}
                          </h2>
                          {product.type === 'free' ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary bg-brand-secondary-soft px-2 py-1 rounded-sm">
                              Free
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-brand bg-brand-soft px-2 py-1 rounded-sm">
                              Purchased
                            </span>
                          )}
                        </div>
                        <p className="text-xs uppercase tracking-wider text-copy-muted">
                          {product.categories.join(' · ')}
                        </p>
                      </div>
                      <button
                        onClick={() => void downloadProduct(product)}
                        disabled={isDownloading}
                        aria-busy={isDownloading}
                        aria-label={`Download ${product.title}`}
                        className="shrink-0 px-5 py-3 bg-brand text-brand-foreground font-medium rounded-sm inline-flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors disabled:opacity-60"
                      >
                        <Download size={18} aria-hidden="true" />
                        {isDownloading ? 'Preparing…' : 'Download'}
                      </button>
                    </div>
                    {hasDownloadFailed && (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        {LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
    <LegalFooter />
    </>
  );
}
