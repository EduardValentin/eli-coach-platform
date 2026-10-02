import type { ReactNode } from 'react';

const CARD_FIELDS = [
  { id: 'card-number', label: 'Card number', placeholder: '4242 4242 4242 4242' },
  { id: 'card-expiry', label: 'Expiry', placeholder: 'MM / YY' },
  { id: 'card-cvc', label: 'CVC', placeholder: '123' },
];

const FIELD_CLASS =
  'mt-1 h-11 w-full rounded-field border border-border-subtle bg-surface-quiet px-3 text-sm text-text-secondary';

export const STAND_IN_BACK_LINK_CLASS =
  'mt-5 block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-text-primary';

export function ProviderStandInShell({
  landmarkLabel,
  eyebrow,
  note,
  children,
}: {
  landmarkLabel: string;
  eyebrow: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <main
      aria-label={landmarkLabel}
      className="min-h-screen bg-surface-base px-4 py-12 sm:px-6"
    >
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{note}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function StandInCardFields() {
  return (
    <fieldset className="mt-8 grid gap-4 border-0 p-0" disabled>
      <legend className="text-xs uppercase tracking-widest text-muted-foreground">
        Card details
      </legend>
      {CARD_FIELDS.map((field) => (
        <div key={field.id}>
          <label className="text-xs text-muted-foreground" htmlFor={field.id}>
            {field.label}
          </label>
          <input
            className={FIELD_CLASS}
            id={field.id}
            placeholder={field.placeholder}
            type="text"
          />
        </div>
      ))}
    </fieldset>
  );
}
