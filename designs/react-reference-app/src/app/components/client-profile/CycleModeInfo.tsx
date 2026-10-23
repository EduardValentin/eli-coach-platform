import { Info } from 'lucide-react';
import { CYCLE_MODE_DEFINITIONS, CYCLE_MODE_INFO_LABEL } from '../../utils/journeyLabels';
import { IconHint } from '../IconHint';

export function CycleModeInfo() {
  return (
    <IconHint
      label={CYCLE_MODE_INFO_LABEL}
      icon={<Info aria-hidden="true" size={16} />}
      className="-my-1.5"
      parity="cycle-mode-info"
      contentParityRoot="CycleModeTooltip"
    >
      <dl className="space-y-1">
        {CYCLE_MODE_DEFINITIONS.map(({ term, meaning }) => (
          <div key={term}>
            <dt className="inline font-semibold">{term}</dt>{' '}
            <dd className="inline">— {meaning}</dd>
          </div>
        ))}
      </dl>
    </IconHint>
  );
}
