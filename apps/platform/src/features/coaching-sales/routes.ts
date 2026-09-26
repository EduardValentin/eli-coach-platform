import { relative } from "@react-router/dev/routes";

import { COACHING_SALES_API_PATHS } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const coachingSalesApiRoutes = [
  route(
    COACHING_SALES_API_PATHS.paymentLinks.slice(1),
    "./api/coach/payment-links.ts",
  ),
];
