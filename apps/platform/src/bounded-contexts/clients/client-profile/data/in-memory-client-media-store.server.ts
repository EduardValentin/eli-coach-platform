import { MEDIA_ALREADY_STORED_MESSAGE } from "./client-media-layout.server";

const MEMORY_KEY_ID = "memory";

type ClientMediaReference = { storageKey: string; keyId: string };

export class InMemoryClientMediaStore<Owner> {
  private readonly files = new Map<string, Uint8Array>();

  constructor(private readonly storageKeyOf: (owner: Owner) => string) {}

  async store(owner: Owner, bytes: Uint8Array): Promise<ClientMediaReference> {
    const storageKey = this.storageKeyOf(owner);

    if (this.files.has(storageKey)) {
      throw new Error(MEDIA_ALREADY_STORED_MESSAGE);
    }

    this.files.set(storageKey, Uint8Array.from(bytes));

    return { storageKey, keyId: MEMORY_KEY_ID };
  }

  async open(reference: ClientMediaReference): Promise<Uint8Array | null> {
    const file = this.files.get(reference.storageKey);

    return file ? Uint8Array.from(file) : null;
  }

  async delete(reference: ClientMediaReference): Promise<void> {
    this.files.delete(reference.storageKey);
  }
}
