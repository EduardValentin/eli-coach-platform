import { DeadEndPanel } from "~/shared/design-system/layout";
import { Button } from "~/shared/design-system/primitives";
import { CloudOff } from "lucide-react";

export function ResourcesUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full" data-parity-root="ResourcesUnavailable">
      <DeadEndPanel
        action={
          <Button onClick={onRetry} size="md" type="button" variant="outline">
            Try again
          </Button>
        }
        description="Something went wrong on our side. Try again in a moment."
        icon={<CloudOff aria-hidden="true" size={36} />}
        title="Resources didn’t load"
      />
    </div>
  );
}
