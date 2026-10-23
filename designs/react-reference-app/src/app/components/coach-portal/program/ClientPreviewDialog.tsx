import { ClientProgramBody } from '../../program-view/ClientProgramBody';
import type { ProgramView } from '../../program-view/programView';
import { PhoneFrame } from '../../PhoneFrame';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';

type ClientPreviewDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; view: ProgramView };

export function ClientPreviewDialog({ open, onOpenChange, view }: ClientPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview as client</DialogTitle>
          <DialogDescription>This is how the draft looks on the client's phone.</DialogDescription>
        </DialogHeader>
        <PhoneFrame className="w-[390px] max-w-full mx-auto">
          <div className="max-h-[720px] overflow-y-auto px-4 pt-12 pb-4">
            <ClientProgramBody view={view} />
          </div>
        </PhoneFrame>
      </DialogContent>
    </Dialog>
  );
}
