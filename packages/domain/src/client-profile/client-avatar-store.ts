export type ClientAvatarReference = { storageKey: string; keyId: string };

export type ClientAvatarOwner = { clientId: string; avatarId: string };

export interface ClientAvatarStore {
  store(
    owner: ClientAvatarOwner,
    bytes: Uint8Array,
  ): Promise<ClientAvatarReference>;
  open(reference: ClientAvatarReference): Promise<Uint8Array | null>;
  delete(reference: ClientAvatarReference): Promise<void>;
}
