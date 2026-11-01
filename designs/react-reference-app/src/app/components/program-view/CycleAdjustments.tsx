import { useId } from 'react';
import type { CycleAdjustment, CycleRule } from '../../domain/program';
import { cycleAdjustmentText } from '../../domain/programTemplates';
import { cn } from '../ui/utils';

type ActiveRule = CycleRule & { adjustment: Exclude<CycleAdjustment, 'none'> };

export function activeCycleRules(rules: readonly CycleRule[]): ActiveRule[] {
  return rules.filter((rule): rule is ActiveRule => rule.adjustment !== 'none' && rule.symptomPeriod.trim() !== '');
}

type CycleAdjustmentsProps = { rules: readonly CycleRule[]; labelClassName: string; className?: string };

export function CycleAdjustments({ rules, labelClassName, className }: CycleAdjustmentsProps) {
  const labelId = useId();
  const active = activeCycleRules(rules);
  if (active.length === 0) return null;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <p id={labelId} className={labelClassName}>
        Your adjustments
      </p>
      <ul aria-labelledby={labelId} className="list-disc space-y-1 pl-5 marker:text-text-label">
        {active.map(rule => (
          <li key={rule.id}>
            <span className="font-semibold text-text-primary">{`${rule.symptomPeriod.trim()}:`}</span> {cycleAdjustmentText(rule.adjustment)}
          </li>
        ))}
      </ul>
    </div>
  );
}
