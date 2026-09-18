import { Button } from "@eli-coach-platform/ui/primitives";

export function UnavailableSlots(props: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-copy-muted">
        We couldn&apos;t load the open times just now.
      </p>
      <Button onClick={props.onRetry} size="lg" type="button">
        Try again
      </Button>
    </div>
  );
}
