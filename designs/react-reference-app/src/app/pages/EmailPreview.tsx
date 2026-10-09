import { useEffect, useMemo, useRef, useState } from 'react';
import { render } from '@react-email/render';
import { TZDate } from '@date-fns/tz';
import {
  WaitlistConfirmation,
  type WaitlistConfirmationVariant,
} from '../../email-templates/WaitlistConfirmation';
import {
  StoreDelivery,
  type StoreDeliveryVariant,
} from '../../email-templates/StoreDelivery';
import { ClientInvitation } from '../../email-templates/ClientInvitation';
import { DetailsRequest } from '../../email-templates/DetailsRequest';
import {
  AssessmentCallVisitorConfirmation,
  type AssessmentCallEmailVariant,
} from '../../email-templates/AssessmentCallVisitorConfirmation';
import { AssessmentCallCoachNotification } from '../../email-templates/AssessmentCallCoachNotification';
import {
  PaymentLink,
  type PaymentLinkVariant,
} from '../../email-templates/PaymentLink';
import { RefundDue } from '../../email-templates/RefundDue';
import { CheckinRequested } from '../../email-templates/CheckinRequested';
import { CheckinWithdrawn } from '../../email-templates/CheckinWithdrawn';
import { CheckinApproved } from '../../email-templates/CheckinApproved';
import { CheckinDeclined } from '../../email-templates/CheckinDeclined';

type TemplateKey =
  | 'waitlist-confirmation'
  | 'store-delivery'
  | 'client-invitation'
  | 'details-request'
  | 'payment-link'
  | 'assessment-call-visitor'
  | 'assessment-call-coach'
  | 'refund-due'
  | 'checkin-requested'
  | 'checkin-withdrawn'
  | 'checkin-approved'
  | 'checkin-declined';

type TemplateOption = {
  key: TemplateKey;
  label: string;
  variants: { value: string; label: string }[];
};

const SAMPLE_VISITOR_PHONE = '+40712345678';
const SAMPLE_CHECKIN_NOTE = 'My knee felt sore after Tuesday.';
const SAMPLE_COACH_TIME_ZONE = 'Europe/Bucharest';
const SAMPLE_CHECKIN_HOUR = 18;
const SAMPLE_CHECKIN_DAYS_AHEAD = 3;
const WEEKEND_DAYS = [0, 6];

function sampleCheckinStart(): Date {
  const today = new TZDate(Date.now(), SAMPLE_COACH_TIME_ZONE);
  const startOn = (daysAhead: number) =>
    new TZDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + daysAhead,
      SAMPLE_CHECKIN_HOUR,
      SAMPLE_COACH_TIME_ZONE,
    );
  let daysAhead = SAMPLE_CHECKIN_DAYS_AHEAD;
  while (WEEKEND_DAYS.includes(startOn(daysAhead).getDay())) daysAhead += 1;

  return new Date(startOn(daysAhead).getTime());
}

const SAMPLE_CHECKIN_START = sampleCheckinStart();

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
    variants: [{ value: 'invitation', label: 'Invitation' }],
  },
  {
    key: 'details-request',
    label: 'Details request',
    variants: [{ value: 'request', label: 'Request for more details' }],
  },
  {
    key: 'payment-link',
    label: 'Payment link',
    variants: [
      { value: 'regular', label: 'Regular pricing' },
      { value: 'reduced', label: 'Reduced pricing' },
    ],
  },
  {
    key: 'assessment-call-visitor',
    label: 'Assessment call — visitor',
    variants: [
      { value: 'with-notes', label: 'With a shared note' },
      { value: 'without-notes', label: 'Without a shared note' },
    ],
  },
  {
    key: 'assessment-call-coach',
    label: 'Assessment call — coach',
    variants: [
      { value: 'with-notes', label: 'With a shared note and a phone' },
      { value: 'without-notes', label: 'Without a shared note or a phone' },
    ],
  },
  {
    key: 'refund-due',
    label: 'Refund due — coach',
    variants: [{ value: 'full-refund', label: 'Full refund' }],
  },
  {
    key: 'checkin-requested',
    label: 'Check-in requested',
    variants: [
      { value: 'with-note', label: 'With a note' },
      { value: 'without-note', label: 'Without a note' },
    ],
  },
  {
    key: 'checkin-withdrawn',
    label: 'Check-in withdrawn',
    variants: [{ value: 'withdrawn', label: 'Withdrawn' }],
  },
  {
    key: 'checkin-approved',
    label: 'Check-in approved',
    variants: [{ value: 'approved', label: 'Approved' }],
  },
  {
    key: 'checkin-declined',
    label: 'Check-in declined',
    variants: [{ value: 'declined', label: 'Declined' }],
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
          clientName="Jane"
          coachName="Eli"
          acceptUrl={`${window.location.origin}/invitation#inv-demo`}
        />
      );
    }
    if (template === 'details-request') {
      return (
        <DetailsRequest
          clientName="Jane"
          coachName="Eli"
          portalUrl={`${window.location.origin}/portal`}
        />
      );
    }
    if (template === 'payment-link') {
      return (
        <PaymentLink
          variant={variant as PaymentLinkVariant}
          clientName="Jane"
          coachName="Eli"
          chooseUrl={`${window.location.origin}/select-bundle#pl-preview`}
          termsUrl={`${window.location.origin}/terms`}
        />
      );
    }
    if (template === 'assessment-call-visitor') {
      return (
        <AssessmentCallVisitorConfirmation
          variant={variant as AssessmentCallEmailVariant}
          joinUrl={`${window.location.origin}/book/ac-demo/join`}
        />
      );
    }
    if (template === 'assessment-call-coach') {
      return (
        <AssessmentCallCoachNotification
          variant={variant as AssessmentCallEmailVariant}
          visitorPhone={variant === 'with-notes' ? SAMPLE_VISITOR_PHONE : null}
          joinUrl={`${window.location.origin}/book/ac-demo/join`}
        />
      );
    }
    if (template === 'refund-due') {
      return (
        <RefundDue
          clientPageUrl={`${window.location.origin}/coach/clients/ac-demo-client-1`}
        />
      );
    }
    if (template === 'checkin-requested') {
      return (
        <CheckinRequested
          clientName="Jane Doe"
          note={variant === 'with-note' ? SAMPLE_CHECKIN_NOTE : null}
          startsAt={SAMPLE_CHECKIN_START}
          coachTimeZone={SAMPLE_COACH_TIME_ZONE}
          reviewUrl={`${window.location.origin}/coach/checkins`}
        />
      );
    }
    if (template === 'checkin-withdrawn') {
      return (
        <CheckinWithdrawn
          clientName="Jane Doe"
          startsAt={SAMPLE_CHECKIN_START}
          coachTimeZone={SAMPLE_COACH_TIME_ZONE}
        />
      );
    }
    if (template === 'checkin-approved') {
      return (
        <CheckinApproved
          coachName="Eli"
          startsAt={SAMPLE_CHECKIN_START}
          clientTimeZone="Europe/London"
          joinUrl={`${window.location.origin}/client/checkins/ci-demo/join`}
        />
      );
    }
    if (template === 'checkin-declined') {
      return (
        <CheckinDeclined
          coachName="Eli"
          startsAt={SAMPLE_CHECKIN_START}
          clientTimeZone="Europe/London"
          checkinsUrl={`${window.location.origin}/client/checkins`}
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
          <h1
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#C81D6B',
              fontWeight: 600,
            }}
          >
            Email preview
          </h1>
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
