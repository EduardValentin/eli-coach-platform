import type { Config } from "@react-router/dev/config";

const basename = process.env.APP_BASE_PATH ?? "/";

export default {
  basename,
  buildDirectory: "build",
  prerender: ["/", "/blog", "/store"],
  ssr: true,
} satisfies Config;
