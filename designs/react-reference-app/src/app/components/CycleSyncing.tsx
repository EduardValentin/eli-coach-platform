import { useId, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'motion/react';
import { Droplet, Apple, Flame, Moon } from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const PHASES = [
  {
    id: 'menstrual',
    shortName: 'Menstrual',
    days: 'Days 1–5',
    summary: 'Warm, easy-to-digest foods with iron-rich options.',
    color: 'var(--cycle-menstrual)',
    icon: Droplet,
    range: [1, 5],
  },
  {
    id: 'follicular',
    shortName: 'Follicular',
    days: 'Days 6–13',
    summary: 'Lighter, fresher meals as your energy comes back.',
    color: 'var(--cycle-follicular)',
    icon: Apple,
    range: [6, 13],
  },
  {
    id: 'ovulatory',
    shortName: 'Ovulatory',
    days: 'Days 14–16',
    summary: 'Colorful veggies · Fiber-rich meals · Fresh, balanced plates',
    color: 'var(--cycle-ovulatory)',
    icon: Flame,
    range: [14, 16],
  },
  {
    id: 'luteal',
    shortName: 'Luteal',
    days: 'Days 17–28',
    summary: 'Complex carbs, protein-rich meals and root vegetables.',
    color: 'var(--cycle-luteal)',
    icon: Moon,
    range: [17, 28],
  },
];

export function CycleSyncing() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = useId();

  const START_DAY = 25;
  const DEGREES_PER_DAY = 360 / 28;
  const initialRotation = -(START_DAY - 1) * DEGREES_PER_DAY;

  const [currentDay, setCurrentDay] = useState(START_DAY);

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
  });

  const getPhaseForDay = (day: number) => {
    return PHASES.find((p) => day >= p.range[0] && day <= p.range[1]) || PHASES[3];
  };

  const activePhase = getPhaseForDay(currentDay);

  const getPillStyle = (day: number) => {
    if (day >= 1 && day <= 5) {
      return { bg: 'var(--cycle-menstrual)', isStriped: false, opacity: 1 - (day - 1) * 0.1 };
    }
    if (day >= 23 && day <= 28) {
      return { bg: 'var(--cycle-menstrual)', isStriped: true, opacity: 0.3 + (day - 23) * 0.12 };
    }
    if (day >= 6 && day <= 8) {
      return { bg: 'var(--cycle-menstrual)', isStriped: true, opacity: 0.5 - (day - 6) * 0.15 };
    }
    const phase = getPhaseForDay(day);
    return { bg: phase.color, isStriped: false, opacity: 0.12 };
  };

  const dots = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className="relative bg-surface-page"
      style={{ height: '250vh' }}
    >
      <div className="sticky top-0 min-h-screen overflow-hidden flex items-center pt-20 pb-10 lg:pt-24 lg:pb-14">
        <div className="max-w-[1440px] w-full mx-auto px-6 lg:px-24 grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16">

          <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left z-10 relative">
            <div className="w-full max-w-lg flex flex-col items-center lg:items-start">
              <SectionEyebrow>Nutrition that fits the picture</SectionEyebrow>

              <h2
                id={headingId}
                className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-5 leading-[1.1]"
              >
                Your cycle is part of the plan.
              </h2>

              <p className="text-base md:text-lg text-copy-muted max-w-md leading-relaxed">
                Your menstrual cycle can influence your energy, appetite, training, and recovery. Your nutrition plan takes that into account, so you feel supported without having to overthink it.
              </p>
            </div>
          </div>

          <div className="w-full flex items-center justify-center mt-10 lg:mt-0">
            <div className="relative w-full max-w-[500px] aspect-square">
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
                          className={`transition-all duration-300 flex flex-col items-center justify-start rounded-[24px] bg-surface-subtle p-[4px] border border-white/60 ${
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
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-section-eyebrow mb-4">
                  DAY {currentDay}
                </span>
                <motion.h3
                  key={`${activePhase.id}-title`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[36px] md:text-[44px] font-serif font-medium mb-3 motion-reduce:transform-none"
                  style={{ color: activePhase.color }}
                >
                  {activePhase.shortName}
                </motion.h3>
                <motion.p
                  key={`${activePhase.id}-desc`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-[13px] md:text-[14px] text-copy-muted font-medium max-w-[220px] leading-snug"
                >
                  {activePhase.summary}
                </motion.p>
              </div>
            </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
