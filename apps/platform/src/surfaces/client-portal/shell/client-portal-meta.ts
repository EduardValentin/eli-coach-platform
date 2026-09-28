import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import type { MetaDescriptor } from "react-router";

const CLIENT_PORTAL_META: readonly MetaDescriptor[] = [
  {
    name: "description",
    content: pwaSurfaceDefinitions.client.description,
  },
  {
    name: "theme-color",
    content: pwaSurfaceDefinitions.client.themeColor,
  },
];

export function clientPortalPageMeta(title: string): MetaDescriptor[] {
  return [{ title }, ...CLIENT_PORTAL_META];
}
