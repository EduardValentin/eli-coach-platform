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
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [failedDownloadProductId, setFailedDownloadProductId] = useState<string | null>(null);
  // The fetch outlives navigation away from the page; a stale completion must
  // not then update state on an unmounted component.
  const isMounted = useRef(true);
  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  const loadOwnedProducts = useCallback(async () => {
    setPhase('loading');
    try {
      const owned = await fetchOwnedProducts(appState.libraryOutcome);
      if (!isMounted.current) return;
      setOwnedProducts(owned);
      setPhase('loaded');
    } catch {
      if (!isMounted.current) return;
      setPhase('load-failed');
    }
  }, [appState.libraryOutcome]);

  useEffect(() => {
    void loadOwnedProducts();
  }, [loadOwnedProducts]);

  const downloadProduct = async (product: Product) => {
    setDownloadingProductId(product.id);
    setFailedDownloadProductId(null);
    try {
      await issueFreshDownloadAccess(product.id, appState.libraryDownloadOutcome);
      if (!isMounted.current) return;
      downloadPlaceholderFile(product);
    } catch {
      if (!isMounted.current) return;
      setFailedDownloadProductId(product.id);
    } finally {
      if (isMounted.current) setDownloadingProductId(null);
    }
  };

  return (
    <>
    <main className="w-full min-h-screen pb-24 bg-surface-page">
      <Navbar theme="dark" />

      <div className="max-w-3xl mx-auto px-6 pt-32">
        <div className="py-8">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4 tracking-tight">
            Your Library
          </h1>
          <p className="text-lg text-copy-muted mb-10">
            Every product you own, ready to download again whenever you need it.
          </p>

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
            <div className="flex flex-col items-center gap-4 text-center py-16">
              <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-2">
                <RefreshCw size={36} aria-hidden="true" />
              </div>
              <p className="text-lg text-foreground max-w-md leading-relaxed">
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
            <div className="flex flex-col items-center gap-4 text-center py-16">
              <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-2">
                <BookOpen size={36} aria-hidden="true" />
              </div>
              <h2 className="font-serif text-3xl text-foreground tracking-tight">
                Nothing in your Library yet
              </h2>
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
                const isDownloading = downloadingProductId === product.id;
                const hasDownloadFailed = failedDownloadProductId === product.id;
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
