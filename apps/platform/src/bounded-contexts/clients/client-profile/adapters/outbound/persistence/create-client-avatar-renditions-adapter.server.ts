import type { ClientAvatarRenditionsPort } from "~/bounded-contexts/clients/client-profile/domain/client-profile/index";
import { SharpClientAvatarRenditionsAdapter } from "./sharp-client-avatar-renditions-adapter.server";

export function createClientAvatarRenditionsAdapter(): ClientAvatarRenditionsPort {
  return new SharpClientAvatarRenditionsAdapter();
}
