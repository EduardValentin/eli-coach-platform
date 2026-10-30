import { SignInButton } from "@clerk/react-router";
import { DeadEndPage } from "~/shared/design-system/layout";
import { Button } from "~/shared/design-system/primitives";
import { KeyRound, RotateCcw } from "lucide-react";

type SignInFailedPageProps = {
  continuePath: string;
};

export function SignInFailedPage({ continuePath }: SignInFailedPageProps) {
  return (
    <DeadEndPage
      description="Your account couldn't be set up, so we signed you out again. Nothing was lost — give it another go."
      eyebrow="Sign-in failed"
      icon={<KeyRound aria-hidden="true" size={36} />}
      landmarkLabel="Error"
      title="We couldn't finish signing you in"
    >
      <SignInButton fallbackRedirectUrl={continuePath}>
        <Button size="lg" variant="inverted">
          Try Again
          <RotateCcw aria-hidden="true" size={18} />
        </Button>
      </SignInButton>
    </DeadEndPage>
  );
}
