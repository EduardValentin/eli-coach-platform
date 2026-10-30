type OnboardingDetailsRequestMessage = {
  requestId: string;
  clientId: string;
  email: string;
  firstName: string;
};

export interface OnboardingDetailsNotificationsPort {
  sendDetailsRequest(
    message: OnboardingDetailsRequestMessage,
  ): Promise<"sent" | "failed">;
}
