import { useId } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Dumbbell,
  PersonStanding,
  Sparkles,
} from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const REVIEWS = [
  'Your training history and what you logged this week.',
  'How you’re feeling and what you’ve messaged Eli.',
  'Anything you ask for — like a lighter day or different equipment at home.',
];

interface DayCardProps {
  label: string;
  emphasis: 'before' | 'after';
  type: string;
  typeColor: string;
  typeBg: string;
  Icon: typeof Dumbbell;
  exercises: string[];
}

function DayCard({
  label,
  emphasis,
  type,
  typeColor,
  typeBg,
  Icon,
  exercises,
}: DayCardProps) {
  const isAfter = emphasis === 'after';
  return (
    <div
      className={`relative bg-card border rounded-2xl p-5 transition-all flex-1 ${
        isAfter
          ? 'border-brand shadow-[0_8px_32px_-12px_rgba(200,29,107,0.25)]'
          : 'border-border shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-[10px] uppercase tracking-[0.2em] font-bold ${
            isAfter ? 'text-brand' : 'text-muted-foreground'
          }`}
        >
          {label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ color: typeColor, backgroundColor: typeBg }}
        >
          <Icon size={11} aria-hidden="true" />
          {type}
        </span>
      </div>

      <p className="text-base font-serif font-medium text-foreground mb-3">
        Thursday
      </p>

      <ul className="space-y-2">
        {exercises.map((exercise) => (
          <li
            key={exercise}
            className="flex items-center gap-2.5 text-sm text-foreground"
          >
            <span
              aria-hidden="true"
              className={`block w-1.5 h-1.5 rounded-full shrink-0 ${
                isAfter ? 'bg-brand' : 'bg-muted-foreground/50'
              }`}
            />
            <span>{exercise}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BeforeAfterVisual() {
  return (
    <div className="relative w-full max-w-md lg:max-w-none mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="motion-reduce:transform-none"
      >
        <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 mb-5 relative">
          <DayCard
            label="Before"
            emphasis="before"
            type="Strength"
            typeColor="#C81D6B"
            typeBg="rgba(200,29,107,0.1)"
            Icon={Dumbbell}
            exercises={['Squats', 'Lunges', 'Step-ups']}
          />

          <div
            className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-brand text-brand-foreground shadow-lg"
            aria-hidden="true"
          >
            <ArrowRight size={18} />
          </div>

          <DayCard
            label="After"
            emphasis="after"
            type="Recovery"
            typeColor="#00796B"
            typeBg="rgba(0,121,107,0.1)"
            Icon={PersonStanding}
            exercises={['Easy walk', 'Stretching', 'Mobility']}
          />
        </div>

        <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-brand text-brand-foreground shrink-0"
          >
            <Sparkles size={15} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand font-bold mb-1.5">
              A note from Eli
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              Tuesday felt heavy and your sleep was short — I made Thursday
              lighter so you can come back fresh on Saturday.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CoachAdjustment() {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="py-20 lg:py-28 bg-[#FAFAFA] overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <BeforeAfterVisual />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="motion-reduce:transform-none"
          >
            <SectionEyebrow>Always adjusting</SectionEyebrow>
            <h2
              id={headingId}
              className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-6 leading-tight"
            >
              Your plan, adjusted as you go.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Every week, Eli checks in on what changed — then quietly tweaks the
              plan so it keeps fitting the person you actually are.
            </p>

            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">
              What she looks at
            </p>
            <ul className="space-y-3">
              {REVIEWS.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-base text-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand shrink-0 mt-0.5"
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm font-medium text-foreground mt-8 max-w-xl leading-relaxed">
              You don’t have to figure it out alone. She’s already paying attention.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
