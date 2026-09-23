export const DISCLAIMER_ACKNOWLEDGEMENT =
  'The information I give is correct and complete, and I understand this program does not replace medical advice or a consultation with a doctor.';

const WITHDRAWAL_METHOD_PLACEHOLDER =
  ' [Placeholder — Eli to confirm the withdrawal method.]';

export const SPECIAL_CATEGORY_CONSENT_COPY = {
  female: `I agree that Evoa stores and uses my health and cycle answers to build and adjust my training program. I can withdraw this at any time.${WITHDRAWAL_METHOD_PLACEHOLDER}`,
  male: `I agree that Evoa stores and uses my health answers to build and adjust my training program. I can withdraw this at any time.${WITHDRAWAL_METHOD_PLACEHOLDER}`,
} as const;

export const CYCLE_CONFIDENTIALITY_NOTICE = 'This part stays between us.';

export const PROGRESS_PHOTO_CONSENT_COPY =
  'I agree to share progress photos with my coach. They are only used to follow my progress, and I can ask for them to be deleted at any time. [Placeholder — Eli to replace with her own wording.]';

export const WITHDRAWAL_WAIVER_COPY =
  "Start my program as soon as it's ready. I understand that by confirming I give up my 14-day right to withdraw and to a refund.";
