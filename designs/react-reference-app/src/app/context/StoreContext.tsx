import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export type ProductCategory = 'Workouts' | 'Nutrition Plans' | 'E-Books';
export type ProductGoal = 'Muscle Building' | 'Fat Loss' | 'Wellness' | 'Hormonal Balance';
export type ProductType = 'paid' | 'free';

export interface Product {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  priceUSD: number; // 0 if free
  type: ProductType;
  categories: ProductCategory[];
  goals: ProductGoal[];
  imageUrl: string;
  includes: string[];
}

export const STORE_PRODUCTS: Product[] = [
  // Paid Products
  {
    id: 'fat-loss-30',
    title: '30-Day Fat Loss Plan',
    description: 'A comprehensive 4-week protocol designed to maximize fat burn from home.',
    longDescription: 'This 30-day plan combines high-intensity metabolic conditioning with strategic rest to help you lean out efficiently. You will get a day-by-day workout calendar, video demonstrations, and a progressive overload strategy designed specifically for women training at home.',
    priceUSD: 49,
    type: 'paid',
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
    priceUSD: 59,
    type: 'paid',
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
    priceUSD: 39,
    type: 'paid',
    categories: ['Nutrition Plans'],
    goals: ['Wellness', 'Hormonal Balance'],
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['30-Day Meal Inspiration', 'Grocery Lists', 'Macro Cheat Sheet']
  },
  {
    id: 'advanced-full-body',
    title: 'Advanced Full Body Home Workouts',
    description: 'Push your limits with this high-intensity full-body program.',
    longDescription: 'For the experienced trainee looking to break through plateaus without a gym membership. This program leverages advanced techniques like tempo training, drop sets (with bands), and plyometrics.',
    priceUSD: 69,
    type: 'paid',
    categories: ['Workouts'],
    goals: ['Muscle Building', 'Fat Loss'],
    imageUrl: 'https://images.unsplash.com/photo-1599058917212-59714cb84743?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXJkJTIwd29ya291dHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['Advanced Training Variables', '6-Week Progression', 'Mobility Flows']
  },
  {
    id: 'home-challenge-30',
    title: '30-Day Home Workout Challenge',
    description: 'Build consistency and confidence with daily 20-minute sessions.',
    longDescription: 'The perfect program for absolute beginners or those getting back into fitness. Focus on building a habit with short, effective, equipment-free workouts that leave you feeling energized, not depleted.',
    priceUSD: 29,
    type: 'paid',
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
    priceUSD: 0,
    type: 'free',
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
    priceUSD: 0,
    type: 'free',
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
    priceUSD: 0,
    type: 'free',
    categories: ['Workouts'],
    goals: ['Muscle Building'],
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JlJTIwd29ya291dHxlbnwwfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    includes: ['10-Day Follow-Along Videos', 'Core Engagement Tutorial']
  }
];

export type Currency = 'USD' | 'EUR';

interface CartItem {
  product: Product;
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
  formatPrice: (priceUSD: number) => string;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>('USD');

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

  const clearCart = () => setCart([]);

  const formatPrice = (priceUSD: number) => {
    if (priceUSD === 0) return 'Free';
    const rate = 0.92;
    if (currency === 'EUR') {
      return `€${(priceUSD * rate).toFixed(2)}`;
    }
    return `$${priceUSD.toFixed(2)}`;
  };

  return (
    <StoreContext.Provider value={{
      cart, addToCart, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen,
      currency, setCurrency, formatPrice
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