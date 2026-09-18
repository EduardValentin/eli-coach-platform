import { Button } from "@eli-coach-platform/ui/primitives";

import {
  BOOKING_ALERT_CLASS_NAME,
  BOOKING_PRIMARY_ACTION_CLASS_NAME,
} from "./booking-classes";

export function UnavailableSlots(props: { onRetry: () => void }) {
  return (
    <>
      <p className={BOOKING_ALERT_CLASS_NAME} role="alert">
        We couldn&apos;t load the open times just now.
      </p>
      <Button
        className={BOOKING_PRIMARY_ACTION_CLASS_NAME}
        onClick={props.onRetry}
        type="button"
      >
        Try again
      </Button>
    </>
  );
}
