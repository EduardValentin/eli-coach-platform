import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const base = process.env.APP_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [reactRouter()],
});
