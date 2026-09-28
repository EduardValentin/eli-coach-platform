export const SAVE_LABELS = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  unsaved: "Not saved yet. We'll try again when you're back online.",
} as const;

export const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";

export const MISSING_CONSENT = "Tick the box to carry on.";

export const RESUME_NOTE = "Picking up where you left off.";

export const MANUAL_SCREENING_MESSAGE =
  "These safety questions are designed for ages 15 to 69. I'll go through your health questions with you directly before building your program.";

export const SCREENING_CLEARED_MESSAGE =
  "Thank you. Nothing here needs a doctor's sign-off — let's keep going.";

export const SPECIAL_CATEGORY_CONSENT_COPY = {
  female:
    "I agree that Evoa stores and uses my health and cycle answers to build and adjust my training program. I can withdraw this at any time.",
  other:
    "I agree that Evoa stores and uses my health answers to build and adjust my training program. I can withdraw this at any time.",
} as const;

export const DISCLAIMER_ACKNOWLEDGEMENT =
  "The information I give is correct and complete, and I understand this program does not replace medical advice or a consultation with a doctor.";

export const PROGRESS_PHOTO_CONSENT_COPY =
  "I agree to share progress photos with my coach. They are only used to follow my progress, and I can ask for them to be deleted at any time. [Placeholder — Eli to replace with her own wording.]";
