import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { submitEmail } from '../../services/waitlistService';

type WaitlistEmailFormProps = {
  variant?: 'dark' | 'light';
  onSuccess?: () => void;
};

export function WaitlistEmailForm({ variant = 'dark', onSuccess }: WaitlistEmailFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = variant === 'dark';

  const inputClasses = isDark
    ? 'h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 px-6 text-base focus:border-[#C81D6B] focus:ring-2 focus:ring-[#C81D6B]/30 outline-none transition-all w-full'
    : 'h-14 rounded-full bg-white border border-neutral-200 text-[#121212] placeholder:text-neutral-400 px-6 text-base focus:border-[#C81D6B] focus:ring-2 focus:ring-[#C81D6B]/30 outline-none transition-all w-full';

  const buttonClasses = isDark
    ? 'h-14 rounded-full bg-[#C81D6B] text-white font-semibold px-8 hover:bg-[#a61757] active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
    : 'h-14 rounded-full bg-[#C81D6B] text-white font-semibold px-8 hover:bg-[#a61757] active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitEmail(email);
      setIsSubmitted(true);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C81D6B', '#FF4D6D', '#00796B', '#FFD700'],
      });

      toast.success("You're on the list. We'll be in touch soon.");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              type="email"
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

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`text-sm mt-3 text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
