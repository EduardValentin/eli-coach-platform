import { useState, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'motion/react';
import { Droplet, Apple, Flame, Moon, Check, Utensils } from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const PHASES = [
  {
    id: 'menstrual',
    shortName: 'Menstrual',
    days: 'DAYS 1-5',
    wheelText: 'Higher iron, warm easily digestible foods',
    color: '#FF4D6D',
    icon: Droplet,
    range: [1, 5],
  },
  {
    id: 'follicular',
    shortName: 'Follicular',
    days: 'DAYS 6-13',
    wheelText: 'Fresh foods, lower carb, high energy',
    color: '#4A90E2',
    icon: Apple,
    range: [6, 13],
  },
  {
    id: 'ovulatory',
    shortName: 'Ovulatory',
    days: 'DAYS 14-16',
    wheelText: 'Lighter foods, raw veggies, fiber',
    color: '#F5A623',
    icon: Flame,
    range: [14, 16],
  },
  {
    id: 'luteal',
    shortName: 'Luteal',
    days: 'DAYS 17-28',
    wheelText: 'Complex carbs, root veggies, magnesium',
    color: '#BD10E0',
    icon: Moon,
    range: [17, 28],
  },
];

const BASELINE_KCAL = 1700;
const LUTEAL_KCAL = 1850;

const SHOPPING_ITEMS = [
  'Wild salmon · 600 g',
  'Baby spinach',
  'Quinoa',
  'Sweet potato',
];

const RECIPES = [
  { name: 'Warm quinoa bowl', meta: '20 min · fiber forward' },
  { name: 'Lemon ginger salmon', meta: '25 min · omega-3' },
];

const CARD_ENTRANCE = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
};

interface DailyTargetCardProps {
  calories: number;
  chipLabel?: string;
  chipColor?: string;
  chipDelay?: number;
}

function DailyTargetCard({
  calories,
  chipLabel,
  chipColor,
  chipDelay = 0,
}: DailyTargetCardProps) {
  return (
    <motion.div
      {...CARD_ENTRANCE}
      className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left motion-reduce:transform-none"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Daily target
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          BMR 1,420
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-4 flex-wrap">
        <span className="text-3xl lg:text-4xl font-serif font-medium text-foreground tabular-nums">
          {calories.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">kcal</span>
        <AnimatePresence>
          {chipLabel && chipColor && (
            <motion.span
              key={chipLabel}
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, delay: chipDelay, ease: [0.25, 0.1, 0.25, 1] }}
              className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap motion-reduce:transform-none"
              style={{
                backgroundColor: `${chipColor}15`,
                color: chipColor,
              }}
            >
              {chipLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div>
        <div className="flex h-1.5 rounded-full overflow-hidden" aria-hidden="true">
          <div className="bg-brand" style={{ width: '35%' }} />
          <div className="bg-brand/60" style={{ width: '40%' }} />
          <div className="bg-brand/30" style={{ width: '25%' }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand" />
            Protein 35%
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand/60" />
            Carbs 40%
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-brand/30" />
            Fat 25%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ShoppingListCard() {
  return (
    <motion.div
      {...CARD_ENTRANCE}
      className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left motion-reduce:transform-none"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          This week’s list
        </h3>
        <span className="text-[10px] text-muted-foreground font-bold tabular-nums">
          17 items
        </span>
      </div>
      <ul className="space-y-1.5">
        {SHOPPING_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-foreground">
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-4 h-4 rounded-full bg-brand/10 text-brand shrink-0"
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span>{item}</span>
          </li>
        ))}
        <li className="text-xs text-muted-foreground pl-6">+ 13 more</li>
      </ul>
    </motion.div>
  );
}

function RecipesCard() {
  return (
    <motion.div
      {...CARD_ENTRANCE}
      className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left motion-reduce:transform-none"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          This week’s recipes
        </h3>
        <span className="text-[10px] text-muted-foreground">3 picks</span>
      </div>
      <div className="space-y-2.5">
        {RECIPES.map((recipe) => (
          <div key={recipe.name} className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0"
            >
              <Utensils size={16} className="text-brand" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground leading-tight">
                {recipe.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{recipe.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LutealFinaleCard() {
  const [calories, setCalories] = useState(BASELINE_KCAL);

  useEffect(() => {
    const duration = 1200;
    const startDelay = 350;
    const from = BASELINE_KCAL;
    const to = LUTEAL_KCAL;
    let rafId: number | null = null;
    const startTimeout = window.setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setCalories(Math.round(from + (to - from) * eased));
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      window.clearTimeout(startTimeout);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <DailyTargetCard
      calories={calories}
      chipLabel="Luteal · +150 kcal"
      chipColor="#BD10E0"
      chipDelay={0.85}
    />
  );
}

export function CycleSyncing() {
  const sectionRef = useRef<HTMLElement>(null);

  const START_DAY = 25;
  const DEGREES_PER_DAY = 360 / 28;
  const initialRotation = -(START_DAY - 1) * DEGREES_PER_DAY;

  const [currentDay, setCurrentDay] = useState(START_DAY);
  const [beat, setBeat] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const rotation = useTransform(
    scrollYProgress,
    [0, 1],
    [initialRotation, initialRotation - 360]
  );

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const clamped = Math.min(Math.max(v, 0), 1);
    const daysAdvanced = Math.round(clamped * 28);
    const day = ((START_DAY - 1 + daysAdvanced) % 28) + 1;
    setCurrentDay(day);

    let nextBeat: number;
    if (clamped >= 0.68) nextBeat = 3;
    else if (clamped >= 0.48) nextBeat = 2;
    else if (clamped >= 0.25) nextBeat = 1;
    else nextBeat = 0;
    setBeat(nextBeat);
  });

  const getPhaseForDay = (day: number) => {
    return PHASES.find((p) => day >= p.range[0] && day <= p.range[1]) || PHASES[3];
  };

  const activePhase = getPhaseForDay(currentDay);

  const getPillStyle = (day: number) => {
    if (day >= 1 && day <= 5) {
      return { bg: '#FF4D6D', isStriped: false, opacity: 1 - (day - 1) * 0.1 };
    }
    if (day >= 23 && day <= 28) {
      return { bg: '#FF4D6D', isStriped: true, opacity: 0.3 + (day - 23) * 0.12 };
    }
    if (day >= 6 && day <= 8) {
      return { bg: '#FF4D6D', isStriped: true, opacity: 0.5 - (day - 6) * 0.15 };
    }
    const phase = getPhaseForDay(day);
    return { bg: phase.color, isStriped: false, opacity: 0.12 };
  };

  const dots = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <section ref={sectionRef} className="relative bg-[#FAFAFA]" style={{ height: '350vh' }}>
      <div className="sticky top-0 min-h-screen overflow-hidden flex items-center pt-20 pb-10 lg:pt-24 lg:pb-14">
        <div className="max-w-[1440px] w-full mx-auto px-6 lg:px-24 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          {/* Left: Content + Morphing card */}
          <div className="flex-1 w-full flex flex-col items-center lg:items-start text-center lg:text-left z-10 relative max-w-lg">
            <SectionEyebrow>Cycle-aware nutrition</SectionEyebrow>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-3 leading-[1.1]">
              Nutrition that honors your body
            </h2>

            <p className="text-base text-neutral-600 mb-6 max-w-md leading-relaxed">
              From your onboarding quiz: calories, macros, a shopping list, and a few recipes — tuned to where you are in your cycle.
            </p>

            <div className="w-full relative" style={{ minHeight: 180 }}>
              <AnimatePresence mode="wait">
                {beat === 0 && <DailyTargetCard key="daily-base" calories={BASELINE_KCAL} />}
                {beat === 1 && <ShoppingListCard key="shopping" />}
                {beat === 2 && <RecipesCard key="recipes" />}
                {beat === 3 && <LutealFinaleCard key="luteal-finale" />}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: The Wheel */}
          <div className="flex-1 relative w-full max-w-[500px] aspect-square flex items-center justify-center mt-10 lg:mt-0">
            <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 z-30">
              <div
                className="w-[4px] h-[28px] rounded-full transition-colors duration-300"
                style={{ backgroundColor: activePhase.color }}
              />
            </div>

            <div className="relative w-full h-full rounded-full">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ rotate: rotation }}
                aria-hidden="true"
              >
                {dots.map((day) => {
                  const angle = (day - 1) * DEGREES_PER_DAY;
                  const isCurrent = day === currentDay;
                  const style = getPillStyle(day);

                  return (
                    <div
                      key={day}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        height: '50%',
                        transformOrigin: 'bottom center',
                        transform: `rotate(${angle}deg)`,
                      }}
                    >
                      <div className="absolute top-1 left-1/2 -translate-x-1/2">
                        <div
                          className={`transition-all duration-300 flex flex-col items-center justify-start rounded-[24px] bg-[#EFEFF0] p-[4px] border border-white/60 ${
                            isCurrent
                              ? 'w-[40px] h-[64px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                              : 'w-[32px] h-[52px] mt-1.5'
                          }`}
                        >
                          <div
                            className={`rounded-full transition-all duration-300 mt-[2px] ${
                              isCurrent ? 'w-[30px] h-[30px]' : 'w-[24px] h-[24px]'
                            }`}
                            style={{
                              backgroundColor: style.isStriped ? 'transparent' : style.bg,
                              backgroundImage: style.isStriped
                                ? `repeating-linear-gradient(-45deg, ${style.bg} 0px, ${style.bg} 2px, transparent 2px, transparent 5px)`
                                : 'none',
                              opacity: style.opacity,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[62%] h-[62%] bg-white rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-8 text-center z-10 pointer-events-none">
                <span className="text-[12px] font-bold text-[#8E9BB0] uppercase tracking-[0.2em] mb-4">
                  DAY {currentDay}
                </span>
                <motion.h4
                  key={`${activePhase.id}-title`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[40px] md:text-[48px] font-serif font-medium mb-3"
                  style={{ color: activePhase.color }}
                >
                  {activePhase.shortName}
                </motion.h4>
                <motion.p
                  key={`${activePhase.id}-desc`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-[15px] md:text-[16px] text-[#4A5568] font-medium max-w-[240px] leading-[1.4]"
                >
                  {activePhase.wheelText}
                </motion.p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
