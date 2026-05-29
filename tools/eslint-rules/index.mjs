import { controllerArchitectureRules } from "./controller-architecture.mjs";
import { platformImportRules } from "./platform-imports.mjs";

export default {
  rules: {
    ...controllerArchitectureRules,
    ...platformImportRules,
  },
};
