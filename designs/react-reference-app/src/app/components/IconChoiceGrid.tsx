import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './ui/utils';

export type IconChoice<Key extends string> = { key: Key; label: string; Icon: LucideIcon };

type IconChoiceGridProps<Key extends string> = Omit<ComponentProps<'ul'>, 'onChange'> & {
  options: readonly IconChoice<Key>[];
  value: Key;
  onChange: (key: Key) => void;
  'aria-labelledby': string;
};

export function IconChoiceGrid<Key extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: IconChoiceGridProps<Key>) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} {...rest}>
      {options.map(({ key, label, Icon }) => (
        <li key={key}>
          <button
            type="button"
            aria-label={label}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={cn('flex size-9 items-center justify-center rounded-compact border transition-colors', {
              'border-primary bg-primary-soft text-primary': value === key,
              'border-border text-text-secondary hover:bg-surface-muted': value !== key,
            })}
          >
            <Icon size={18} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
