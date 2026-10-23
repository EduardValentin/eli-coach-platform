import { useId, useState } from 'react';
import { InlineProblem } from '../../InlineProblem';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { COUNT_PROBLEM, parseCount } from './rowFields';

type RowTextFieldProps<Value> = {
  label: string;
  value: Value;
  format: (value: Value) => string;
  parse: (text: string) => Value | null;
  problem: string;
  onCommit: (value: Value) => void;
  suffix?: string;
  type?: 'number' | 'text';
  placeholder?: string;
  className?: string;
};

export function RowTextField<Value>({ label, value, format, parse, problem, onCommit, suffix, type = 'text', placeholder, className }: RowTextFieldProps<Value>) {
  const formatted = format(value);
  const [text, setText] = useState(formatted);
  const [shown, setShown] = useState(formatted);
  const [invalid, setInvalid] = useState(false);
  const problemId = useId();
  const suffixId = useId();
  const describedBy = [suffix ? suffixId : '', invalid ? problemId : ''].filter(id => id !== '').join(' ');
  if (formatted !== shown) {
    setShown(formatted);
    setText(formatted);
    setInvalid(false);
  }

  function change(raw: string) {
    setText(raw);
    const parsed = parse(raw);
    if (parsed === null) return;
    setInvalid(false);
    setShown(format(parsed));
    onCommit(parsed);
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1">
        <Input
          size="sm"
          type={type}
          min={type === 'number' ? 1 : undefined}
          inputMode={type === 'number' ? 'numeric' : undefined}
          aria-label={label}
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('tabular-nums', className)}
          value={text}
          onChange={event => change(event.target.value)}
          onBlur={() => setInvalid(parse(text) === null)}
        />
        {suffix && (
          <span id={suffixId} className="text-xs whitespace-nowrap text-text-secondary">
            {suffix.trim()}
          </span>
        )}
      </div>
      {invalid && <InlineProblem id={problemId}>{problem}</InlineProblem>}
    </div>
  );
}

type CountFieldProps = Pick<RowTextFieldProps<number>, 'label' | 'value' | 'onCommit' | 'suffix' | 'className'> & { parse?: (text: string) => number | null };

export function CountField({ parse = parseCount, ...field }: CountFieldProps) {
  return <RowTextField type="number" format={String} parse={parse} problem={COUNT_PROBLEM} {...field} />;
}
