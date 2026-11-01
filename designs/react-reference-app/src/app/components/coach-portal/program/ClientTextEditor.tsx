import { useId, type ReactNode } from 'react';
import type { TemplateText } from '../../../domain/programTemplates';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';

type ClientTextEditorProps = {
  label: string;
  value: string;
  template: TemplateText;
  caption?: ReactNode;
  onChange: (text: string) => void;
  onReset: () => void;
};

export function ClientTextEditor({ label, value, template, caption, onChange, onReset }: ClientTextEditorProps) {
  const captionId = useId();

  return (
    <div className="grid gap-2">
      {(caption || template.pending || template.text !== '') && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {caption && (
            <p id={captionId} className="text-sm text-text-secondary">
              {caption}
            </p>
          )}
          {template.pending && <Badge tone="pending">Romanian text pending</Badge>}
          {template.text !== '' && (
            <Button variant="ghost" size="xs" className="ml-auto" onClick={onReset}>
              Reset to template
            </Button>
          )}
        </div>
      )}
      <Textarea aria-label={label} aria-describedby={caption ? captionId : undefined} value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}
