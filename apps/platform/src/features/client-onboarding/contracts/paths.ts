export { CLIENT_ONBOARDING_ROUTE_SEGMENT } from "../../coaching-sales/contracts/paths";

export const CLIENT_ONBOARDING_API_PATHS = {
  draft: "/api/client-onboarding/draft",
  submission: "/api/client-onboarding/submission",
  reviewOpenings: "/api/client-onboarding/review-openings",
  detailRequests: "/api/client-onboarding/detail-requests",
  approvals: "/api/client-onboarding/approvals",
  detailAnswers: "/api/client-onboarding/detail-answers",
} as const;
