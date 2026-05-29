import { controllerArchitectureRules } from "./controller-architecture.mjs";
import { createRuleTester } from "./rule-test-utils.mjs";

const ruleTester = createRuleTester();

ruleTester.run(
  "no-controller-inheritance",
  controllerArchitectureRules["no-controller-inheritance"],
  {
    valid: [
      {
        code: "class WaitlistService extends BaseService {}",
        filename: "apps/platform/app/modules/waitlist/waitlist-service.server.ts",
      },
      {
        code: "const WaitlistController = class {};",
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
    ],
    invalid: [
      {
        code: "class WaitlistController extends BaseController {}",
        errors: [{ messageId: "noControllerInheritance" }],
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
      {
        code: "const WaitlistController = class extends BaseController {};",
        errors: [{ messageId: "noControllerInheritance" }],
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
    ],
  },
);

ruleTester.run(
  "no-controller-instance-state",
  controllerArchitectureRules["no-controller-instance-state"],
  {
    valid: [
      {
        code: `
          class WaitlistController {
            constructor(private readonly service: WaitingListService) {}

            getWaitlist() {
              return this.service.getWaitlist();
            }
          }
        `,
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
      {
        code: `
          class WaitlistController {
            static readonly name = "waitlist";

            constructor(service: WaitingListService) {
              this.service = service;
            }
          }
        `,
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
    ],
    invalid: [
      {
        code: `
          class WaitlistController {
            private request: Request | null = null;
          }
        `,
        errors: [{ messageId: "noInstanceField" }],
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
      {
        code: `
          class WaitlistController {
            join(request: Request) {
              this.request = request;
            }
          }
        `,
        errors: [{ messageId: "noInstanceAssignment" }],
        filename: "apps/platform/app/modules/waitlist/waitlist-controller.server.ts",
      },
    ],
  },
);

ruleTester.run(
  "api-routes-use-container-controllers",
  controllerArchitectureRules["api-routes-use-container-controllers"],
  {
    valid: [
      {
        code: `
          import { getPlatformContainer } from "~/server/container.server";

          export async function loader() {
            return getPlatformContainer().waitlistController.getWaitlist();
          }
        `,
        filename: "apps/platform/app/routes/internal/api.meta.ts",
      },
      {
        code: 'import type { WaitlistController } from "~/modules/waitlist/waitlist-controller.server";',
        filename: "apps/platform/app/routes/internal/api.meta.ts",
      },
    ],
    invalid: [
      {
        code: `
          class WaitlistController {}

          export async function loader() {
            return new WaitlistController();
          }
        `,
        errors: [{ messageId: "useContainerController" }],
        filename: "apps/platform/app/routes/internal/api.example.ts",
      },
      {
        code: 'import { WaitlistController } from "~/modules/waitlist/waitlist-controller.server";',
        errors: [{ messageId: "useContainerControllerImport" }],
        filename: "apps/platform/app/routes/internal/api.example.ts",
      },
      {
        code: 'import { type WaitlistController, WaitlistControllerFactory } from "~/modules/waitlist/waitlist-controller.server";',
        errors: [{ messageId: "useContainerControllerImport" }],
        filename: "apps/platform/app/routes/internal/api.example.ts",
      },
      {
        code: 'await import("~/modules/waitlist/waitlist-controller.server");',
        errors: [{ messageId: "useContainerControllerImport" }],
        filename: "apps/platform/app/routes/internal/api.example.ts",
      },
    ],
  },
);

ruleTester.run(
  "no-global-container-outside-routes",
  controllerArchitectureRules["no-global-container-outside-routes"],
  {
    valid: [
      {
        code: 'import { getPlatformContainer } from "~/server/container.server";',
        filename: "apps/platform/app/routes/internal/api.meta.ts",
      },
      {
        code: 'import { getPlatformContainer } from "~/server/container.server";',
        filename: "apps/platform/app/modules/waitlist/some-service.server.test.ts",
      },
      {
        code: 'import { getPlatformContainer } from "~/server/container.server";',
        filename: "apps/platform/app/root.tsx",
      },
      {
        code: 'import type { getPlatformContainer } from "~/server/container.server";',
        filename: "apps/platform/app/modules/waitlist/some-service.server.ts",
      },
    ],
    invalid: [
      {
        code: 'import { getPlatformContainer } from "~/server/container.server";',
        errors: [{ messageId: "noGlobalContainer" }],
        filename: "apps/platform/app/modules/waitlist/some-service.server.ts",
      },
      {
        code: `
          import * as container from "~/server/container.server";

          container.getPlatformContainer();
        `,
        errors: [{ messageId: "noGlobalContainer" }],
        filename: "apps/platform/app/modules/waitlist/some-service.server.ts",
      },
      {
        code: `
          const { getPlatformContainer } = await import("~/server/container.server");

          getPlatformContainer();
        `,
        errors: [{ messageId: "noGlobalContainer" }],
        filename: "apps/platform/app/modules/waitlist/some-service.server.ts",
      },
    ],
  },
);
