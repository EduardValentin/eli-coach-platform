import { useId, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router';
import {
  submitWaitlistEmail,
  WaitlistError,
  WAITLIST_ERROR_MESSAGES,
} from '../../services/waitlistService';
import type { PrototypeWaitlistAvailability } from '../../context/AppContext';
import { cn } from '../ui/utils';

type WaitlistEmailFormProps = {
  availability: PrototypeWaitlistAvailability;
  variant?: 'dark' | 'light';
  onSuccess?: () => void;
};

const CONTACT_EMAIL = 'contact@evoa.fit';
const EVOA_FITNESS_PRIVACY_EMAIL = 'privacy@evoa.fit';

function ErrorContent({ error }: { error: WaitlistError }) {
  if (error.code === 'SERVER_ERROR') {
    return (
      <span>
        Something went wrong on our end. Try again in a moment — or email{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-2 hover:no-underline"
        >
          {CONTACT_EMAIL}
        </a>{' '}
        if it keeps happening.
      </span>
    );
  }
  return <span>{error.message}</span>;
}

export function WaitlistEmailForm({
  availability,
  variant = 'dark',
  onSuccess,
}: WaitlistEmailFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<WaitlistError | null>(null);
  const errorId = useId();
  const isClosed = availability === 'closed';
  const shouldReduceMotion = useReducedMotion() === true;
  const loadingLabel = isClosed
    ? 'Joining the notify list'
    : 'Joining the list';

  const isDark = variant === 'dark';

  const inputClasses = cn(
    'h-14 w-full rounded-full border px-6 text-base outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/30',
    {
      'border-surface-base/20 bg-surface-base/10 text-surface-inverted-foreground placeholder:text-surface-inverted-foreground/50 backdrop-blur-md':
        isDark,
      'border-control-border-soft bg-card text-foreground placeholder:text-placeholder-soft':
        !isDark,
    },
  );

  const buttonClasses =
    'h-14 rounded-full bg-brand text-brand-foreground font-semibold px-8 hover:bg-waitlist-button-hover active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitWaitlistEmail(email);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C81D6B', '#C13852', '#00796B', '#FFD700'],
        disableForReducedMotion: true,
      });
      setIsSubmitted(true);
      onSuccess?.();
    } catch (err) {
      if (err instanceof WaitlistError) {
        setError(err);
      } else {
        setError(new WaitlistError('SERVER_ERROR', WAITLIST_ERROR_MESSAGES.SERVER_ERROR));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {isSubmitted ? (
          <motion.div
            key="success"
            initial={
              shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
            }
            className="flex flex-col items-center gap-3 py-2"
          >
            <CheckCircle2
              aria-hidden="true"
              size={36}
              className="text-brand-secondary"
              strokeWidth={1.5}
            />
            <p
              className={cn('font-serif text-lg font-medium', {
                'text-surface-inverted-foreground': isDark,
                'text-foreground': !isDark,
              })}
            >
              You're in. Keep an eye on your inbox.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            exit={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.95 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="flex flex-col gap-3"
          >
            <p
              className={cn('text-sm leading-snug', {
                'text-surface-inverted-foreground/70': isDark,
                'text-copy-muted': !isDark,
              })}
            >
              By joining, you agree to Evoa Fitness emails about coaching,
              content and offers. Opt out anytime at{' '}
              <a
                className="font-medium underline underline-offset-2 hover:no-underline"
                href={`mailto:${EVOA_FITNESS_PRIVACY_EMAIL}`}
              >
                {EVOA_FITNESS_PRIVACY_EMAIL}
              </a>
              .{' '}
              <Link
                className="font-medium underline underline-offset-2 hover:no-underline"
                to="/privacy"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="block min-w-0 flex-1">
                <span className="sr-only">Email address</span>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                  className={inputClasses}
                  aria-invalid={error !== null}
                  aria-describedby={error ? errorId : undefined}
                />
              </label>
              <button
                aria-label={isSubmitting ? loadingLabel : undefined}
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className={buttonClasses}
              >
                {isSubmitting ? (
                  shouldReduceMotion ? (
                    <span>{loadingLabel}…</span>
                  ) : (
                    <Loader2
                      aria-hidden="true"
                      size={20}
                      className="animate-spin mx-auto"
                    />
                  )
                ) : (
                  isClosed ? 'Notify me' : 'Join the list'
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            id={errorId}
            role="alert"
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: -4 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion ? undefined : { opacity: 0, y: -4 }
            }
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            className={cn(
              'mt-3 flex items-start justify-center gap-2 text-sm leading-snug',
              {
                'text-destructive-on-inverted': isDark,
                'text-destructive': !isDark,
              },
            )}
          >
            <AlertCircle
              size={16}
              aria-hidden="true"
              className="shrink-0 mt-0.5"
            />
            <p className="text-left">
              <ErrorContent error={error} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
