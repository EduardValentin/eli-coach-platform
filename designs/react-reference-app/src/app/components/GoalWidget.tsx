import { useState } from 'react';
import { parseISO } from 'date-fns';
import { Target } from 'lucide-react';
import {
  GOAL_TYPES,
  type Goal,
  type GoalType,
} from '../context/TrainingContext';
import { formatJourneyDate } from '../utils/journeyLabels';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface GoalManagement {
  onStart: (type: GoalType) => void;
  onEnd: () => void;
  suggestedType?: GoalType;
}

interface GoalWidgetProps {
  presentation: WidgetPresentation;
  goal: Goal | null;
  headingId: string;
  management?: GoalManagement;
  emptyMessage?: string;
  className?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function startedLine(startDate: string): string {
  const value = ISO_DATE.test(startDate)
    ? formatJourneyDate(parseISO(startDate))
    : startDate;
  return `Started ${value}`;
}

export function GoalWidget({
  presentation,
  goal,
  headingId,
  management,
  emptyMessage,
  className,
}: GoalWidgetProps) {
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>(GOAL_TYPES[0]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const isCoach = presentation === 'coach';

  const handleOpenStart = () => {
    setSelectedType(management?.suggestedType ?? GOAL_TYPES[0]);
    setIsEditingStart(true);
  };

  const handleConfirmStart = () => {
    management?.onStart(selectedType);
    setIsEditingStart(false);
  };

  const handleCancelStart = () => {
    setIsEditingStart(false);
  };

  const handleConfirmEnd = () => {
    management?.onEnd();
    setShowEndDialog(false);
  };

  const footer =
    isCoach && management ? (
      goal ? (
        <>
          <Button
            onClick={() => setShowEndDialog(true)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            End goal
          </Button>
          <ConfirmDialog
            open={showEndDialog}
            onOpenChange={setShowEndDialog}
            title="End this goal?"
            description="Her plan keeps running. You can start a new goal afterwards."
            confirmLabel="End goal"
            cancelLabel="Cancel"
            onConfirm={handleConfirmEnd}
          />
        </>
      ) : !isEditingStart ? (
        <Button onClick={handleOpenStart}>Start a goal</Button>
      ) : undefined
    ) : undefined;

  return (
    <PortalWidget
      presentation={presentation}
      title="Goal"
      icon={
        <Target aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      hero={goal?.type}
      headingId={headingId}
      footer={footer}
      className={className}
    >
      {goal ? (
        <p className="text-sm text-text-secondary">
          {startedLine(goal.startDate)}
        </p>
      ) : isCoach && management && isEditingStart ? (
        <div>
          <Select
            onValueChange={(value) => setSelectedType(value as GoalType)}
            value={selectedType}
          >
            <SelectTrigger aria-label="Goal type" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleConfirmStart}>Start goal</Button>
            <Button variant="ghost" onClick={handleCancelStart}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          {emptyMessage ?? 'No goal set yet.'}
        </p>
      )}
    </PortalWidget>
  );
}
