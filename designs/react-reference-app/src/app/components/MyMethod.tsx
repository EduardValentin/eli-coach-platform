import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { SectionEyebrow } from './SectionEyebrow';

const PILLARS = [
  'You’ll learn how your body works, so your training makes sense.',
  'Whether you have an active menstrual cycle or not, your plan is still personalized around your body, energy, lifestyle, and goals.',
  'You’ll get weekly support, workout reviews, and plan adjustments based on your progress, energy, and schedule.',
];

function ProgressGraph() {
  const titleId = useId();
  const descId = useId();
  const [isVisible, setIsVisible] = useState(false);

  const withCoachPath = 'M 40 200 C 100 180, 180 70, 360 50';
  const aloneePath = 'M 40 200 C 130 195, 240 145, 360 120';

  return (
    <motion.figure
      data-visible={isVisible || undefined}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setIsVisible(true)}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="group bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl motion-reduce:transform-none"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <figcaption className="mb-5">
        <p className="text-public-my-method-overline uppercase tracking-section-eyebrow text-muted-foreground font-bold mb-1">
          Progress, side by side
        </p>
        <h3
          id={titleId}
          className="text-public-my-method-figure-heading font-serif font-medium text-foreground"
        >
          Faster results, fewer plateaus.
        </h3>
        <p id={descId} className="sr-only">
          A line graph comparing two progress curves over six months. The
          solid brand-colored curve labeled "With your coach" climbs steeper
          and reaches a higher point than the dashed gray curve labeled "On
          your own".
        </p>
      </figcaption>

      <div className="relative w-full aspect-[5/3]">
        <svg
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <line x1="40" y1="220" x2="360" y2="220" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 4" />
          <line x1="40" y1="20" x2="40" y2="220" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 4" />

          {/* "On your own" — dashed line revealed left-to-right via clip-path */}
          <path
            d={aloneePath}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="[clip-path:inset(-4px_100%_-4px_-4px)] group-data-[visible]:[clip-path:inset(-4px_0%_-4px_-4px)] transition-[clip-path] duration-1000 ease-in-out delay-[600ms]"
          />

          {/* "With your coach" — solid line drawn via strokeDashoffset */}
          <path
            d={withCoachPath}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="500"
            className="[stroke-dashoffset:500] group-data-[visible]:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-1000 ease-in-out delay-[800ms]"
          />

          <circle
            cx="40" cy="200" r="5"
            fill="var(--background)" stroke="var(--brand)" strokeWidth="2"
            className="opacity-0 scale-0 group-data-[visible]:opacity-100 group-data-[visible]:scale-100 origin-[40px_200px] transition-[opacity,transform] duration-300 ease-in-out delay-500"
          />
          <circle
            cx="360" cy="50" r="6"
            fill="var(--background)" stroke="var(--brand)" strokeWidth="2.5"
            className="opacity-0 scale-0 group-data-[visible]:opacity-100 group-data-[visible]:scale-100 origin-[360px_50px] transition-[opacity,transform] duration-300 ease-in-out delay-[1800ms]"
          />
          <circle
            cx="360" cy="120" r="5"
            fill="var(--background)" stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="2"
            className="opacity-0 scale-0 group-data-[visible]:opacity-100 group-data-[visible]:scale-100 origin-[360px_120px] transition-[opacity,transform] duration-300 ease-in-out delay-[1600ms]"
          />
        </svg>

        <span className="absolute right-0 top-[14%] -translate-y-1/2 text-xs md:text-sm font-semibold text-brand whitespace-nowrap opacity-0 group-data-[visible]:opacity-100 transition-opacity duration-[400ms] ease-in-out delay-[1900ms]">
          With your coach
        </span>
        <span className="absolute right-0 top-[55%] text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap opacity-0 group-data-[visible]:opacity-100 transition-opacity duration-[400ms] ease-in-out delay-[1700ms]">
          On your own
        </span>

        <span className="absolute left-2 -bottom-1 text-public-my-method-axis-label text-muted-foreground font-medium">
          Month 1
        </span>
        <span className="absolute right-[14%] -bottom-1 text-public-my-method-axis-label text-muted-foreground font-medium">
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
              className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-8 leading-public-my-method-heading"
            >
              Why progress is easier with support.
            </h2>

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
          </motion.div>

          <ProgressGraph />
        </div>
      </div>
    </section>
  );
}
