import { toast } from "~/shared/design-system/toast";
import { afterEach } from "vitest";

// Since sonner 2.0.7 a newly mounted Toaster replays every toast still active in
// the module-level store, so toasts fired by one test would reappear in the next.
afterEach(() => {
  toast.dismiss();
});
