import { Alert, AlertAction } from "@eli-coach-platform/ui/primitives";

export function UnavailableSlots(props: { onRetry: () => void }) {
  return (
    <Alert
      action={<AlertAction onClick={props.onRetry}>Try again</AlertAction>}
    >
      <p>We couldn&apos;t load the open times just now.</p>
    </Alert>
  );
}
