import { useId, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { InlineProblem } from '../../ui/inline-problem';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { ChangedMark } from './ChangedMark';
import { COUNT_PROBLEM, parseCount } from './rowFields';

/** `compact` tightens the field below the set-line container width, for four figures across a phone. */
type FieldDensity = 'default' | 'compact';

const DENSITY_CLASS: Record<FieldDensity, string> = {
  default: '',
  compact: '@max-set-line:px-1.5 @max-set-line:text-center',
};

/** `changed` reads semibold with the changed mark; `none` reads as a plain value. A field given a mark keeps room for it either way. */
type FieldMark = 'changed' | 'none';

/** `all-on-focus` selects the value on focus, so typing replaces it. */
type FieldSelection = 'all-on-focus' | 'none';

type RowTextFieldProps<Value> = {
  label: string;
  value: Value;
  format: (value: Value) => string;
  parse: (text: string) => Value | null;
  problem: string;
  onCommit: (value: Value) => void;
  suffix?: string;
  type?: 'number' | 'text';
  inputMode?: 'numeric' | 'decimal' | 'text';
  placeholder?: string;
  className?: string;
  description?: string;
  commitOn?: 'change' | 'blur';
  mark?: FieldMark;
  selection?: FieldSelection;
  density?: FieldDensity;
};

function selectAll(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

export function useRowTextField<Value>({
  label,
  value,
  format,
  parse,
  problem,
  onCommit,
  suffix,
  type = 'text',
  inputMode,
  placeholder,
  className,
  description,
  commitOn = 'change',
  mark,
  selection = 'none',
  density = 'default',
}: RowTextFieldProps<Value>): {
  field: ReactNode;
  problem: ReactNode;
} {
  const formatted = format(value);
  const [text, setText] = useState(formatted);
  const [shown, setShown] = useState(formatted);
  const [invalid, setInvalid] = useState(false);
  const problemId = useId();
  const suffixId = useId();
  const descriptionId = useId();
  const describedBy = [suffix ? suffixId : '', description ? descriptionId : '', invalid ? problemId : ''].filter(id => id !== '').join(' ');
  if (formatted !== shown) {
    setShown(formatted);
    setText(formatted);
    setInvalid(false);
  }

  function commit(parsed: Value) {
    setInvalid(false);
    setShown(format(parsed));
    onCommit(parsed);
  }

  function change(raw: string) {
    setText(raw);
    if (commitOn === 'blur') return;
    const parsed = parse(raw);
    if (parsed !== null) commit(parsed);
  }

  function settle(raw: string) {
    const parsed = parse(raw);
    setInvalid(parsed === null);
    if (parsed === null) return;
    setText(format(parsed));
    if (commitOn === 'blur' && format(parsed) !== shown) commit(parsed);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (commitOn !== 'blur') return;
    if (event.key === 'Enter') settle(text);
    if (event.key === 'Escape') {
      setText(shown);
      setInvalid(false);
    }
  }

  const input = (
    <Input
      type={type}
      min={type === 'number' ? 1 : undefined}
      inputMode={inputMode ?? (type === 'number' ? 'numeric' : undefined)}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label={label}
      placeholder={placeholder}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy || undefined}
      className={cn('tabular-nums', DENSITY_CLASS[density], { 'font-semibold': mark === 'changed' }, className)}
      value={text}
      onChange={event => change(event.target.value)}
      onFocus={selection === 'all-on-focus' ? selectAll : undefined}
      onBlur={() => settle(text)}
      onKeyDown={onKeyDown}
    />
  );

  return {
    field: (
      <span className="flex items-center gap-1">
        {mark ? (
          <span className="relative flex min-w-0 grow">
            {input}
            {mark === 'changed' && <ChangedMark placement="corner" />}
          </span>
        ) : (
          input
        )}
        {suffix && (
          <span id={suffixId} className="min-w-8 text-xs whitespace-nowrap text-text-secondary">
            {suffix.trim()}
          </span>
        )}
        {description && (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        )}
      </span>
    ),
    problem: invalid ? <InlineProblem id={problemId}>{problem}</InlineProblem> : null,
  };
}

export function RowTextField<Value>(props: RowTextFieldProps<Value>) {
  const { field, problem } = useRowTextField(props);
  return (
    <div className="grid gap-1">
      {field}
      {problem}
    </div>
  );
}

type CountFieldProps = Pick<RowTextFieldProps<number>, 'label' | 'value' | 'onCommit' | 'suffix' | 'className'> & { parse?: (text: string) => number | null };

export function CountField({ parse = parseCount, ...field }: CountFieldProps) {
  return <RowTextField type="number" format={String} parse={parse} problem={COUNT_PROBLEM} {...field} />;
}
