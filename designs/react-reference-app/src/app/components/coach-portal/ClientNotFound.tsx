import { UserX } from 'lucide-react';
import { DeadEndPanel } from '../ErrorPage';

export function ClientNotFound() {
  return (
    <div className="w-full" data-parity-root="ClientNotFound">
      <DeadEndPanel
        icon={UserX}
        title="Client not found"
        description="This client is not on your roster, or the link is incorrect."
      />
    </div>
  );
}
