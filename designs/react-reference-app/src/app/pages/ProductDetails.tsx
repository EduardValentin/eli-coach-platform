import { useParams, Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useStore, STORE_PRODUCTS } from '../context/StoreContext';
import { ArrowLeft, CheckCircle2, ShoppingBag, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../components/ui/utils';
import { Card, CardContent } from '../components/ui/card';

export function ProductDetails() {
  const { productId } = useParams<{ productId: string }>();
  const { addToCart, formatPrice } = useStore();

  const product = STORE_PRODUCTS.find(p => p.id === productId);

  if (!product) {
    return (
      <main className="w-full min-h-screen bg-surface-page pt-32 px-6 text-center">
        <Navbar theme="dark" />
        <h1 className="text-3xl font-serif text-foreground mb-4">Product Not Found</h1>
        <p className="text-copy-muted mb-8">The product you're looking for doesn't exist.</p>
        <Link to="/store" className="text-brand font-medium hover:underline inline-flex items-center gap-2">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Store
        </Link>
      </main>
    );
  }

  const isFree = product.priceUSD === 0;

  return (
    <main className="w-full min-h-screen pb-24 bg-surface-page">
      <Navbar theme="dark" />

      <div className="max-w-6xl mx-auto px-6 pt-32">
        <Link to="/store" className="inline-flex items-center gap-2 text-sm font-medium text-copy-muted hover:text-brand transition-colors mb-12 group">
          <ArrowLeft size={16} aria-hidden="true" className="group-hover:-translate-x-1 transition-transform" /> Back to Store
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl overflow-hidden aspect-[4/5] sm:aspect-square lg:aspect-[4/5] bg-surface-subtle shadow-md"
          >
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <div className="flex gap-2 mb-6 flex-wrap">
              {product.categories.map(c => (
                <span
                  key={c}
                  className={cn('text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-sm', {
                    'text-brand-secondary bg-brand-secondary-soft': isFree,
                    'text-brand bg-brand-soft': !isFree,
                  })}
                >
                  {c}
                </span>
              ))}
              {product.goals.map(g => (
                <span key={g} className="text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-sm text-copy-muted bg-surface-subtle">
                  {g}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-4xl lg:text-5xl text-foreground mb-6 tracking-tight leading-tight">
              {product.title}
            </h1>

            <p className="text-foreground font-semibold text-3xl tracking-tight mb-8">
              {formatPrice(product.priceUSD)}
            </p>

            <div className="w-16 h-1 bg-control-border-soft mb-8" />

            <p className="text-lg text-copy-muted leading-relaxed mb-10">
              {product.longDescription}
            </p>

            <Card className="border-stroke-faint shadow-sm mb-10">
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4">What's included:</h2>
                <ul className="space-y-4">
                {product.includes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-copy-muted">
                    <CheckCircle2
                      size={20}
                      aria-hidden="true"
                      className={cn('shrink-0 mt-0.5', {
                        'text-brand-secondary': isFree,
                        'text-brand': !isFree,
                      })}
                    />
                    <span>{item}</span>
                  </li>
                ))}
                </ul>
              </CardContent>
            </Card>

            <button
              onClick={() => addToCart(product)}
              className={cn(
                'w-full py-4 text-lg font-medium rounded-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg',
                {
                  'bg-brand-secondary text-brand-secondary-foreground hover:bg-brand-secondary-hover': isFree,
                  'bg-brand text-brand-foreground hover:bg-brand-hover': !isFree,
                },
              )}
            >
              {isFree ? (
                <><Download size={22} aria-hidden="true" /> Get it for Free</>
              ) : (
                <><ShoppingBag size={22} aria-hidden="true" /> Add to Cart</>
              )}
            </button>

            <p className="text-sm text-copy-muted text-center mt-6">
              Instant digital download. Secure checkout.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
