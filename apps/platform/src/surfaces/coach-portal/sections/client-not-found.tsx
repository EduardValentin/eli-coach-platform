import { DeadEndPanel } from "@eli-coach-platform/ui/layout";
import { UserX } from "lucide-react";

export function ClientNotFound() {
  return (
    <div className="w-full" data-parity-root="ClientNotFound">
      <DeadEndPanel
        description="This client is not on your roster, or the link is incorrect."
        icon={<UserX aria-hidden="true" size={36} />}
        title="Client not found"
      />
    </div>
  );
}
