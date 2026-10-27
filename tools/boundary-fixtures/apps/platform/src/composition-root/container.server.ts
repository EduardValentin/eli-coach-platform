import { target as sales } from "~/bounded-contexts/sales/composition.server";

import { target as runtimeEnvironment } from "./runtime-environment";

export const target = [runtimeEnvironment, sales];
