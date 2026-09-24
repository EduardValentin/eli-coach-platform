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
}

interface GoalWidgetProps {
  presentation: WidgetPresentation;
  goal: Goal | null;
  headingId: string;
  management?: GoalManagement;
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
}: GoalWidgetProps) {
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>(GOAL_TYPES[0]);
  const isCoach = presentation === 'coach';

  const handleConfirmStart = () => {
    management?.onStart(selectedType);
    setShowStartDialog(false);
  };

  const footer =
    isCoach && management ? (
      goal ? (
        <Button
          onClick={management.onEnd}
          variant="outline"
          className="w-full sm:w-auto"
        >
          End goal
        </Button>
      ) : (
        <>
          <Button onClick={() => setShowStartDialog(true)}>Start a goal</Button>
          <ConfirmDialog
            open={showStartDialog}
            onOpenChange={setShowStartDialog}
            title="Start a goal"
            description="Pick the goal this program works toward."
            confirmLabel="Start goal"
            cancelLabel="Cancel"
            onConfirm={handleConfirmStart}
          >
            <Select
              onValueChange={(value) => setSelectedType(value as GoalType)}
              value={selectedType}
            >
              <SelectTrigger aria-label="Goal type">
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
          </ConfirmDialog>
        </>
      )
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
    >
      {goal ? (
        <p className="text-sm text-text-secondary">
          {startedLine(goal.startDate)}
        </p>
      ) : (
        <p className="text-sm text-text-secondary">
          {isCoach
            ? 'No goal set yet.'
            : 'Eli sets your goal when your program is ready.'}
        </p>
      )}
    </PortalWidget>
  );
}
