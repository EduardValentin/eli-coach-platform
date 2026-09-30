type OnboardingDetailsRequestMessage = {
  requestId: string;
  clientId: string;
  email: string;
  firstName: string;
};

export interface OnboardingDetailsNotifications {
  sendDetailsRequest(
    message: OnboardingDetailsRequestMessage,
  ): Promise<"sent" | "failed">;
}
