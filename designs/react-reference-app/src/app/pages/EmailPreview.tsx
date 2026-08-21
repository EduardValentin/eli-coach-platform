import { useEffect, useMemo, useRef, useState } from 'react';
import { render } from '@react-email/render';
import {
  WaitlistConfirmation,
  type WaitlistConfirmationVariant,
} from '../../email-templates/WaitlistConfirmation';
import {
  StoreDelivery,
  type StoreDeliveryVariant,
} from '../../email-templates/StoreDelivery';
import {
  ClientInvitation,
  type ClientInvitationVariant,
} from '../../email-templates/ClientInvitation';

type TemplateKey =
  | 'waitlist-confirmation'
  | 'store-delivery'
  | 'client-invitation';

type TemplateOption = {
  key: TemplateKey;
  label: string;
  variants: { value: string; label: string }[];
};

const TEMPLATES: TemplateOption[] = [
  {
    key: 'waitlist-confirmation',
    label: 'Waitlist confirmation',
    variants: [
      { value: 'reduced', label: 'Reduced-price signup' },
      { value: 'regular', label: 'Joined without reduced pricing' },
    ],
  },
  {
    key: 'store-delivery',
    label: 'Store delivery',
    variants: [
      { value: 'single', label: 'Single resource' },
      { value: 'multiple', label: 'Multiple resources' },
    ],
  },
  {
    key: 'client-invitation',
    label: 'Client invitation',
    variants: [
      { value: 'first', label: 'First invitation' },
      { value: 'replaced', label: 'Replaced invitation' },
    ],
  },
];

export function EmailPreview() {
  const [template, setTemplate] = useState<TemplateKey>(
    'waitlist-confirmation',
  );
  const [variant, setVariant] = useState<string>('reduced');
  const [html, setHtml] = useState<string>('');
  const [iframeHeight, setIframeHeight] = useState<number>(800);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const node = useMemo(() => {
    if (template === 'waitlist-confirmation') {
      return (
        <WaitlistConfirmation
          variant={variant as WaitlistConfirmationVariant}
        />
      );
    }
    if (template === 'store-delivery') {
      return (
        <StoreDelivery
          variant={variant as StoreDeliveryVariant}
          downloadUrl={`${window.location.origin}/downloads`}
        />
      );
    }
    if (template === 'client-invitation') {
      return (
        <ClientInvitation
          variant={variant as ClientInvitationVariant}
          clientName="Jane"
          coachName="Eli"
          acceptUrl={`${window.location.origin}/portal/onboarding`}
        />
      );
    }
    return null;
  }, [template, variant]);

  const selectTemplate = (option: TemplateOption) => {
    setTemplate(option.key);
    setVariant(option.variants[0].value);
  };

  useEffect(() => {
    let cancelled = false;
    if (!node) {
      setHtml('');
      return;
    }
    render(node).then((output) => {
      if (!cancelled) setHtml(output);
    });
    return () => {
      cancelled = true;
    };
  }, [node]);

  const currentTemplate = TEMPLATES.find((t) => t.key === template)!;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#E8E1DC',
        fontFamily:
          '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#121212',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #E5DED9',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#95134F',
              fontWeight: 600,
            }}
          >
            Email preview
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#121212' }}>
            {currentTemplate.label}
          </span>
        </div>

        <fieldset
          style={{
            border: '1px solid #E5DED9',
            borderRadius: 999,
            padding: '4px',
            display: 'inline-flex',
            gap: 0,
            background: '#F8F4F1',
          }}
        >
          <legend
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Email template
          </legend>
          {TEMPLATES.map((option) => {
            const active = option.key === template;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => selectTemplate(option)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: active ? '#121212' : 'transparent',
                  color: active ? '#ffffff' : '#3A3A3A',
                  transition: 'all 0.2s ease',
                }}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </fieldset>

        <fieldset
          style={{
            border: '1px solid #E5DED9',
            borderRadius: 999,
            padding: '4px',
            display: 'inline-flex',
            gap: 0,
            background: '#F8F4F1',
          }}
        >
          <legend
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Email variant
          </legend>
          {currentTemplate.variants.map((v) => {
            const active = v.value === variant;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVariant(v.value)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: active ? '#121212' : 'transparent',
                  color: active ? '#ffffff' : '#3A3A3A',
                  transition: 'all 0.2s ease',
                }}
                aria-pressed={active}
              >
                {v.label}
              </button>
            );
          })}
        </fieldset>
      </header>

      <main
        style={{
          padding: '32px 16px 64px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 640,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow:
              '0 1px 3px rgba(18, 18, 18, 0.06), 0 10px 30px -10px rgba(18, 18, 18, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #ECE5E1',
              backgroundColor: '#FAF6F3',
              display: 'flex',
              gap: 6,
            }}
            aria-hidden="true"
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#E5DED9',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#E5DED9',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#E5DED9',
              }}
            />
          </div>
          <iframe
            ref={iframeRef}
            title={`${currentTemplate.label} — ${variant}`}
            srcDoc={html}
            onLoad={() => {
              const doc = iframeRef.current?.contentDocument;
              if (!doc) return;
              const measure = () => {
                const h = doc.documentElement.scrollHeight;
                if (h > 0) setIframeHeight(h);
              };
              measure();
              // Re-measure after fonts finish loading
              doc.fonts?.ready.then(measure).catch(() => {});
              setTimeout(measure, 400);
            }}
            style={{
              width: '100%',
              height: iframeHeight,
              border: 'none',
              display: 'block',
              backgroundColor: '#F4EFEC',
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default EmailPreview;
