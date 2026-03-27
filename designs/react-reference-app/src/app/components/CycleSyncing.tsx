import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import { Droplet, Apple, Flame, Moon } from 'lucide-react';

const PHASES = [
  {
    id: 'menstrual',
    name: 'Menstrual Phase',
    shortName: 'Menstrual',
    days: 'DAYS 1-5',
    description: 'Lower hormone levels mean your body relies more on fat for fuel. Focus on iron-rich foods, stews, and warm broths to replenish what your body is losing.',
    wheelText: 'Higher iron, warm easily digestible foods',
    color: '#FF4D6D',
    icon: Droplet,
    range: [1, 5]
  },
  {
    id: 'follicular',
    name: 'Follicular Phase',
    shortName: 'Follicular',
    days: 'DAYS 6-13',
    description: 'Estrogen rises, bringing fresh energy and creativity. Focus on building strength. Support this phase with fresh foods, lean proteins, and lighter carbs.',
    wheelText: 'Fresh foods, lower carb, high energy',
    color: '#4A90E2',
    icon: Apple,
    range: [6, 13]
  },
  {
    id: 'ovulatory',
    name: 'Ovulatory Phase',
    shortName: 'Ovulatory',
    days: 'DAYS 14-16',
    description: 'Hormone peaks increase your metabolic rate. Support liver function with cruciferous veggies and keep meals light, energetic, and fiber-rich.',
    wheelText: 'Lighter foods, raw veggies, fiber',
    color: '#F5A623',
    icon: Flame,
    range: [14, 16]
  },
  {
    id: 'luteal',
    name: 'Luteal Phase',
    shortName: 'Luteal',
    days: 'DAYS 17-28',
    description: 'Progesterone dominates, increasing cravings and basal body temperature. Increase complex carbs and magnesium-rich foods to stabilize mood and energy.',
    wheelText: 'Complex carbs, root veggies, magnesium',
    color: '#BD10E0',
    icon: Moon,
    range: [17, 28]
  }
];

export function CycleSyncing() {
  const sectionRef = useRef<HTMLElement>(null);

  const START_DAY = 25;
  const DEGREES_PER_DAY = 360 / 28;
  const initialRotation = -(START_DAY - 1) * DEGREES_PER_DAY;

  const [currentDay, setCurrentDay] = useState(START_DAY);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Map scroll progress → one full 360° rotation, clamped
  const rotation = useTransform(
    scrollYProgress,
    [0, 1],
    [initialRotation, initialRotation - 360]
  );

  // Update currentDay reactively from scroll progress
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const clamped = Math.min(Math.max(v, 0), 1);
    const daysAdvanced = Math.round(clamped * 28);
    const day = ((START_DAY - 1 + daysAdvanced) % 28) + 1;
    setCurrentDay(day);
  });

  const getPhaseForDay = (day: number) => {
    return PHASES.find(p => day >= p.range[0] && day <= p.range[1]) || PHASES[3];
  };

  const activePhase = getPhaseForDay(currentDay);
  const ActiveIcon = activePhase.icon;

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
    // Tall section: gives ~100px of scroll per day at typical viewport heights
    <section ref={sectionRef} className="relative bg-[#FAFAFA]" style={{ height: '350vh' }}>
      {/* Sticky inner content stays pinned while user scrolls through the tall section */}
      <div className="sticky top-0 min-h-screen overflow-hidden flex items-center py-24">
        <div className="max-w-[1440px] w-full mx-auto px-6 lg:px-24 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* Left: Text Content */}
          <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start z-10 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF4D6D]/10 rounded-full text-[#FF4D6D] text-xs font-bold tracking-widest uppercase mb-6">
              <Droplet size={14} strokeWidth={2.5} />
              CYCLE SYNCING
            </div>

            <h2 className="text-4xl md:text-[56px] font-serif font-medium text-[#121212] mb-6 leading-[1.1]">
              Nutrition that honors <br className="hidden lg:block" />your body
            </h2>

            <p className="text-lg text-neutral-600 mb-12 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Scroll to explore how your nutritional needs shift throughout your 28-day cycle. Your custom plan adapts automatically to give your body exactly what it needs.
            </p>

            <motion.div
              key={activePhase.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-lg relative border border-neutral-100/50"
            >
              <div className="flex items-center gap-5 mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${activePhase.color}15`, color: activePhase.color }}
                >
                  <ActiveIcon size={24} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold mb-1" style={{ color: activePhase.color }}>
                    {activePhase.name}
                  </h3>
                  <span className="text-xs font-bold text-neutral-500 tracking-[0.2em] uppercase">
                    {activePhase.days}
                  </span>
                </div>
              </div>
              <p className="text-neutral-600 leading-relaxed text-[15px] font-medium text-left">
                {activePhase.description}
              </p>
            </motion.div>
          </div>

          {/* Right: The Wheel */}
          <div className="flex-1 relative w-full max-w-[500px] aspect-square flex items-center justify-center mt-10 lg:mt-0">

            {/* Top Indicator — minimal rounded bar */}
            <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 z-30">
              <div
                className="w-[4px] h-[28px] rounded-full transition-colors duration-300"
                style={{ backgroundColor: activePhase.color }}
              />
            </div>

            {/* Wheel Container */}
            <div className="relative w-full h-full rounded-full">
              {/* The Rotating Element — driven directly by scroll */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ rotate: rotation }}
              >
                {dots.map(day => {
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
                        transform: `rotate(${angle}deg)`
                      }}
                    >
                      <div className="absolute top-1 left-1/2 -translate-x-1/2">
                        <div
                          className={`transition-all duration-300 flex flex-col items-center justify-start rounded-[24px] bg-[#EFEFF0] p-[4px] border border-white/60 ${
                            isCurrent ? 'w-[40px] h-[64px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'w-[32px] h-[52px] mt-1.5'
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
                              opacity: style.opacity
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Inner Content Display Circle */}
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
