import { useId } from 'react';
import { motion } from 'motion/react';
import {
  CalendarCheck,
  Check,
  Sparkles,
  Timer,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

interface FeatureRowProps {
  eyebrow: string;
  title: string;
  copy: string;
  cues: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
}

function FeatureRow({
  eyebrow,
  title,
  copy,
  cues,
  mockup,
  reverse = false,
}: FeatureRowProps) {
  const titleId = useId();
  const cuesId = useId();

  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={cuesId}
      className={`flex flex-col ${
        reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
      } items-center gap-10 lg:gap-16`}
    >
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full lg:flex-1 motion-reduce:transform-none"
      >
        {mockup}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full lg:flex-1 motion-reduce:transform-none"
      >
        <p className="text-brand uppercase tracking-[0.2em] text-xs md:text-sm font-sans font-semibold mb-4">
          {eyebrow}
        </p>
        <h3
          id={titleId}
          className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-5 leading-tight"
        >
          {title}
        </h3>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
          {copy}
        </p>
        <ul id={cuesId} className="space-y-3">
          {cues.map((cue) => (
            <li
              key={cue}
              className="flex items-center gap-3 text-sm md:text-base text-foreground"
            >
              <span
                aria-hidden="true"
                className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand shrink-0"
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <span>{cue}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </article>
  );
}

function MessagingMockup() {
  return (
    <div className="relative w-full max-w-md lg:max-w-none mx-auto lg:aspect-[4/3] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-brand" />
          <span className="text-sm font-semibold text-foreground">Messages</span>
          <span className="text-[10px] bg-brand text-brand-foreground rounded-full px-2 py-0.5 font-bold tabular-nums">
            1
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          Today
        </span>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand to-brand/60 shrink-0" />
          <div className="max-w-[75%] px-4 py-2.5 bg-brand/10 text-foreground rounded-2xl rounded-bl-sm text-sm leading-snug">
            How did Tuesday’s session feel? Want to push volume this week?
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[70%] px-4 py-2.5 bg-muted text-foreground rounded-2xl rounded-br-sm text-sm leading-snug">
            Felt strong. Let’s go.
          </div>
        </div>

        <div className="mt-2 border-2 border-brand/30 bg-brand/5 rounded-2xl rounded-bl-sm p-4 max-w-[90%]">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck
              size={14}
              className="text-brand"
              aria-hidden="true"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
              Check-in proposed
            </span>
          </div>
          <p className="text-sm text-foreground mb-3">
            Fri 9:00 AM · 20 min 1:1 call
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-brand text-brand-foreground rounded-full text-xs font-semibold">
              Approve
            </span>
            <span className="px-3 py-1 bg-card border border-border text-foreground rounded-full text-xs font-semibold">
              Reschedule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkoutMockup() {
  return (
    <div className="relative w-full max-w-md lg:max-w-none mx-auto lg:aspect-[4/3] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Week 3 · Day 2
          </p>
          <h4 className="text-base font-semibold text-foreground mt-0.5">
            Lower Strength
          </h4>
        </div>
        <div className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 rounded-full px-3 py-1.5">
          <Timer size={12} className="text-brand" aria-hidden="true" />
          <span className="text-xs font-mono font-semibold text-brand tabular-nums">
            01:24
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold shrink-0 tabular-nums">
            01
          </div>
          <div className="flex-1">
            <h5 className="text-sm font-semibold text-foreground leading-tight">
              Goblet Squat
            </h5>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                Kettlebell
              </span>
              <span className="text-[10px] bg-brand/10 text-brand rounded-full px-2 py-0.5 font-semibold">
                Quads
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-brand-foreground shrink-0">
              <Check size={11} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-xs text-muted-foreground w-12">Set 1</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              8 reps · 16 kg
            </span>
          </div>

          <div className="flex items-center gap-3 py-2 px-3 rounded-lg border-2 border-brand bg-brand/5">
            <span className="block w-5 h-5 rounded-full border-2 border-brand bg-card shrink-0" />
            <span className="text-xs font-semibold text-foreground w-12">
              Set 2
            </span>
            <div className="flex items-center gap-1.5">
              <div className="bg-card border border-border rounded-md px-2 py-1 text-xs font-mono tabular-nums text-foreground">
                8
              </div>
              <span className="text-[10px] text-muted-foreground">reps</span>
              <div className="bg-card border border-border rounded-md px-2 py-1 text-xs font-mono tabular-nums text-foreground ml-1">
                16
              </div>
              <span className="text-[10px] text-muted-foreground">kg</span>
            </div>
          </div>

          {[3, 4].map((n) => (
            <div
              key={n}
              className="flex items-center gap-3 py-2 px-3 rounded-lg"
            >
              <span className="block w-5 h-5 rounded-full border border-border shrink-0" />
              <span className="text-xs text-muted-foreground w-12">
                Set {n}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                — · —
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="flex items-center justify-center w-full">
      <PhoneFrame
        statusBarVariant="dark"
        className="w-full max-w-[280px] aspect-[9/16]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-brand/15 via-background to-background pt-14 px-5 pb-6">
          <p className="text-[10px] text-foreground/70 uppercase tracking-widest text-center mb-3 font-semibold">
            Wednesday · April 17
          </p>
          <div className="grid grid-cols-4 gap-3.5">
            {[...Array(12)].map((_, i) => {
              const isEli = i === 5;
              if (isEli) {
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-brand to-brand/70 shadow-lg flex items-center justify-center">
                      <span className="text-brand-foreground font-serif text-lg leading-none">
                        E
                      </span>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-brand-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background tabular-nums">
                        1
                      </span>
                    </div>
                    <span className="text-[8px] text-foreground font-medium">
                      Eli Fitness
                    </span>
                  </div>
                );
              }
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-2xl bg-muted/70" />
                  <span className="block w-8 h-1 rounded-full bg-muted" />
                </div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="absolute top-12 left-3 right-3 bg-card/95 backdrop-blur border border-border rounded-2xl p-3 shadow-xl z-40 motion-reduce:transform-none"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand/70 flex items-center justify-center shrink-0">
              <span className="text-brand-foreground font-serif text-sm leading-none">
                E
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  Eli Fitness
                </span>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  now
                </span>
              </div>
              <p className="text-xs text-foreground mt-0.5 leading-tight">
                Today’s workout is ready. Let’s go.
              </p>
            </div>
          </div>
        </motion.div>
      </PhoneFrame>
    </div>
  );
}

function AdaptivePlanMockup() {
  const volume = [40, 55, 70, 62, 78, 58, 82, 70, 66, 52, 48, 58];
  const luteal = volume.length - 3;

  return (
    <div className="relative w-full max-w-md lg:max-w-none mx-auto lg:aspect-[4/3] rounded-2xl border border-border bg-card shadow-xl overflow-hidden p-5 flex flex-col">
      <div className="flex items-center gap-1.5 mb-4">
        {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((w, i) => {
          const active = i === 2;
          return (
            <div
              key={w}
              className={`flex-1 px-2 py-1.5 rounded-lg text-center text-[11px] font-semibold ${
                active
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground'
              }`}
            >
              {w}
            </div>
          );
        })}
      </div>

      <div className="flex items-stretch gap-3 mb-4">
        <div className="flex-1 border-2 border-brand/30 bg-brand/5 rounded-2xl rounded-bl-sm p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={12} className="text-brand" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
              Note from Eli
            </span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            Your last two sessions ran long and the weights felt heavy. Taking
            Thursday as a rest day — come back fresh.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-1.5 shrink-0 border border-border rounded-xl bg-muted/40 px-2.5 py-2 w-[92px]">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            Spotted
          </span>
          <div className="flex items-center gap-1.5">
            <TrendingUp
              size={11}
              className="text-brand shrink-0"
              aria-hidden="true"
            />
            <span className="text-[10px] text-foreground font-semibold tabular-nums">
              Rest +40s
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown
              size={11}
              className="text-brand shrink-0"
              aria-hidden="true"
            />
            <span className="text-[10px] text-foreground font-semibold tabular-nums">
              Load −5 kg
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-end gap-1 h-10">
          {volume.map((h, i) => {
            const isLuteal = i >= luteal;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${
                  isLuteal ? 'bg-brand' : 'bg-muted-foreground/30'
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            Weekly volume
          </span>
          <span className="text-[9px] text-muted-foreground">
            12-week rolling
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlatformShowcase() {
  return (
    <section
      aria-labelledby="platform-showcase-heading"
      className="py-20 lg:py-32 bg-background overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-3xl mb-16 lg:mb-24 motion-reduce:transform-none"
        >
          <p className="text-muted-foreground uppercase tracking-[0.2em] text-sm font-sans mb-6">
            Your training, together
          </p>
          <h2
            id="platform-showcase-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-foreground leading-tight mb-6"
          >
            Built around the two of you
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Not a plan in a PDF. A place where your coach can see how it’s
            going and change things when they need to change.
          </p>
        </motion.div>

        <div className="flex flex-col gap-20 lg:gap-32">
          <FeatureRow
            eyebrow="Stay close"
            title="A coach who’s a tap away"
            copy="Message Eli whenever you need to. Book a check-in or a one-on-one from the same place you train — same day, not next week."
            cues={[
              'Chat and voice notes in one thread',
              'Request or accept check-ins in a tap',
              'Reschedule without the back-and-forth',
            ]}
            mockup={<MessagingMockup />}
          />

          <FeatureRow
            reverse
            eyebrow="Train in sync"
            title="Every set, every rep, in one place"
            copy="Every workout Eli builds for you lives in the app. Log your sets and reps as you lift, and she sees exactly what you did."
            cues={[
              'Live set logging with a rest timer',
              'Swap exercises when something isn’t working',
              'She sees exactly what you lifted',
            ]}
            mockup={<WorkoutMockup />}
          />

          <FeatureRow
            eyebrow="In your pocket"
            title="On your phone, like any app"
            copy="Add it to your home screen in two taps. Workouts, messages from Eli, and reminders show up right next to everything else on your phone."
            cues={[
              'Add it to your home screen in two taps',
              'Push notifications for workouts and messages',
              'One tap to today’s workout',
            ]}
            mockup={<PhoneMockup />}
          />

          <FeatureRow
            reverse
            eyebrow="Paying attention"
            title="She notices before you ask"
            copy="Long rests between sets. Weights that felt heavier than they should. Eli reads through your logs, spots the pattern, and drops in a rest day before you have to bring it up."
            cues={[
              'She reviews every session you log',
              'Cycle, recovery, and performance — all in the picture',
              'A short note explains what changed and why',
            ]}
            mockup={<AdaptivePlanMockup />}
          />
        </div>
      </div>
    </section>
  );
}
