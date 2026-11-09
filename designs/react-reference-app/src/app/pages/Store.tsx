import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useStore, isPaid, STORE_PRODUCTS, PRODUCT_CATEGORIES, PRODUCT_GOALS, ProductCategory, ProductGoal, type Currency } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import { Filter, Euro, DollarSign, Plus, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { ChoiceGroup, ChoiceOption } from '../components/ChoiceGroup';
import { ProductTag } from '../components/ProductTag';
import { LegalFooter } from '../components/legal/LegalNav';
import { buttonVariants, cn } from '../components/ThemeButton';
import { cardVariants } from '../components/ui/card';
import { FreeTag } from '../components/FreeTag';

const CHIP_BASE_CLASS =
  'flex-none h-auto min-w-0 rounded-full first:rounded-l-full last:rounded-r-full border bg-card px-4 py-2 text-sm font-normal text-foreground transition-colors';

const TYPE_CHIP_CLASS = `${CHIP_BASE_CLASS} border-control-border-soft hover:bg-card data-[state=off]:hover:border-brand data-[state=off]:hover:text-brand data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:hover:bg-brand data-[state=on]:hover:text-brand-foreground`;

const GOAL_CHIP_CLASS = `${CHIP_BASE_CLASS} border-control-border-soft hover:bg-card data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground data-[state=on]:hover:bg-brand-secondary data-[state=on]:hover:text-brand-secondary-foreground`;

function useCancelledPaymentReturn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCartAfterCancelledPayment } = useStore();
  const returnedFromCancelledPayment = searchParams.get('payment') === 'cancelled';

  useEffect(() => {
    if (!returnedFromCancelledPayment) return;

    openCartAfterCancelledPayment();
    setSearchParams(
      (params) => {
        params.delete('payment');
        return params;
      },
      { replace: true },
    );
  }, [returnedFromCancelledPayment]);
}

export function Store() {
  const { addToCart, currency, setCurrency, formatPrice } = useStore();
  useCancelledPaymentReturn();
  const { appState } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedGoal, setSelectedGoal] = useState<ProductGoal | 'All'>('All');

  const categories: (ProductCategory | 'All')[] = ['All', ...PRODUCT_CATEGORIES];
  const goals: (ProductGoal | 'All')[] = ['All', ...PRODUCT_GOALS];

  const catalogProducts = appState.isStoreCatalogEmpty ? [] : STORE_PRODUCTS;
  const isCatalogEmpty = catalogProducts.length === 0;

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter(product => {
      const categoryMatch = selectedCategory === 'All' || product.categories.includes(selectedCategory);
      const goalMatch = selectedGoal === 'All' || product.goals.includes(selectedGoal);
      return categoryMatch && goalMatch;
    });
  }, [catalogProducts, selectedCategory, selectedGoal]);

  const paidProducts = filteredProducts.filter(isPaid);
  const freeProducts = filteredProducts.filter(p => !isPaid(p));

  return (
    <>
    <main className="w-full min-h-screen pb-24 bg-surface-page" data-parity-root="Store">
      <Navbar theme="dark" />

      <div className="max-w-7xl mx-auto px-6 pt-32">
        {/* Header & Currency Switcher */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 tracking-tight">
              Find the right plan
            </h1>
            <p className="text-lg text-copy-muted">
              Workout and nutrition plans, plus free guides to get you started.
            </p>
          </div>

          {!isCatalogEmpty && (
            <ChoiceGroup
              aria-label="Currency"
              look="pill"
              onValueChange={(value) => setCurrency(value as Currency)}
              value={currency}
            >
              <ChoiceOption value="EUR">
                <Euro size={16} aria-hidden="true" /> EUR
              </ChoiceOption>
              <ChoiceOption value="USD">
                <DollarSign size={16} aria-hidden="true" /> USD
              </ChoiceOption>
            </ChoiceGroup>
          )}
        </header>

        {isCatalogEmpty ? (
          <div className="flex flex-col items-center gap-4 text-center py-24">
            <ShoppingBag size={64} aria-hidden="true" className="text-icon-muted" />
            <h2 className="font-serif text-3xl text-foreground">The store is getting ready</h2>
            <p className="text-copy-muted max-w-md">
              New plans and guides are on the way. Check back soon.
            </p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-copy-muted uppercase tracking-wider">
                <Filter size={16} aria-hidden="true" /> Filters
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="w-12 shrink-0 text-xs font-semibold text-copy-muted uppercase tracking-wider">
                    Type
                  </span>
                  <ToggleGroup
                    type="single"
                    value={selectedCategory}
                    onValueChange={(value) => {
                      setSelectedCategory((value || 'All') as ProductCategory | 'All');
                    }}
                    aria-label="Filter by Type"
                    className="flex-wrap gap-2"
                  >
                    {categories.map(cat => (
                      <ToggleGroupItem
                        key={cat}
                        value={cat}
                        className={TYPE_CHIP_CLASS}
                        data-parity={cat === 'All' ? 'filter-type-all' : undefined}
                      >
                        {cat}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="w-12 shrink-0 text-xs font-semibold text-copy-muted uppercase tracking-wider">
                    Goal
                  </span>
                  <ToggleGroup
                    type="single"
                    value={selectedGoal}
                    onValueChange={(value) => {
                      setSelectedGoal((value || 'All') as ProductGoal | 'All');
                    }}
                    aria-label="Filter by Goal"
                    className="flex-wrap gap-2"
                  >
                    {goals.map(goal => (
                      <ToggleGroupItem
                        key={goal}
                        value={goal}
                        className={GOAL_CHIP_CLASS}
                        data-parity={goal === 'All' ? 'filter-goal-all' : undefined}
                      >
                        {goal}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>

            {/* Premium Plans Section */}
            {paidProducts.length > 0 && (
              <section className="mb-20">
                <h2 className="font-serif text-3xl text-foreground mb-8 pb-4 px-3 border-b border-control-border-soft">
                  Plans
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paidProducts.map(product => (
                    <motion.article
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={cn(cardVariants(), 'overflow-hidden hover:shadow-raised transition-shadow group flex flex-col h-full')}
                    >
                      <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div
                          className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-foreground"
                          data-parity="product-price"
                        >
                          {formatPrice(product)}
                        </div>
                      </Link>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {product.categories.map(c => (
                            <ProductTag key={c} size="sm" tone="paid">
                              {c}
                            </ProductTag>
                          ))}
                        </div>
                        <Link to={`/store/${product.id}`}>
                          <h3 className="font-serif text-xl font-medium text-foreground mb-2 group-hover:text-brand transition-colors line-clamp-2">
                            {product.title}
                          </h3>
                        </Link>
                        <p className="text-copy-muted text-sm mb-6 flex-grow line-clamp-2">
                          {product.description}
                        </p>
                        <button
                          aria-label={`Add ${product.title} to cart`}
                          onClick={() => addToCart(product)}
                          className={buttonVariants({ size: 'lg', variant: 'inverted', width: 'full' })}
                        >
                          <ShoppingBag size={18} aria-hidden="true" /> Add to Cart
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            )}

            {/* Free Resources Section */}
            {freeProducts.length > 0 && (
              <section>
                <h2 className="font-serif text-3xl text-foreground mb-8 pb-4 px-3 border-b border-control-border-soft">
                  Free resources
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {freeProducts.map(product => (
                    <motion.article
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={cn(cardVariants(), 'overflow-hidden hover:shadow-raised transition-shadow group flex flex-col h-full')}
                    >
                      <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <FreeTag className="absolute top-4 right-4" />
                      </Link>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {product.categories.map(c => (
                            <ProductTag key={c} size="sm" tone="free">
                              {c}
                            </ProductTag>
                          ))}
                        </div>
                        <Link to={`/store/${product.id}`}>
                          <h3 className="font-serif text-xl font-medium text-foreground mb-2 group-hover:text-brand-secondary transition-colors line-clamp-2">
                            {product.title}
                          </h3>
                        </Link>
                        <p className="text-copy-muted text-sm mb-6 flex-grow line-clamp-2">
                          {product.description}
                        </p>
                        <button
                          aria-label={`Get ${product.title} for free`}
                          onClick={() => addToCart(product)}
                          className={buttonVariants({ size: 'lg', variant: 'outline', width: 'full' })}
                        >
                          <Plus size={18} aria-hidden="true" /> Get for free
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-copy-muted font-medium">No products found matching your filters.</p>
                <button
                  onClick={() => { setSelectedCategory('All'); setSelectedGoal('All'); }}
                  className="mt-6 text-brand font-medium hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
    <LegalFooter />
    </>
  );
}
