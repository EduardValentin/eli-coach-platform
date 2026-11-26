import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  buildDirectory: "build",
  future: {
    unstable_optimizeDeps: true,
  },
  ssr: true,
} satisfies Config;
