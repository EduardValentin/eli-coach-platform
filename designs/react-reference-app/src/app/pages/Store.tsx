import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useStore, STORE_PRODUCTS, ProductCategory, ProductGoal } from '../context/StoreContext';
import { Filter, Euro, DollarSign, Download, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

export function Store() {
  const { addToCart, currency, setCurrency, formatPrice } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedGoal, setSelectedGoal] = useState<ProductGoal | 'All'>('All');

  const categories: (ProductCategory | 'All')[] = ['All', 'Workouts', 'Nutrition Plans', 'E-Books'];
  const goals: (ProductGoal | 'All')[] = ['All', 'Muscle Building', 'Fat Loss', 'Wellness', 'Hormonal Balance'];

  const filteredProducts = useMemo(() => {
    return STORE_PRODUCTS.filter(product => {
      const categoryMatch = selectedCategory === 'All' || product.categories.includes(selectedCategory);
      const goalMatch = selectedGoal === 'All' || product.goals.includes(selectedGoal);
      return categoryMatch && goalMatch;
    });
  }, [selectedCategory, selectedGoal]);

  const paidProducts = filteredProducts.filter(p => p.type === 'paid');
  const freeProducts = filteredProducts.filter(p => p.type === 'free');

  return (
    <main className="w-full min-h-screen pb-24 bg-[#FAFAFA]">
      <Navbar theme="dark" />

      <div className="max-w-7xl mx-auto px-6 pt-32">
        {/* Header & Currency Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#121212] mb-4 tracking-tight">
              The Digital Store
            </h1>
            <p className="text-lg text-neutral-600">
              Transform your training and nutrition with premium plans, or get started with our free guides.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-neutral-200">
            <button
              onClick={() => setCurrency('USD')}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                currency === 'USD' ? 'bg-[#121212] text-white' : 'text-neutral-500 hover:text-[#121212]'
              }`}
            >
              <DollarSign size={16} /> USD
            </button>
            <button
              onClick={() => setCurrency('EUR')}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                currency === 'EUR' ? 'bg-[#121212] text-white' : 'text-neutral-500 hover:text-[#121212]'
              }`}
            >
              <Euro size={16} /> EUR
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-8 mb-16">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-neutral-500 uppercase tracking-wider">
              <Filter size={16} /> Filter by Type
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    selectedCategory === cat 
                      ? 'border-[#C81D6B] bg-[#C81D6B] text-white' 
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#C81D6B] hover:text-[#C81D6B]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-neutral-500 uppercase tracking-wider">
              <Filter size={16} /> Filter by Goal
            </div>
            <div className="flex flex-wrap gap-2">
              {goals.map(goal => (
                <button
                  key={goal}
                  onClick={() => setSelectedGoal(goal)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    selectedGoal === goal 
                      ? 'border-[#00796B] bg-[#00796B] text-white' 
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#00796B] hover:text-[#00796B]'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Plans Section */}
        {paidProducts.length > 0 && (
          <section className="mb-20">
            <h2 className="font-serif text-3xl text-[#121212] mb-8 pb-4 border-b border-neutral-200">
              Premium Programs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paidProducts.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl transition-shadow group flex flex-col h-full"
                >
                  <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-[#121212]">
                      {formatPrice(product.priceUSD)}
                    </div>
                  </Link>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {product.categories.map(c => (
                        <span key={c} className="text-[10px] uppercase tracking-wider font-bold text-[#C81D6B] bg-[#C81D6B]/10 px-2 py-1 rounded-sm">
                          {c}
                        </span>
                      ))}
                    </div>
                    <Link to={`/store/${product.id}`}>
                      <h3 className="font-serif text-xl font-medium text-[#121212] mb-2 group-hover:text-[#C81D6B] transition-colors line-clamp-2">
                        {product.title}
                      </h3>
                    </Link>
                    <p className="text-neutral-600 text-sm mb-6 flex-grow line-clamp-2">
                      {product.description}
                    </p>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-full py-3.5 bg-[#121212] text-white font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#C81D6B] transition-colors"
                    >
                      <ShoppingBag size={18} /> Add to Cart
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
            <h2 className="font-serif text-3xl text-[#121212] mb-8 pb-4 border-b border-neutral-200">
              Free Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {freeProducts.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full"
                >
                  <Link to={`/store/${product.id}`} className="block relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 bg-[#00796B] text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                      Free
                    </div>
                  </Link>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {product.categories.map(c => (
                        <span key={c} className="text-[10px] uppercase tracking-wider font-bold text-[#00796B] bg-[#00796B]/10 px-2 py-1 rounded-sm">
                          {c}
                        </span>
                      ))}
                    </div>
                    <Link to={`/store/${product.id}`}>
                      <h3 className="font-serif text-xl font-medium text-[#121212] mb-2 group-hover:text-[#00796B] transition-colors line-clamp-2">
                        {product.title}
                      </h3>
                    </Link>
                    <p className="text-neutral-600 text-sm mb-6 flex-grow line-clamp-2">
                      {product.description}
                    </p>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-full py-3.5 border-2 border-[#121212] text-[#121212] font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#121212] hover:text-white transition-colors"
                    >
                      <Download size={18} /> Download Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-neutral-500 font-medium">No products found matching your filters.</p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSelectedGoal('All'); }}
              className="mt-6 text-[#C81D6B] font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}