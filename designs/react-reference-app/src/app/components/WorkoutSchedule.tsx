import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell,
  Moon,
  PersonStanding,
  Sparkles,
  HeartPulse,
  GraduationCap,
} from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const days = [
  { id: 'mon', name: 'Mon', type: 'strength', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'tue', name: 'Tue', type: 'rest', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'wed', name: 'Wed', type: 'recovery', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
  { id: 'thu', name: 'Thu', type: 'strength', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'fri', name: 'Fri', type: 'rest', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'sat', name: 'Sat', type: 'hypertrophy', label: 'Hypertrophy', icon: Sparkles, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'sun', name: 'Sun', type: 'recovery', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
];

const typeInfo: Record<string, string> = {
  strength: "Strength days are about lifting heavier loads. Building strong muscles improves your metabolism, bone density, and confidence in everyday movement.",
  recovery: "Active recovery keeps blood flowing and helps reduce soreness. This is when your muscles actually adapt and get stronger.",
  rest: "Rest days are just as important as training days. They let your body and mind reset so you don't slip into burnout or injury.",
  hypertrophy: "Hypertrophy days focus on muscle growth with moderate weight and higher reps. Great for shaping, toning, and building lean muscle that supports the heavier work you do on strength days.",
};

interface ValueBeat {
  icon: typeof HeartPulse;
  title: string;
  body: string;
}

const VALUE_BEATS: ValueBeat[] = [
  {
    icon: HeartPulse,
    title: 'Trained with your cycle in mind',
    body: 'Your sessions take your cycle and your week into account — heavier when you’re ready for it, lighter when you’re not.',
  },
  {
    icon: GraduationCap,
    title: 'Form & education',
    body: 'Clear demos and short coaching notes for every exercise, so you understand what you’re doing and stay safe under load.',
  },
];

export function WorkoutSchedule() {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="py-24 bg-background"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-24">

        <div className="text-center mb-16">
          <SectionEyebrow>A week of training</SectionEyebrow>
          <h2
            id={headingId}
            className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-4 leading-tight"
          >
            Workouts that support your body
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            A balanced week of training built around how you feel, not a fixed template. Click a day to see what it’s for.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 md:gap-6 overflow-x-auto w-full pb-8 pt-4 hide-scrollbar snap-x snap-mandatory">

            <div className="hidden md:flex items-center justify-center p-2 w-16 md:w-24 shrink-0">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Week 1</span>
            </div>

            {days.map((day) => {
              const Icon = day.icon;
              const isActive = activeDay === day.id;
              return (
                <motion.button
                  key={day.id}
                  type="button"
                  whileHover={{ y: -5 }}
                  onClick={() => setActiveDay(isActive ? null : day.id)}
                  aria-pressed={isActive}
                  className={`relative flex flex-col shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-sm cursor-pointer transition-shadow snap-center motion-reduce:transform-none ${
                    isActive ? 'shadow-xl ring-2 ring-offset-2 ring-brand' : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{ backgroundColor: day.bg }}
                >
                  <div className="border-b border-white/40 p-2 text-center">
                    <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">{day.name}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2">
                    <span
                      className="text-xs md:text-sm font-medium uppercase tracking-widest"
                      style={{ color: day.color }}
                    >
                      {day.label}
                    </span>
                    <Icon size={18} color={day.color} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="min-h-[120px] w-full max-w-2xl mt-4">
            <AnimatePresence mode="wait">
              {activeDay && (
                <motion.div
                  key={activeDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-50 p-6 md:p-8 rounded-2xl text-center border border-neutral-100 shadow-sm motion-reduce:transform-none"
                >
                  <h4
                    className="text-sm font-bold uppercase tracking-widest mb-3"
                    style={{ color: days.find(d => d.id === activeDay)?.color }}
                  >
                    {days.find(d => d.id === activeDay)?.label} day
                  </h4>
                  <p className="text-neutral-700 leading-relaxed">
                    {typeInfo[days.find(d => d.id === activeDay)?.type || '']}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!activeDay && (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm italic">
                Select a day above to view details
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl mt-12 lg:mt-16">
            {VALUE_BEATS.map((beat) => {
              const Icon = beat.icon;
              return (
                <div
                  key={beat.title}
                  className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm flex gap-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand/10 text-brand shrink-0"
                  >
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">
                      {beat.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {beat.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
