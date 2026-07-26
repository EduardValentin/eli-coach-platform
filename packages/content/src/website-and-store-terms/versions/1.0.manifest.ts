import type { WebsiteAndStoreTermsPdfArtifact } from "../types";

export const WEBSITE_AND_STORE_TERMS_V1_0_ARTIFACT = {
  termsVersion: "1.0",
  effectiveDate: "2026-07-26",
  mediaType: "application/pdf",
  filename: "terms-and-conditions.pdf",
  packageExportSubpath: "./artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
  contentSha256: "f3c65f02285776a5aa00b4aa9fd16717fe5c4137922d3dcc14343c64057ab049",
  pdfSha256: "ed18e5e93bbb1e3d629193509cf9a07bbfb7f1a49d308c96c22da049efdaf865",
} as const satisfies WebsiteAndStoreTermsPdfArtifact;
