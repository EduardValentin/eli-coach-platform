import { useId } from 'react';
import { motion } from 'motion/react';
import {
  Dumbbell,
  Moon,
  PersonStanding,
  Sparkles,
} from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const days = [
  { id: 'mon', name: 'Mon', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'tue', name: 'Tue', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'wed', name: 'Wed', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
  { id: 'thu', name: 'Thu', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'fri', name: 'Fri', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'sat', name: 'Sat', label: 'Hypertrophy', icon: Sparkles, color: '#7A42E8', bg: 'rgba(122,66,232,0.1)' },
  { id: 'sun', name: 'Sun', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
];

export function WorkoutSchedule() {
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
            A balanced week built around how you feel — not a fixed template.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 md:gap-4 overflow-x-auto w-full pb-4 hide-scrollbar snap-x snap-mandatory justify-start min-[656px]:justify-center md:justify-start xl:justify-center motion-reduce:transform-none"
        >
          {days.map((day, index) => {
            const Icon = day.icon;
            return (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex flex-col shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-sm snap-center motion-reduce:transform-none"
                style={{ backgroundColor: day.bg }}
              >
                <div className="border-b border-white/40 p-1.5 md:p-2 text-center">
                  <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">{day.name}</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
                  <span
                    className="text-[10px] md:text-xs font-medium uppercase tracking-widest"
                    style={{ color: day.color }}
                  >
                    {day.label}
                  </span>
                  <Icon size={16} color={day.color} aria-hidden="true" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
