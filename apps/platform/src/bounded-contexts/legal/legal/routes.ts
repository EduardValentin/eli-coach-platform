import { relative } from "@react-router/dev/routes";

const { route } = relative(import.meta.dirname);

export const legalPublicRoutes = [
  route("privacy", "./ui/public/privacy-page.tsx"),
  route("terms", "./ui/public/terms-page.tsx"),
];
