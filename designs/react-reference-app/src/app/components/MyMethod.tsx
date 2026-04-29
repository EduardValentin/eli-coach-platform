import { useId } from 'react';
import { motion } from 'motion/react';
import { SectionEyebrow } from './SectionEyebrow';

const PILLARS = [
  'Eli teaches you how a woman’s body actually works.',
  'Your plan adjusts to your needs and to your cycle phase.',
  'If you don’t currently have a cycle, your plan still fits — Eli supports you the same way.',
  'No restrictive diets. No forced foods. No routines you can’t keep up with.',
];

function ProgressGraph() {
  const titleId = useId();
  const descId = useId();

  const withCoachPath = 'M 40 200 C 100 180, 180 70, 360 50';
  const aloneePath = 'M 40 200 C 130 195, 240 145, 360 120';

  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl motion-reduce:transform-none"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <figcaption className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">
          Progress, side by side
        </p>
        <h3
          id={titleId}
          className="text-xl font-serif font-medium text-foreground"
        >
          Faster results, fewer plateaus.
        </h3>
        <p id={descId} className="sr-only">
          A line graph comparing two progress curves over three months. The
          solid brand-colored curve labeled "With your coach" climbs steeper
          and reaches a higher point than the dashed gray curve labeled "On
          your own".
        </p>
      </figcaption>

      <div className="relative w-full" style={{ aspectRatio: '5 / 3' }}>
        <svg
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <line
            x1="40"
            y1="220"
            x2="360"
            y2="220"
            stroke="var(--border)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
          <line
            x1="40"
            y1="20"
            x2="40"
            y2="220"
            stroke="var(--border)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />

          <motion.path
            d={aloneePath}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          />

          <motion.path
            d={withCoachPath}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 }}
          />

          <motion.circle
            cx="40"
            cy="200"
            r="5"
            fill="var(--background)"
            stroke="var(--brand)"
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.3, delay: 0.4 }}
          />
          <motion.circle
            cx="360"
            cy="50"
            r="6"
            fill="var(--background)"
            stroke="var(--brand)"
            strokeWidth="2.5"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.3, delay: 1.7 }}
          />
          <motion.circle
            cx="360"
            cy="120"
            r="5"
            fill="var(--background)"
            stroke="var(--muted-foreground)"
            strokeOpacity="0.55"
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.3, delay: 1.4 }}
          />
        </svg>

        <motion.span
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4, delay: 1.8 }}
          className="absolute right-0 top-[14%] -translate-y-1/2 text-xs md:text-sm font-semibold text-brand whitespace-nowrap motion-reduce:transform-none"
        >
          With your coach
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4, delay: 1.5 }}
          className="absolute right-0 top-[55%] text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap motion-reduce:transform-none"
        >
          On your own
        </motion.span>

        <span className="absolute left-2 -bottom-1 text-[11px] text-muted-foreground font-medium">
          Month 1
        </span>
        <span className="absolute right-[14%] -bottom-1 text-[11px] text-muted-foreground font-medium">
          Month 6
        </span>
      </div>
    </motion.figure>
  );
}

export function MyMethod() {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="py-20 lg:py-28 bg-background overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="motion-reduce:transform-none"
          >
            <SectionEyebrow>My method</SectionEyebrow>
            <h2
              id={headingId}
              className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-6 leading-tight"
            >
              Why progress comes faster together.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              When your training and food work with your body — not against it — the work you put in actually compounds.
            </p>

            <ul className="space-y-3.5">
              {PILLARS.map((pillar, i) => (
                <li
                  key={pillar}
                  className="flex items-start gap-3 text-base text-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold shrink-0 mt-0.5 tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{pillar}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm font-medium text-foreground mt-8 max-w-xl leading-relaxed">
              Less guesswork. Fewer plateaus. More of the progress you came for.
            </p>
          </motion.div>

          <ProgressGraph />
        </div>
      </div>
    </section>
  );
}
