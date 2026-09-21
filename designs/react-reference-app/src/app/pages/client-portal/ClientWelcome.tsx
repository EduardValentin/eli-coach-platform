import { useNavigate } from 'react-router';
import { Button, cn } from '../../components/ThemeButton';
import { cardVariants } from '../../components/ui/card';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { JourneySex } from '../../domain/journey';

const FORM_INTRO: Record<JourneySex, string> = {
  female:
    'But first, I need to get to know you. Your next step is a short form in five parts — it takes about 15 minutes — covering your goals, your training experience, your health, your cycle, your nutrition and your measurements.',
  male:
    'But first, I need to get to know you. Your next step is a short form in four parts — it takes about 15 minutes — covering your goals, your training experience, your health, your nutrition and your measurements.',
};

const OPENING = "I'm really glad you're here.";

const TOGETHER =
  'From now on, we work together — with a plan built around your goals and what your body actually needs.';

const PACE =
  'You can pause and come back anytime — your answers are saved as you go. Try not to leave it too long: I can only start building your program once I have your answers.';

const CLOSING =
  "Once you've completed it, I'll go through everything and build your program. You'll find it right here in your account.";

export function ClientWelcome() {
  const navigate = useNavigate();
  const { demoJourney, markWelcomeSeen } = useClientJourneys();

  const start = () => {
    markWelcomeSeen(demoJourney.callId);
    navigate('/portal/onboarding');
  };

  return (
    <main
      aria-label="Welcome"
      className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-12 sm:px-6 lg:py-20"
    >
      <div
        className={cn(
          cardVariants({ variant: 'panel' }),
          'w-full max-w-reading px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16',
        )}
      >
        <h1 className="font-serif text-display-sm tracking-tight text-text-primary lg:text-display-md">
          Welcome to Evoa Fitness, {demoJourney.identity.firstName}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-text-primary">{OPENING}</p>

        <div className="mt-4 grid gap-4 text-base leading-relaxed text-text-secondary">
          <p>{TOGETHER}</p>
          <p>{FORM_INTRO[demoJourney.identity.sex]}</p>
          <p>{PACE}</p>
          <p>{CLOSING}</p>
        </div>

        <Button
          className="mt-10"
          elevation="raised"
          onClick={start}
          size="lg"
          width="full-below-sm"
        >
          Let's get started
        </Button>
      </div>
    </main>
  );
}
