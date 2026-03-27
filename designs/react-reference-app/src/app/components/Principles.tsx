import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const principles = [
  {
    id: '01',
    title: 'Gym Workouts',
    image: 'https://images.unsplash.com/photo-1594269807754-7b7926246d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZpdG5lc3MlMjB0cmFpbmluZyUyMHN0cm9uZ3xlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Walk into the gym with a plan',
  },
  {
    id: '02',
    title: 'At-home workouts',
    image: 'https://images.unsplash.com/photo-1758599879895-97aa69b6dd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGhvbWUlMjB3b3Jrb3V0JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NzQzNjY1MTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'No commute, no excuses',
  },
  {
    id: '03',
    title: 'Calm mind',
    image: 'https://images.unsplash.com/photo-1758274539654-23fa349cc090?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMG1lZGl0YXRpbmclMjB5b2dhJTIwY2FsbSUyMG91dGRvb3JzfGVufDF8fHx8MTc3NDQzMTcwNHww&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Stress less, recover more',
  },
  {
    id: '04',
    title: 'Good Nutrition',
    image: 'https://images.unsplash.com/photo-1661257711676-79a0fc533569?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBmb29kJTIwbnV0cml0aW9uJTIwYm93bHxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Fuel your body right',
  },
];

const TOTAL = String(principles.length).padStart(2, '0');

export function Principles() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePrinciple = principles[activeIndex];

  return (
    <section className="py-20 lg:py-32 bg-background overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24">
        {/* Section eyebrow */}
        <p className="text-muted-foreground uppercase tracking-[0.2em] text-sm font-sans mb-10 lg:mb-16">
          What you get
        </p>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          {/* Image Showcase */}
          <div className="lg:flex-[3]">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-xl">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIndex}
                  src={activePrinciple.image}
                  alt={activePrinciple.title}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Subtle brand tint */}
              <div className="absolute inset-0 bg-brand/5 mix-blend-multiply pointer-events-none" />

              {/* Bottom gradient scrim for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

              {/* Counter + Subtitle overlay */}
              <div className="absolute bottom-5 left-5 right-5 md:bottom-8 md:left-8 md:right-8 z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <span className="text-xs md:text-sm text-white/50 uppercase tracking-[0.15em] font-sans">
                      {activePrinciple.id} — {TOTAL}
                    </span>
                    <p className="text-white text-lg md:text-xl lg:text-2xl font-serif mt-1.5">
                      {activePrinciple.subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Principle Navigation */}
          <div className="lg:flex-[2] flex flex-col justify-center">
            <div className="border-t border-border">
              {principles.map((principle, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={principle.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => setActiveIndex(idx)}
                    className="group cursor-pointer py-5 lg:py-6 border-b border-border relative overflow-hidden"
                  >
                    <div className="flex items-baseline gap-4">
                      <motion.span
                        animate={{
                          color: isActive
                            ? 'var(--brand)'
                            : 'var(--muted-foreground)',
                        }}
                        transition={{ duration: 0.3 }}
                        className="text-sm font-sans tabular-nums"
                      >
                        {principle.id}
                      </motion.span>
                      <motion.h3
                        animate={{
                          color: isActive
                            ? 'var(--foreground)'
                            : 'var(--muted-foreground)',
                        }}
                        transition={{ duration: 0.3 }}
                        className="text-xl md:text-2xl lg:text-3xl font-semibold uppercase tracking-wider"
                      >
                        {principle.title}
                      </motion.h3>
                    </div>

                    {/* Active accent line */}
                    <motion.div
                      initial={false}
                      animate={{ scaleX: isActive ? 1 : 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand origin-left"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
