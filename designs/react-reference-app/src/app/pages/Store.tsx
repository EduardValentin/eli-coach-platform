import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useStore, STORE_PRODUCTS, ProductCategory, ProductGoal } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import { Filter, Euro, DollarSign, Plus, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';

const CHIP_BASE_CLASS =
  'flex-none h-auto min-w-0 rounded-full first:rounded-l-full last:rounded-r-full border bg-card px-4 py-2 text-sm font-normal text-foreground transition-colors';

const TYPE_CHIP_CLASS = `${CHIP_BASE_CLASS} border-control-border-soft hover:bg-card data-[state=off]:hover:border-brand data-[state=off]:hover:text-brand data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:hover:bg-brand data-[state=on]:hover:text-brand-foreground`;

const GOAL_CHIP_CLASS = `${CHIP_BASE_CLASS} border-control-border-soft hover:bg-card data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground data-[state=on]:hover:bg-brand-secondary data-[state=on]:hover:text-brand-secondary-foreground`;

const CURRENCY_ITEM_CLASS =
  'flex-none h-auto min-w-0 rounded-full first:rounded-l-full last:rounded-r-full px-4 py-2 text-sm font-medium text-copy-muted transition-colors hover:bg-card data-[state=off]:hover:text-foreground data-[state=on]:bg-surface-inverted data-[state=on]:text-surface-inverted-foreground data-[state=on]:hover:bg-surface-inverted data-[state=on]:hover:text-surface-inverted-foreground';

export function Store() {
  const { addToCart, currency, setCurrency, formatPrice } = useStore();
  const { appState } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedGoal, setSelectedGoal] = useState<ProductGoal | 'All'>('All');

  const categories: (ProductCategory | 'All')[] = ['All', 'Workouts', 'Nutrition Plans', 'E-Books'];
  const goals: (ProductGoal | 'All')[] = ['All', 'Muscle Building', 'Fat Loss', 'Wellness', 'Hormonal Balance'];

  const catalogProducts = appState.isStoreCatalogEmpty ? [] : STORE_PRODUCTS;
  const isCatalogEmpty = catalogProducts.length === 0;

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter(product => {
      const categoryMatch = selectedCategory === 'All' || product.categories.includes(selectedCategory);
      const goalMatch = selectedGoal === 'All' || product.goals.includes(selectedGoal);
      return categoryMatch && goalMatch;
    });
  }, [catalogProducts, selectedCategory, selectedGoal]);

  const paidProducts = filteredProducts.filter(p => p.type === 'paid');
  const freeProducts = filteredProducts.filter(p => p.type === 'free');

  return (
    <main className="w-full min-h-screen pb-24 bg-surface-page">
      <Navbar theme="dark" />

      <div className="max-w-7xl mx-auto px-6 pt-32">
        {/* Header & Currency Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 tracking-tight">
              Train with your body, not against it.
            </h1>
            <p className="text-lg text-copy-muted">
              Workout and nutrition plans, plus free guides to get you started.
            </p>
          </div>

          {!isCatalogEmpty && (
            <ToggleGroup
              type="single"
              value={currency}
              onValueChange={(value) => {
                if (value) setCurrency(value as typeof currency);
              }}
              aria-label="Currency"
              className="gap-2 bg-card rounded-full p-1 shadow-sm border border-control-border-soft"
            >
              <ToggleGroupItem value="USD" className={CURRENCY_ITEM_CLASS}>
                <DollarSign size={16} aria-hidden="true" /> USD
              </ToggleGroupItem>
              <ToggleGroupItem value="EUR" className={CURRENCY_ITEM_CLASS}>
                <Euro size={16} aria-hidden="true" /> EUR
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        {isCatalogEmpty ? (
          <div className="flex flex-col items-center gap-4 text-center py-24">
            <ShoppingBag size={64} aria-hidden="true" className="text-placeholder-soft" />
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
                      <ToggleGroupItem key={cat} value={cat} className={TYPE_CHIP_CLASS}>
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
                      <ToggleGroupItem key={goal} value={goal} className={GOAL_CHIP_CLASS}>
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
                <h2 className="font-serif text-3xl text-foreground mb-8 pb-4 border-b border-control-border-soft">
                  Plans
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paidProducts.map(product => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-card rounded-2xl overflow-hidden border border-stroke-faint shadow-sm hover:shadow-xl transition-shadow group flex flex-col h-full"
                    >
                      <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-foreground">
                          {formatPrice(product.priceUSD)}
                        </div>
                      </Link>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {product.categories.map(c => (
                            <span key={c} className="text-[10px] uppercase tracking-wider font-bold text-brand bg-brand-soft px-2 py-1 rounded-sm">
                              {c}
                            </span>
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
                          onClick={() => addToCart(product)}
                          className="w-full py-3.5 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-brand transition-colors"
                        >
                          <ShoppingBag size={18} aria-hidden="true" /> Add to Cart
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Free Resources Section */}
            {freeProducts.length > 0 && (
              <section>
                <h2 className="font-serif text-3xl text-foreground mb-8 pb-4 border-b border-control-border-soft">
                  Free Resources
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {freeProducts.map(product => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-card rounded-2xl overflow-hidden border border-stroke-faint shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full"
                    >
                      <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-4 right-4 bg-brand-secondary text-brand-secondary-foreground px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                          Free
                        </div>
                      </Link>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {product.categories.map(c => (
                            <span key={c} className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary bg-brand-secondary-soft px-2 py-1 rounded-sm">
                              {c}
                            </span>
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
                          onClick={() => addToCart(product)}
                          className="w-full py-3.5 border-2 border-surface-inverted text-foreground font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-surface-inverted hover:text-surface-inverted-foreground transition-colors"
                        >
                          <Plus size={18} aria-hidden="true" /> Get for Free
                        </button>
                      </div>
                    </motion.div>
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
  );
}
