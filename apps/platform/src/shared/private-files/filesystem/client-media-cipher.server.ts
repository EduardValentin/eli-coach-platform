import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const INTEGRITY_FAILURE_MESSAGE = "Client media failed its integrity check.";

type SealedMediaInput = { key: Buffer; storageKey: string; sealed: Buffer };
type PlainMediaInput = { key: Buffer; storageKey: string; media: Uint8Array };

export function sealClientMedia({
  key,
  storageKey,
  media,
}: PlainMediaInput): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(storageKey));
  const ciphertext = Buffer.concat([cipher.update(media), cipher.final()]);

  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]);
}

export function unsealClientMedia({
  key,
  storageKey,
  sealed,
}: SealedMediaInput): Uint8Array {
  if (sealed.length < IV_BYTES + TAG_BYTES) {
    throw new Error(INTEGRITY_FAILURE_MESSAGE);
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    sealed.subarray(0, IV_BYTES),
    { authTagLength: TAG_BYTES },
  );
  decipher.setAAD(Buffer.from(storageKey));
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG_BYTES));

  try {
    const media = Buffer.concat([
      decipher.update(sealed.subarray(IV_BYTES, sealed.length - TAG_BYTES)),
      decipher.final(),
    ]);

    return new Uint8Array(media);
  } catch {
    throw new Error(INTEGRITY_FAILURE_MESSAGE);
  }
}
