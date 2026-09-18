import { Alert, Button } from "@eli-coach-platform/ui/primitives";

export function UnavailableSlots(props: { onRetry: () => void }) {
  return (
    <>
      <Alert>
        <p>We couldn&apos;t load the open times just now.</p>
      </Alert>
      <Button
        className="mt-6 w-full"
        label="strong"
        onClick={props.onRetry}
        type="button"
      >
        Try again
      </Button>
    </>
  );
}
