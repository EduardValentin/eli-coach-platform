import { joinBasePath } from "@eli-coach-platform/config";
import { useEffect, useState, type ReactNode } from "react";

import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/public/paths";

const PAYMENT_METHOD_SESSION_URL = joinBasePath(
  import.meta.env.BASE_URL,
  COACHING_SALES_API_PATHS.paymentMethodSession,
);

type PaymentMethodHandOff = { opening: boolean };

type PaymentMethodFormProps = {
  children: (handOff: PaymentMethodHandOff) => ReactNode;
};

export function PaymentMethodForm({ children }: PaymentMethodFormProps) {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const resetAfterReturn = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setOpening(false);
      }
    };

    window.addEventListener("pageshow", resetAfterReturn);

    return () => {
      window.removeEventListener("pageshow", resetAfterReturn);
    };
  }, []);

  return (
    <form
      action={PAYMENT_METHOD_SESSION_URL}
      className="contents"
      method="post"
      onSubmit={() => setOpening(true)}
    >
      {children({ opening })}
    </form>
  );
}
