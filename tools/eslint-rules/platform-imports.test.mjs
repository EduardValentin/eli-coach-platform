import { createRuleTester } from "./rule-test-utils.mjs";
import { platformImportRules } from "./platform-imports.mjs";

const ruleTester = createRuleTester();

ruleTester.run(
  "prefer-platform-app-alias",
  platformImportRules["prefer-platform-app-alias"],
  {
    valid: [
      {
        code: 'import { Button } from "./button";',
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'import { createMarketingMotion } from "../marketing-motion";',
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'import { getPlatformContainer } from "~/server/container.server";',
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'import { WaitingListService } from "@eli-coach-platform/domain";',
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
    ],
    invalid: [
      {
        code: 'import { getPlatformContainer } from "../../server/container.server";',
        errors: [{ messageId: "preferAlias" }],
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'export { getPlatformContainer } from "../../server/container.server";',
        errors: [{ messageId: "preferAlias" }],
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'await import("../../server/container.server");',
        errors: [{ messageId: "preferAlias" }],
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
    ],
  },
);

ruleTester.run(
  "no-workspace-relative-imports",
  platformImportRules["no-workspace-relative-imports"],
  {
    valid: [
      {
        code: 'import "@eli-coach-platform/ui/styles.css";',
        filename: "apps/platform/app/root.tsx",
      },
      {
        code: 'export * from "@eli-coach-platform/domain";',
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'export * from "./waiting-list";',
        filename: "packages/domain/src/index.ts",
      },
      {
        code: 'import { cn } from "../utils";',
        filename: "packages/ui/src/components/button.tsx",
      },
    ],
    invalid: [
      {
        code: 'import { WaitingListService } from "../../../../packages/domain/src/index";',
        errors: [{ messageId: "usePackageName" }],
        filename: "apps/platform/app/routes/example.ts",
      },
      {
        code: 'import { WaitingListService } from "@eli-coach-platform/domain/src/waiting-list";',
        errors: [{ messageId: "usePackageBarrel" }],
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
      {
        code: 'export * from "../../../../packages/domain/src/index";',
        errors: [{ messageId: "usePackageName" }],
        filename: "apps/platform/app/routes/example.ts",
      },
      {
        code: 'import { WaitingListService } from "../../domain/src/index";',
        errors: [{ messageId: "usePackageName" }],
        filename: "packages/db/src/example.ts",
      },
      {
        code: 'await import("@eli-coach-platform/domain/src/waiting-list");',
        errors: [{ messageId: "usePackageBarrel" }],
        filename: "apps/platform/app/routes/marketing/waitlist/example.ts",
      },
    ],
  },
);
