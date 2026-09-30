import { UserX } from 'lucide-react';
import { DeadEndPanel } from '../ErrorPage';

export function ClientsUnavailable() {
  return (
    <div className="w-full" data-parity-root="ClientsUnavailable">
      <DeadEndPanel
        icon={UserX}
        title="Clients unavailable"
        description="Your clients could not be loaded. Try again in a moment."
      />
    </div>
  );
}
