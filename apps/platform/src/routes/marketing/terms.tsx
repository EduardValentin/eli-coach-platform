import { WEBSITE_AND_STORE_TERMS_DOCUMENT } from "@eli-coach-platform/content";
import type { MetaFunction } from "react-router";

import { LegalDocumentView } from "~/surfaces/public-site/sections/legal/legal-document-view";

export const meta: MetaFunction = () => [
  { title: "Terms & Conditions | Evoa Fitness" },
  {
    name: "description",
    content:
      "Terms governing the Evoa Fitness website, waitlist, services, and free or paid digital Store products.",
  },
];

export default function TermsRoute() {
  return <LegalDocumentView document={WEBSITE_AND_STORE_TERMS_DOCUMENT} />;
}
