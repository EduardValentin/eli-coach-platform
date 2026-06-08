import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Check,
  Droplet,
  Dumbbell,
  MessageCircle,
  Utensils,
} from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { SectionEyebrow } from './SectionEyebrow';

type CloudId = 'workouts' | 'nutrition' | 'chat' | 'cycle';

type IconComponent = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

interface CloudConfig {
  id: CloudId;
  label: string;
  icon: IconComponent;
  desktopPosition: string;
}

const CLOUDS: CloudConfig[] = [
  {
    id: 'workouts',
    label: 'Personalized workouts',
    icon: Dumbbell,
    desktopPosition: 'top-4 right-full mr-3 xl:mr-5',
  },
  {
    id: 'nutrition',
    label: 'Nutrition planner',
    icon: Utensils,
    desktopPosition: 'top-24 left-full ml-3 xl:ml-5',
  },
  {
    id: 'chat',
    label: 'Chat with your coach',
    icon: MessageCircle,
    desktopPosition: 'bottom-28 right-full mr-3 xl:mr-5',
  },
  {
    id: 'cycle',
    label: 'Cycle tracking',
    icon: Droplet,
    desktopPosition: 'bottom-8 left-full ml-3 xl:ml-5',
  },
];

interface PhoneViewProps {
  active: CloudId;
}

function PhoneView({ active }: PhoneViewProps) {
  const Component = VIEW_BY_ID[active];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute inset-0 motion-reduce:transform-none"
      >
        <Component />
      </motion.div>
    </AnimatePresence>
  );
}

interface CloudCardProps {
  cloud: CloudConfig;
  active: boolean;
  onSelect: (id: CloudId) => void;
  className?: string;
}

function CloudCard({ cloud, active, onSelect, className = '' }: CloudCardProps) {
  const Icon = cloud.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(cloud.id)}
      aria-pressed={active}
      className={`group inline-flex items-center gap-2.5 bg-card border rounded-2xl pl-3 pr-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] text-left transition-all duration-200 motion-reduce:transition-none ${
        active
          ? 'border-brand ring-2 ring-brand/30 -translate-y-0.5 motion-reduce:translate-y-0'
          : 'border-border hover:-translate-y-0.5 hover:border-brand/40 motion-reduce:hover:translate-y-0'
      } ${className}`}
    >
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-colors ${
          active ? 'bg-brand text-brand-foreground' : 'bg-brand/10 text-brand'
        }`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight whitespace-nowrap">
        {cloud.label}
      </span>
    </button>
  );
}

function PhoneWorkoutView() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-background to-background pt-12 px-4 pb-5 flex flex-col gap-3">
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Week 3 · Day 2
        </p>
        <h4 className="text-base font-semibold text-foreground mt-0.5">
          Lower Strength
        </h4>
      </div>

      {[
        { num: '01', name: 'Goblet Squat', detail: '4 sets · 8 reps' },
        { num: '02', name: 'Romanian Deadlift', detail: '3 sets · 10 reps' },
        { num: '03', name: 'Hip Thrust', detail: '4 sets · 12 reps' },
      ].map((exercise) => (
        <div key={exercise.num} className="bg-card border border-border rounded-2xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0 tabular-nums">
            {exercise.num}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {exercise.name}
            </p>
            <p className="text-[9px] text-muted-foreground">{exercise.detail}</p>
          </div>
        </div>
      ))}

      <div className="mt-auto bg-brand/10 border border-brand/20 rounded-2xl p-3 text-center">
        <p className="text-[10px] font-semibold text-brand uppercase tracking-widest">
          3 more exercises
        </p>
      </div>
    </div>
  );
}

function PhoneNutritionView() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-background to-background pt-12 px-4 pb-5 flex flex-col gap-3 overflow-hidden">
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Today · April 17
        </p>
        <h4 className="text-base font-semibold text-foreground mt-0.5">
          Your nutrition
        </h4>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Daily target
          </p>
          <span className="text-[9px] text-muted-foreground tabular-nums">
            BMR 1,420
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-serif font-medium text-foreground tabular-nums">
            1,700
          </span>
          <span className="text-[10px] text-muted-foreground">kcal</span>
        </div>
        <div className="flex h-1 rounded-full overflow-hidden" aria-hidden="true">
          <div className="bg-brand" style={{ width: '35%' }} />
          <div className="bg-brand/60" style={{ width: '40%' }} />
          <div className="bg-brand/30" style={{ width: '25%' }} />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[9px] text-muted-foreground">
          <span>Protein 35%</span>
          <span>Carbs 40%</span>
          <span>Fat 25%</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">
          Recipes this week
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center shrink-0">
              <Utensils size={11} className="text-brand" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Lemon ginger salmon
              </p>
              <p className="text-[9px] text-muted-foreground">25 min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center shrink-0">
              <Utensils size={11} className="text-brand" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Warm quinoa bowl
              </p>
              <p className="text-[9px] text-muted-foreground">20 min</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Shopping list
          </p>
          <span className="text-[9px] text-muted-foreground tabular-nums">
            17 items
          </span>
        </div>
        <ul className="space-y-1">
          {['Wild salmon', 'Baby spinach', 'Sweet potato'].map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 text-[11px] text-foreground"
            >
              <span
                aria-hidden="true"
                className="flex items-center justify-center w-3 h-3 rounded-full bg-brand/10 text-brand shrink-0"
              >
                <Check size={8} strokeWidth={3} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PhoneMessagingView() {
  return (
    <div className="absolute inset-0 bg-background pt-12 px-4 pb-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand/70 flex items-center justify-center shrink-0">
          <span className="text-brand-foreground font-serif text-sm leading-none">
            E
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight">
            Eli Fitness
          </p>
          <p className="text-[9px] text-muted-foreground">
            Replies in ~1 hour
          </p>
        </div>
        <span className="w-2 h-2 rounded-full bg-brand" aria-hidden="true" />
      </div>

      <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-end gap-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand to-brand/60 shrink-0" />
          <div className="max-w-[80%] px-3 py-2 bg-brand/10 text-foreground rounded-2xl rounded-bl-sm text-[11px] leading-snug">
            How did Tuesday's session feel?
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[75%] px-3 py-2 bg-muted text-foreground rounded-2xl rounded-br-sm text-[11px] leading-snug">
            Felt strong — let's keep going.
          </div>
        </div>

        <div className="border-2 border-brand/30 bg-brand/5 rounded-2xl rounded-bl-sm p-3 max-w-[92%]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar size={10} className="text-brand" aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand">
              Check-in proposed
            </span>
          </div>
          <p className="text-[11px] text-foreground mb-2">Fri 9:00 AM · 20 min</p>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 bg-brand text-brand-foreground rounded-full text-[10px] font-semibold">
              Approve
            </span>
            <span className="px-2.5 py-1 bg-card border border-border text-foreground rounded-full text-[10px] font-semibold">
              Reschedule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneCycleView() {
  const today = 14;
  const periodDays = [1, 2, 3, 4];
  const phaseColor = (day: number): string => {
    if (day >= 1 && day <= 5) return 'bg-[#FF4D6D]';
    if (day >= 6 && day <= 13) return 'bg-[#4A90E2]/30';
    if (day >= 14 && day <= 16) return 'bg-[#F5A623]/40';
    return 'bg-[#BD10E0]/30';
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-background to-background pt-12 px-4 pb-5 flex flex-col gap-3">
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Day {today} · Cycle
        </p>
        <h4 className="text-base font-semibold text-foreground mt-0.5">
          Ovulatory phase
        </h4>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
            const isToday = day === today;
            const isPeriod = periodDays.includes(day);
            return (
              <div
                key={day}
                className={`relative aspect-square rounded-md flex items-center justify-center text-[9px] font-medium ${
                  isPeriod
                    ? 'bg-[#FF4D6D] text-white'
                    : 'bg-muted/40 text-muted-foreground'
                } ${
                  isToday
                    ? 'ring-2 ring-brand ring-offset-1 ring-offset-card text-foreground font-bold'
                    : ''
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">
          This cycle
        </p>
        <div className="space-y-1.5">
          {[
            { name: 'Menstrual', days: '1–5' },
            { name: 'Follicular', days: '6–13' },
            { name: 'Ovulatory', days: '14–16', active: true },
            { name: 'Luteal', days: '17–28' },
          ].map((phase) => (
            <div
              key={phase.name}
              className={`flex items-center gap-2 px-1.5 py-1 rounded-md ${
                phase.active ? 'bg-brand/10' : ''
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${phaseColor(
                  phase.name === 'Menstrual'
                    ? 1
                    : phase.name === 'Follicular'
                    ? 8
                    : phase.name === 'Ovulatory'
                    ? 14
                    : 20,
                )}`}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] flex-1 ${
                  phase.active
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {phase.name}
              </span>
              <span className="text-[9px] text-muted-foreground tabular-nums">
                Day {phase.days}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const VIEW_BY_ID: Record<CloudId, ComponentType> = {
  workouts: PhoneWorkoutView,
  nutrition: PhoneNutritionView,
  chat: PhoneMessagingView,
  cycle: PhoneCycleView,
};

export function Platform() {
  const [active, setActive] = useState<CloudId>('workouts');
  const headingId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  const cycle = (direction: 1 | -1) => {
    setActive((current) => {
      const currentIndex = CLOUDS.findIndex((cloud) => cloud.id === current);
      const nextIndex = (currentIndex + direction + CLOUDS.length) % CLOUDS.length;
      return CLOUDS[nextIndex].id;
    });
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const tabs = tabsRef.current;
    if (!tabs) return;
    const activeButton = tabs.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!activeButton || typeof activeButton.scrollIntoView !== 'function') return;
    activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  useEffect(() => {
    const phone = phoneRef.current;
    if (!phone) return;

    const SWIPE_THRESHOLD = 40;
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isTracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      cycle(dx < 0 ? 1 : -1);
    };

    const onTouchCancel = () => {
      isTracking = false;
    };

    phone.addEventListener('touchstart', onTouchStart, { passive: true });
    phone.addEventListener('touchend', onTouchEnd, { passive: true });
    phone.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      phone.removeEventListener('touchstart', onTouchStart);
      phone.removeEventListener('touchend', onTouchEnd);
      phone.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      className="py-20 lg:py-28 bg-background overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-2xl mx-auto text-center mb-12 lg:mb-16 motion-reduce:transform-none"
        >
          <SectionEyebrow>Your fitness, in one app</SectionEyebrow>
          <h2
            id={headingId}
            className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground leading-tight"
          >
            Open your phone. See your plan.
          </h2>
        </motion.div>

        <div
          className="lg:hidden -mx-6 px-6 pt-3 pb-3 mb-8 overflow-x-auto flex gap-3 snap-x snap-mandatory hide-scrollbar"
          ref={tabsRef}
          role="tablist"
          aria-label="App capabilities"
        >
          {CLOUDS.map((cloud) => (
            <CloudCard
              key={cloud.id}
              cloud={cloud}
              active={active === cloud.id}
              onSelect={setActive}
              className="snap-center shrink-0"
            />
          ))}
        </div>

        <div className="flex items-center justify-center lg:min-h-[600px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative motion-reduce:transform-none"
            ref={phoneRef}
          >
            <PhoneFrame
              statusBarVariant="dark"
              className="w-[260px] sm:w-[280px] aspect-[9/16]"
            >
              <PhoneView active={active} />
            </PhoneFrame>

            <div className="hidden lg:block">
              {CLOUDS.map((cloud, index) => (
                <motion.div
                  key={cloud.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 + index * 0.08,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={`absolute z-20 motion-reduce:transform-none ${cloud.desktopPosition}`}
                >
                  <CloudCard
                    cloud={cloud}
                    active={active === cloud.id}
                    onSelect={setActive}
                    className="w-max"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
