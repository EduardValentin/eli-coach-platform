import type { ResourceDocumentPagesPort } from "~/bounded-contexts/clients/client-resources/domain/client-resources/index";
import type { ResourceDocumentPagesOptions } from "./resource-document-pages.server";
import { WorkerResourceDocumentPagesAdapter } from "./worker-resource-document-pages-adapter.server";

export function createResourceDocumentPagesAdapter(
  options: ResourceDocumentPagesOptions,
): ResourceDocumentPagesPort {
  return new WorkerResourceDocumentPagesAdapter(options);
}
