import type { AssessmentCallNotifications } from "@eli-coach-platform/domain/assessment-call";
import type { ProductEmail } from "~/shared/email/index.server";

import {
  EmailAssessmentCallNotifications,
  type EmailAssessmentCallNotificationsOptions,
} from "./email-assessment-call-notifications.server";

export function createAssessmentCallNotifications(
  productEmail: ProductEmail,
  options: EmailAssessmentCallNotificationsOptions,
): AssessmentCallNotifications {
  return new EmailAssessmentCallNotifications(productEmail, options);
}
