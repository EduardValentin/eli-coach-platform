import { useId, useState } from 'react';
import { Button } from '../../ThemeButton';
import { Checkbox } from '../../ui/checkbox';
import {
  ONBOARDING_CARD_CLASS,
  ONBOARDING_HEADING_CLASS,
  ONBOARDING_INTRO_CLASS,
} from './onboardingCard';

type ConsentCardProps = {
  title: string;
  intro: string;
  statement: string;
  headingRef: (node: HTMLHeadingElement | null) => void;
  onAgree: () => void;
  onBack: (() => void) | null;
};

const MISSING_CONSENT = 'Tick the box to carry on.';

export function ConsentCard({
  title,
  intro,
  statement,
  headingRef,
  onAgree,
  onBack,
}: ConsentCardProps) {
  const checkboxId = useId();
  const errorId = useId();
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const continueOn = () => {
    if (!agreed) {
      setProblem(MISSING_CONSENT);
      return;
    }

    onAgree();
  };

  return (
    <section aria-labelledby="onboarding-consent-heading" className={ONBOARDING_CARD_CLASS}>
      <h2
        className={ONBOARDING_HEADING_CLASS}
        id="onboarding-consent-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h2>
      <p className={ONBOARDING_INTRO_CLASS}>{intro}</p>

      <div className="mt-7 flex items-start gap-3 rounded-card border border-neutral-100 bg-surface-quiet/60 p-4">
        <Checkbox
          aria-describedby={problem ? errorId : undefined}
          aria-invalid={problem !== null}
          checked={agreed}
          className="mt-0.5"
          id={checkboxId}
          onCheckedChange={(checked) => {
            setAgreed(checked === true);
            setProblem(null);
          }}
        />
        <label
          className="text-sm leading-relaxed text-text-primary"
          htmlFor={checkboxId}
        >
          {statement}
        </label>
      </div>

      {problem && (
        <p className="mt-2 text-sm text-destructive" id={errorId} role="alert">
          {problem}
        </p>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button onClick={onBack} type="button" variant="outline" width="full-below-sm">
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={continueOn} type="button" width="full-below-sm">
          Continue
        </Button>
      </div>
    </section>
  );
}
