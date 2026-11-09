import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';

export type ProductCategory = 'Workouts' | 'Nutrition Plans' | 'E-Books';
export type ProductGoal = 'Muscle Building' | 'Fat Loss' | 'Wellness' | 'Hormonal Balance';

interface ProductContent {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  categories: ProductCategory[];
  goals: ProductGoal[];
  imageUrl: string;
  includes: string[];
}

export type PaidProduct = ProductContent & { priceEUR: number; priceUSD: number };
export type FreeProduct = ProductContent & { priceEUR: null; priceUSD: null };
export type Product = PaidProduct | FreeProduct;

export function isPaid(product: Product): product is PaidProduct {
  return product.priceEUR !== null;
}

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = ['Workouts', 'Nutrition Plans', 'E-Books'];
export const PRODUCT_GOALS: readonly ProductGoal[] = ['Muscle Building', 'Fat Loss', 'Wellness', 'Hormonal Balance'];

function inDisplayOrder<Value>(values: Value[], displayOrder: readonly Value[]): Value[] {
  return [...values].sort((first, second) => displayOrder.indexOf(first) - displayOrder.indexOf(second));
}

function withDisplayOrder(product: Product): Product {
  return {
    ...product,
    categories: inDisplayOrder(product.categories, PRODUCT_CATEGORIES),
    goals: inDisplayOrder(product.goals, PRODUCT_GOALS),
  };
}

const STORE_PRODUCT_CONTENT: Product[] = [
  // Paid Products
  {
    id: 'fat-loss-30',
    title: '30-Day Fat Loss Plan',
    description: 'A comprehensive 4-week protocol designed to maximize fat burn from home.',
    longDescription: 'This 30-day plan combines high-intensity metabolic conditioning with strategic rest to help you lean out efficiently. You will get a day-by-day workout calendar, video demonstrations, and a progressive overload strategy designed specifically for women training at home.',
    priceEUR: 39,
    priceUSD: 45,
    categories: ['Workouts'],
    goals: ['Fat Loss'],
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHdvcmtvdXR8ZW58MHx8fHwxNzc0NDMxNzA0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['4-Week Workout Calendar', 'Video Demonstrations', 'Progress Tracker PDF']
  },
  {
    id: 'bigger-glutes-30',
    title: '30-Day Bigger Glutes Plan',
    description: 'Targeted hypertrophic training to build and shape your glutes.',
    longDescription: 'Grow your glutes without leaving your living room. Using targeted resistance and specific isolation exercises, this 30-day program focuses on the biomechanics of glute growth for women. Dumbbells or resistance bands recommended.',
    priceEUR: 49,
    priceUSD: 55,
    categories: ['Workouts'],
    goals: ['Muscle Building'],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGd5bSUyMGdzaG9lc3xlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['Glute-Focused Calendar', 'Form Correction Guide', 'Muscle Activation Routine']
  },
  {
    id: 'nutritional-reset',
    title: 'Nutritional Reset Plan',
    description: 'A complete nutritional overhaul focused on balance and energy.',
    longDescription: 'Stop dieting and start nourishing. This guide provides a sustainable framework for eating that supports your training, stabilizes your mood, and balances your hormones. Includes 30 days of meal ideas and macro guidelines.',
    priceEUR: 29,
    priceUSD: 35,
    categories: ['Nutrition Plans'],
    goals: ['Wellness', 'Hormonal Balance'],
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['30-Day Meal Inspiration', 'Grocery Lists', 'Macro Cheat Sheet']
  },
  {
    id: 'advanced-full-body',
    title: 'Advanced Full Body Home Workouts',
    description: 'Push your limits with this high-intensity full-body program.',
    longDescription: 'For the experienced trainee looking to break through plateaus without a gym membership. This program uses advanced techniques like tempo training, drop sets (with bands), and plyometrics.',
    priceEUR: 59,
    priceUSD: 65,
    categories: ['Workouts'],
    goals: ['Muscle Building', 'Fat Loss'],
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    includes: ['Advanced Training Variables', '6-Week Progression', 'Mobility Flows']
  },
  {
    id: 'home-challenge-30',
    title: '30-Day Home Workout Challenge',
    description: 'Build consistency and confidence with daily 20-minute sessions.',
    longDescription: 'The perfect program for absolute beginners or those getting back into fitness. Focus on building a habit with short, effective, equipment-free workouts that leave you feeling energized, not depleted.',
    priceEUR: 25,
    priceUSD: 29,
    categories: ['Workouts'],
    goals: ['Wellness'],
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWFjaGluZyUyMGdvYWxzJTIwZml0bmVzc3xlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['Daily 20-Min Workouts', 'Habit Tracker', 'Community Access']
  },
  
  // Free Products
  {
    id: 'hormone-harmony-ebook',
    title: 'Hormone Harmony E-Book',
    description: 'Learn how to sync your workouts with your cycle for better results.',
    longDescription: 'A deep dive into understanding your menstrual cycle and how fluctuating hormones impact your energy, strength, and recovery. Learn exactly when to push hard and when to rest.',
    priceEUR: null,
    priceUSD: null,
    categories: ['E-Books'],
    goals: ['Hormonal Balance', 'Wellness'],
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwbWVkaXRhdGlvbnxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['Cycle Syncing Overview', 'Phase-by-Phase Guidelines']
  },
  {
    id: 'nutrition-tips-pdf',
    title: 'Nutrition Tips & Myths PDF',
    description: 'Debunking common diet myths and giving you actionable daily tips.',
    longDescription: 'Stop falling for fad diets. This quick-read PDF dismantles the top 10 nutrition myths marketed to women and replaces them with evidence-based, easy-to-implement habits.',
    priceEUR: null,
    priceUSD: null,
    categories: ['Nutrition Plans'],
    goals: ['Wellness', 'Fat Loss'],
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['Myth-Busting Guide', 'Top 5 Daily Habits']
  },
  {
    id: 'ab-challenge-10',
    title: '10-Day Core Challenge',
    description: 'Strengthen your core with these quick, effective 10-minute routines.',
    longDescription: 'A focused mini-challenge designed to build deep core strength. Perfect to tack onto the end of your regular workouts or do on active recovery days. Focuses on anti-rotation and stability, not just crunches.',
    priceEUR: null,
    priceUSD: null,
    categories: ['Workouts'],
    goals: ['Muscle Building'],
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JlJTIwd29ya291dHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['10-Day Follow-Along Videos', 'Core Engagement Tutorial']
  }
];

export const STORE_PRODUCTS: Product[] = STORE_PRODUCT_CONTENT.map(withDisplayOrder);

export type Currency = 'EUR' | 'USD';

const CURRENCIES: readonly Currency[] = ['EUR', 'USD'];
const DEFAULT_CURRENCY: Currency = 'EUR';
const CURRENCY_STORAGE_KEY = 'evoa.storeCurrency';

const PRICE_FORMATS: Record<Currency, Intl.NumberFormat> = {
  EUR: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
};

export function formatStorePrice(amount: number, currency: Currency): string {
  return PRICE_FORMATS[currency].format(amount);
}

export function priceInCurrency(product: PaidProduct, currency: Currency): number {
  return currency === 'EUR' ? product.priceEUR : product.priceUSD;
}

function isCurrency(value: string | null): value is Currency {
  return CURRENCIES.some((currency) => currency === value);
}

function loadCurrency(): Currency {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

function rememberCurrency(currency: Currency) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {}
}

export interface CartItem {
  product: Product;
}

export type CartNotice = 'payment-not-completed';

export type StoreCheckoutDetails = {
  email: string;
  termsAccepted: boolean;
  deliveryConsent: boolean;
  marketingConsent: boolean;
};

const CART_STORAGE_KEY = 'evoa.storeCart';
const CART_STORAGE_VERSION = 1;
const CHECKOUT_DETAILS_STORAGE_KEY = 'evoa.storeCheckoutDetails';

function loadCart(): CartItem[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? 'null');
    if (!isStoredCart(stored)) return [];
    return [...new Set(stored.productIds)].flatMap((productId) => {
      const product = STORE_PRODUCTS.find((candidate) => candidate.id === productId);
      return product ? [{ product }] : [];
    });
  } catch {
    return [];
  }
}

function isStoredCart(stored: unknown): stored is { productIds: string[]; version: number } {
  return (
    typeof stored === 'object' &&
    stored !== null &&
    'version' in stored &&
    stored.version === CART_STORAGE_VERSION &&
    'productIds' in stored &&
    Array.isArray(stored.productIds) &&
    stored.productIds.every((id) => typeof id === 'string')
  );
}

function rememberCart(cart: CartItem[]) {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ productIds: cart.map((item) => item.product.id), version: CART_STORAGE_VERSION }),
    );
  } catch {}
}

function rememberCheckoutDetails(details: StoreCheckoutDetails) {
  try {
    sessionStorage.setItem(CHECKOUT_DETAILS_STORAGE_KEY, JSON.stringify(details));
  } catch {}
}

function forgetCheckoutDetails() {
  try {
    sessionStorage.removeItem(CHECKOUT_DETAILS_STORAGE_KEY);
  } catch {}
}

function takeCheckoutDetails(): StoreCheckoutDetails | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(CHECKOUT_DETAILS_STORAGE_KEY) ?? 'null');
    forgetCheckoutDetails();
    return isStoredCheckoutDetails(stored) ? stored : null;
  } catch {
    return null;
  }
}

function isStoredCheckoutDetails(stored: unknown): stored is StoreCheckoutDetails {
  return (
    typeof stored === 'object' &&
    stored !== null &&
    'email' in stored &&
    typeof stored.email === 'string' &&
    'termsAccepted' in stored &&
    typeof stored.termsAccepted === 'boolean' &&
    'deliveryConsent' in stored &&
    typeof stored.deliveryConsent === 'boolean' &&
    'marketingConsent' in stored &&
    typeof stored.marketingConsent === 'boolean'
  );
}

interface StoreContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (product: PaidProduct) => string;
  cartTotal: string | null;
  cartNotice: CartNotice | null;
  openCartAfterCancelledPayment: () => void;
  dismissCartNotice: () => void;
  rememberCheckoutDetails: (details: StoreCheckoutDetails) => void;
  takeCheckoutDetails: () => StoreCheckoutDetails | null;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState<CartNotice | null>(null);
  const [currency, setCurrencyState] = useState<Currency>(loadCurrency);

  useEffect(() => rememberCart(cart), [cart]);

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    rememberCurrency(next);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      if (prev.find(item => item.product.id === product.id)) return prev; // Avoid duplicates
      return [...prev, { product }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    forgetCheckoutDetails();
  };

  const openCartAfterCancelledPayment = () => {
    setCartNotice('payment-not-completed');
    setIsCartOpen(true);
  };

  const dismissCartNotice = () => setCartNotice(null);

  const formatPrice = (product: PaidProduct) => formatStorePrice(priceInCurrency(product, currency), currency);

  const cartTotal = useMemo(() => {
    const paidProducts = cart.map((item) => item.product).filter(isPaid);
    if (paidProducts.length === 0) return null;
    const total = paidProducts.reduce((sum, product) => sum + priceInCurrency(product, currency), 0);
    return formatStorePrice(total, currency);
  }, [cart, currency]);

  return (
    <StoreContext.Provider value={{
      cart, addToCart, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen,
      currency, setCurrency, formatPrice, cartTotal,
      cartNotice, openCartAfterCancelledPayment, dismissCartNotice,
      rememberCheckoutDetails, takeCheckoutDetails
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
