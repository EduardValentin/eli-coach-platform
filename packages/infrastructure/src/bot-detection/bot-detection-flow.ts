import { TURNSTILE_RESPONSE_FIELD } from "./bot-detection-contract";

export type BotDetectionFlowState = {
  awaitingChallenge: boolean;
  pendingFormData: FormData | null;
  token: string;
};

export type BotDetectionFlowEvent =
  | { type: "submit"; formData: FormData }
  | { type: "token"; token: string }
  | { type: "challenge-error" }
  | { type: "reset" };

const BOT_DETECTION_ERROR_MESSAGE =
  "We couldn't verify this request. Please try again.";

const IDLE_STATE: BotDetectionFlowState = {
  awaitingChallenge: false,
  pendingFormData: null,
  token: "",
};

export function reduceBotDetectionFlow(
  state: BotDetectionFlowState,
  event: BotDetectionFlowEvent,
): {
  deliver: FormData | null;
  error: string | null;
  state: BotDetectionFlowState;
} {
  switch (event.type) {
    case "submit": {
      if (state.token) {
        return {
          deliver: withToken(event.formData, state.token),
          error: null,
          state: IDLE_STATE,
        };
      }

      return {
        deliver: null,
        error: null,
        state: {
          awaitingChallenge: true,
          pendingFormData: event.formData,
          token: state.token,
        },
      };
    }

    case "token": {
      if (state.awaitingChallenge && state.pendingFormData) {
        return {
          deliver: withToken(state.pendingFormData, event.token),
          error: null,
          state: IDLE_STATE,
        };
      }

      return {
        deliver: null,
        error: null,
        state: { ...state, token: event.token },
      };
    }

    case "challenge-error":
      return {
        deliver: null,
        error: BOT_DETECTION_ERROR_MESSAGE,
        state: IDLE_STATE,
      };

    case "reset":
      return {
        deliver: null,
        error: null,
        state: IDLE_STATE,
      };
  }
}

function withToken(formData: FormData, token: string): FormData {
  const submission = new FormData();

  for (const [field, value] of formData.entries()) {
    submission.append(field, value);
  }

  submission.set(TURNSTILE_RESPONSE_FIELD, token);

  return submission;
}
