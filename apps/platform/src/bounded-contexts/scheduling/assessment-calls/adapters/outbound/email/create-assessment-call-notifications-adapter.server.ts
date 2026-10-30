import type { AssessmentCallNotificationsPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { ProductEmailPort } from "~/shared/email/index.server";

import {
  EmailAssessmentCallNotificationsAdapter,
  type EmailAssessmentCallNotificationsOptions,
} from "./email-assessment-call-notifications-adapter.server";

export function createAssessmentCallNotificationsAdapter(
  productEmailPort: ProductEmailPort,
  options: EmailAssessmentCallNotificationsOptions,
): AssessmentCallNotificationsPort {
  return new EmailAssessmentCallNotificationsAdapter(productEmailPort, options);
}
