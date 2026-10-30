import { join } from "node:path";

import { target as database } from "~/shared/database";

export const target = [database, join];
