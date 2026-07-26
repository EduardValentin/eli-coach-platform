import { PRIVACY_POLICY } from "@eli-coach-platform/content";
import type { MetaFunction } from "react-router";

import { LegalDocumentView } from "./legal/legal-document-view";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy | Evoa Fitness" },
  {
    name: "description",
    content:
      "How Evoa Fitness collects, uses, shares, retains, and protects personal data.",
  },
];

export default function PrivacyRoute() {
  return <LegalDocumentView document={PRIVACY_POLICY} />;
}
