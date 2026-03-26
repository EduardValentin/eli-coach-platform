import { useParams, Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useStore, STORE_PRODUCTS } from '../context/StoreContext';
import { ArrowLeft, CheckCircle2, ShoppingBag, Download } from 'lucide-react';
import { motion } from 'motion/react';

export function ProductDetails() {
  const { productId } = useParams<{ productId: string }>();
  const { addToCart, formatPrice } = useStore();
  
  const product = STORE_PRODUCTS.find(p => p.id === productId);

  if (!product) {
    return (
      <main className="w-full min-h-screen bg-[#FAFAFA] pt-32 px-6 text-center">
        <Navbar theme="dark" />
        <h1 className="text-3xl font-serif text-[#121212] mb-4">Product Not Found</h1>
        <p className="text-neutral-600 mb-8">The product you're looking for doesn't exist.</p>
        <Link to="/store" className="text-[#C81D6B] font-medium hover:underline inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Store
        </Link>
      </main>
    );
  }

  const isFree = product.priceUSD === 0;

  return (
    <main className="w-full min-h-screen pb-24 bg-[#FAFAFA]">
      <Navbar theme="dark" />
      
      <div className="max-w-6xl mx-auto px-6 pt-32">
        <Link to="/store" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-[#C81D6B] transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Store
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl overflow-hidden aspect-[4/5] sm:aspect-square lg:aspect-[4/5] bg-neutral-100 shadow-md"
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
                <span key={c} className={`text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-sm ${isFree ? 'text-[#00796B] bg-[#00796B]/10' : 'text-[#C81D6B] bg-[#C81D6B]/10'}`}>
                  {c}
                </span>
              ))}
              {product.goals.map(g => (
                <span key={g} className="text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-sm text-neutral-600 bg-neutral-200/50">
                  {g}
                </span>
              ))}
            </div>
            
            <h1 className="font-serif text-4xl lg:text-5xl text-[#121212] mb-6 tracking-tight leading-tight">
              {product.title}
            </h1>
            
            <p className="text-[#121212] font-semibold text-3xl tracking-tight mb-8">
              {formatPrice(product.priceUSD)}
            </p>
            
            <div className="w-16 h-1 bg-neutral-200 mb-8" />
            
            <p className="text-lg text-neutral-700 leading-relaxed mb-10">
              {product.longDescription}
            </p>
            
            <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm mb-10">
              <h3 className="font-semibold text-[#121212] text-sm uppercase tracking-wider mb-4">What's included:</h3>
              <ul className="space-y-4">
                {product.includes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-neutral-700">
                    <CheckCircle2 size={20} className={isFree ? "text-[#00796B] shrink-0 mt-0.5" : "text-[#C81D6B] shrink-0 mt-0.5"} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={() => addToCart(product)}
              className={`w-full py-4 text-lg font-medium rounded-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${
                isFree 
                  ? 'bg-[#00796B] text-white hover:bg-[#005a4f]' 
                  : 'bg-[#C81D6B] text-white hover:bg-[#a31556]'
              }`}
            >
              {isFree ? (
                <><Download size={22} /> Get it for Free</>
              ) : (
                <><ShoppingBag size={22} /> Add to Cart</>
              )}
            </button>
            
            <p className="text-sm text-neutral-500 text-center mt-6">
              Instant digital download. Secure checkout.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}