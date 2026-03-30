import type { Config } from "@react-router/dev/config";

const basename = process.env.APP_BASE_PATH ?? "/";

export default {
  basename,
  buildDirectory: "build",
  ssr: true,
} satisfies Config;
