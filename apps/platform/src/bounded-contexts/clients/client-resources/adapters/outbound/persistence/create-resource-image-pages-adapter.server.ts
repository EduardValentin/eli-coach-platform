import type {
  ResourceRenditions,
  ResourceImagePagesPort,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources/index";
import { SharpResourceImagePagesAdapter } from "./sharp-resource-image-pages-adapter.server";

export function createResourceImagePagesAdapter(
  renditions: ResourceRenditions,
): ResourceImagePagesPort {
  return new SharpResourceImagePagesAdapter(renditions);
}
