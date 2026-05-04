import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  submitEmail,
  submitNotifyEmail,
  useWaitlistSpots,
  WaitlistError,
  WAITLIST_ERROR_MESSAGES,
} from '../../services/waitlistService';

type WaitlistEmailFormProps = {
  variant?: 'dark' | 'light';
  onSuccess?: () => void;
};

const CONTACT_EMAIL = 'contact@elipersonaltrainer.com';

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

export function WaitlistEmailForm({ variant = 'dark', onSuccess }: WaitlistEmailFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<WaitlistError | null>(null);
  const spots = useWaitlistSpots();
  const isFull = spots <= 0;

  const isDark = variant === 'dark';

  const inputClasses = isDark
    ? 'h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 px-6 text-base focus:border-[#C81D6B] focus:ring-2 focus:ring-[#C81D6B]/30 outline-none transition-all w-full'
    : 'h-14 rounded-full bg-white border border-neutral-200 text-[#121212] placeholder:text-neutral-400 px-6 text-base focus:border-[#C81D6B] focus:ring-2 focus:ring-[#C81D6B]/30 outline-none transition-all w-full';

  const buttonClasses = isDark
    ? 'h-14 rounded-full bg-[#C81D6B] text-white font-semibold px-8 hover:bg-[#a61757] active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
    : 'h-14 rounded-full bg-[#C81D6B] text-white font-semibold px-8 hover:bg-[#a61757] active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

  const errorColor = isDark ? 'text-destructive-on-inverted' : 'text-destructive';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isFull) {
        await submitNotifyEmail(email);
      } else {
        await submitEmail(email);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C81D6B', '#FF4D6D', '#00796B', '#FFD700'],
        });
      }
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 py-2"
          >
            <CheckCircle2
              size={36}
              className="text-[#00796B]"
              strokeWidth={1.5}
            />
            <p className={`font-serif text-lg font-medium ${isDark ? 'text-white' : 'text-[#121212]'}`}>
              You're in. Keep an eye on your inbox.
            </p>
          </motion.div>
        ) : isFull ? (
          <motion.form
            key="full"
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row gap-3"
          >
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
                aria-label="Email address"
                aria-invalid={error !== null}
                aria-describedby={error ? 'waitlist-error' : undefined}
              />
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className={buttonClasses}
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : (
                  'Notify me'
                )}
              </button>
          </motion.form>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col md:flex-row gap-3"
          >
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
              aria-label="Email address"
              aria-invalid={error !== null}
              aria-describedby={error ? 'waitlist-error' : undefined}
            />
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className={buttonClasses}
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : (
                'Join the list'
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            id="waitlist-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`mt-3 flex items-start justify-center gap-2 text-sm leading-snug ${errorColor}`}
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
