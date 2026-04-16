import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import { X, Trash2, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

export function CartDrawer() {
  const { cart, removeFromCart, clearCart, isCartOpen, setIsCartOpen, formatPrice } = useStore();
  const { appState } = useAppState();
  
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalUSD = useMemo(() => cart.reduce((sum, item) => sum + item.product.priceUSD, 0), [cart]);

  const handleClose = () => {
    setIsCartOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setCheckoutStep('cart');
      setEmail('');
      setAgreed(false);
    }, 300);
  };

  const handleCheckout = () => {
    if (appState.isAuthenticated) {
      // Authenticated users already have emails implicitly in the mock state
      simulatePurchase();
    } else {
      setCheckoutStep('checkout');
    }
  };

  const submitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !email) return;
    simulatePurchase();
  };

  const simulatePurchase = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutStep('success');
      clearCart();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[70] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[80] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-[#FAFAFA]">
              <h2 className="font-serif text-2xl text-[#121212] flex items-center gap-2">
                <ShoppingBag className="text-[#C81D6B]" />
                Your Cart
              </h2>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-400 hover:text-[#121212] transition-colors rounded-full hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {cart.length === 0 && checkoutStep === 'cart' ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center h-full gap-4 opacity-70">
                  <ShoppingBag size={64} className="text-neutral-300 mb-4" />
                  <p className="text-xl text-neutral-500 font-medium">Your cart is empty.</p>
                  <p className="text-neutral-400">Add some plans or free resources to get started.</p>
                  <button 
                    onClick={handleClose}
                    className="mt-6 px-6 py-3 bg-[#121212] text-white rounded-sm font-medium hover:bg-[#C81D6B] transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {checkoutStep === 'cart' && (
                    <div className="flex flex-col gap-6 flex-1">
                      <div className="flex-1">
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex gap-4 py-4 border-b border-neutral-100 last:border-0">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.title}
                              className="w-20 h-24 object-cover rounded-md shadow-sm"
                            />
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-serif text-[#121212] font-medium leading-tight mb-1">
                                  {item.product.title}
                                </h3>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${item.product.priceUSD === 0 ? 'text-[#00796B] bg-[#00796B]/10' : 'text-[#C81D6B] bg-[#C81D6B]/10'}`}>
                                  {item.product.type}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <p className="font-semibold text-neutral-700">
                                  {formatPrice(item.product.priceUSD)}
                                </p>
                                <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-neutral-200 pt-6 mt-auto">
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-lg text-neutral-600 font-medium">Total</span>
                          <span className="text-3xl font-bold text-[#121212]">{formatPrice(totalUSD)}</span>
                        </div>
                        <button
                          onClick={handleCheckout}
                          className="w-full py-4 bg-[#121212] text-white font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#C81D6B] transition-colors"
                        >
                          Checkout <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 'checkout' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col h-full"
                    >
                      <h3 className="font-serif text-2xl text-[#121212] mb-2">Almost there</h3>
                      <p className="text-neutral-600 mb-8 text-sm">
                        Please provide your email where we should send your digital products.
                      </p>

                      <form onSubmit={submitCheckout} className="flex flex-col gap-6 flex-1">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 rounded-md border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C81D6B] focus:border-transparent transition-all"
                          />
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-md border border-neutral-100">
                          <p className="text-sm font-semibold text-neutral-700 mb-2">Order Summary</p>
                          <div className="flex justify-between items-center text-sm text-neutral-600">
                            <span>{cart.length} item{cart.length > 1 ? 's' : ''}</span>
                            <span className="font-bold text-[#121212]">{formatPrice(totalUSD)}</span>
                          </div>
                        </div>

                        <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-1">
                            <input
                              type="checkbox"
                              required
                              checked={agreed}
                              onChange={(e) => setAgreed(e.target.checked)}
                              className="peer appearance-none w-5 h-5 border-2 border-neutral-300 rounded-sm checked:bg-[#C81D6B] checked:border-[#C81D6B] transition-colors cursor-pointer"
                            />
                            <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                          </div>
                          <span className="text-sm text-neutral-600 group-hover:text-neutral-800 transition-colors leading-relaxed">
                            I agree to the <Link to="/terms" className="text-[#C81D6B] hover:underline">Terms of Service</Link>, <Link to="/privacy" className="text-[#C81D6B] hover:underline">Privacy Policy</Link>, and consent to receive emails regarding my order.
                          </span>
                        </label>

                        <div className="mt-auto pt-6 border-t border-neutral-200 flex gap-4">
                          <button
                            type="button"
                            onClick={() => setCheckoutStep('cart')}
                            className="px-6 py-4 border border-neutral-300 text-neutral-700 font-medium rounded-sm hover:bg-neutral-50 transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={!agreed || !email || isProcessing}
                            className="flex-1 py-4 bg-[#C81D6B] text-white font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#a31556] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? 'Processing...' : `Complete Order • ${formatPrice(totalUSD)}`}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {checkoutStep === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center flex-1 text-center h-full"
                    >
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} />
                      </div>
                      <h3 className="font-serif text-3xl text-[#121212] mb-3">Order Complete!</h3>
                      <p className="text-neutral-600 mb-8 max-w-[280px]">
                        Thank you for your order. We've sent an email to <strong>{email || 'your account'}</strong> with the download links.
                      </p>
                      <button
                        onClick={handleClose}
                        className="px-8 py-3.5 bg-[#121212] text-white font-medium rounded-sm hover:bg-[#C81D6B] transition-colors"
                      >
                        Continue Browsing
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}