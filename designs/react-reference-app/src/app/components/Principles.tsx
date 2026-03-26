import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const principles = [
  {
    id: '01',
    title: 'Gym Workouts',
    image: 'https://images.unsplash.com/photo-1594269807754-7b7926246d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZpdG5lc3MlMjB0cmFpbmluZyUyMHN0cm9uZ3xlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Walk into the gym with a plan'
  },
  {
    id: '02',
    title: 'At-home workouts',
    image: 'https://images.unsplash.com/photo-1758599879895-97aa69b6dd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGhvbWUlMjB3b3Jrb3V0JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NzQzNjY1MTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'No commute, no excuses'
  },
  {
    id: '03',
    title: 'Calm mind',
    image: 'https://images.unsplash.com/photo-1758274539654-23fa349cc090?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMG1lZGl0YXRpbmclMjB5b2dhJTIwY2FsbSUyMG91dGRvb3JzfGVufDF8fHx8MTc3NDQzMTcwNHww&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Stress less, recover more'
  },
  {
    id: '04',
    title: 'Good Nutrition',
    image: 'https://images.unsplash.com/photo-1661257711676-79a0fc533569?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBmb29kJTIwbnV0cml0aW9uJTIwYm93bHxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    subtitle: 'Fuel your body right'
  }
];

export function Principles() {
  const [activeIndex, setActiveIndex] = useState(0);

  const activePrinciple = principles[activeIndex];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24 flex flex-col lg:flex-row h-auto lg:h-[800px] gap-12 lg:gap-24 relative">
        
        {/* Left Side: Index & Image */}
        <div className="flex-1 relative flex flex-col justify-center">
          {/* Index Counter */}
          <div className="absolute top-0 lg:top-1/2 lg:-translate-y-1/2 left-0 flex items-baseline gap-2 z-10">
            <motion.span 
              key={activePrinciple.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl md:text-8xl lg:text-[120px] font-serif font-medium text-[#121212] leading-none"
            >
              {activePrinciple.id}
            </motion.span>
            <span className="text-xl md:text-3xl text-neutral-400 font-serif leading-none">/04</span>
          </div>

          {/* Active Image Tile */}
          <div className="relative mt-24 lg:mt-0 ml-0 lg:ml-32 w-full max-w-2xl aspect-[4/3] lg:aspect-[4/3] shadow-2xl z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm text-neutral-500 whitespace-nowrap z-30 bg-white/80 px-4 py-1 rounded-full backdrop-blur-sm">
                  {activePrinciple.subtitle}
                </div>
                <img 
                  src={activePrinciple.image} 
                  alt={activePrinciple.title}
                  className="w-full h-full object-cover"
                />
                {/* Colored Scrim for vibe */}
                <div className="absolute inset-0 bg-[#C81D6B] mix-blend-soft-light opacity-10 pointer-events-none" />
              </motion.div>
            </AnimatePresence>

            {/* Background elements to mock the stacked cards effect */}
            <div className="absolute -z-10 -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-full opacity-40 shadow-xl bg-gray-200">
               <img src={principles[(activeIndex + 1) % principles.length].image} className="w-full h-full object-cover grayscale" alt="" />
            </div>
            <div className="absolute -z-20 -top-8 left-1/2 -translate-x-1/2 w-[80%] h-full opacity-40 shadow-xl bg-gray-200">
               <img src={principles[(activeIndex + 2) % principles.length].image} className="w-full h-full object-cover grayscale" alt="" />
            </div>
          </div>
        </div>

        {/* Right Side: List */}
        <div className="flex-1 flex flex-col justify-center items-end text-right gap-8 z-30">
          {principles.map((principle, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div 
                key={principle.id}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
                className="group cursor-pointer flex flex-col items-end"
              >
                <motion.h3 
                  animate={{ 
                    color: isActive ? '#121212' : '#9ca3af',
                    scale: isActive ? 1.05 : 1,
                    originX: 1
                  }}
                  className={`text-2xl md:text-3xl lg:text-4xl font-semibold uppercase tracking-wider transition-colors ${
                    isActive ? '' : 'hover:text-neutral-600'
                  }`}
                >
                  {principle.title}
                </motion.h3>
                {/* Active Indicator Line */}
                <motion.div 
                  initial={false}
                  animate={{ 
                    width: isActive ? '100%' : '0%',
                    opacity: isActive ? 1 : 0
                  }}
                  className="h-0.5 bg-[#C81D6B] mt-2 origin-right"
                />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
