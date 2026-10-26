import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AccountSession, PlatformRig } from "./platform-rig";

export type AvatarPart = { bytes: Buffer; fileName: string; mimeType: string };

export type ClientAvatarRow = {
  avatarId: string;
  storageKey: string;
  keyId: string;
  mimeType: string;
  sizeBytes: number;
};

export type ClientIdentityRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string;
  country: string;
  gender: string;
};

export const OWN_PROFILE_API = "/api/client-profile/profile";
export const OWN_AVATAR_API = "/api/client-profile/avatar";
export const OWN_IDENTITY_API = "/api/clients/identity";

export function coachProfileApi(clientId: string): string {
  return `/api/client-profile/coach/${clientId}`;
}

export function coachAvatarApi(clientId: string): string {
  return `${coachProfileApi(clientId)}/avatar`;
}

export function avatarApi(clientId: string): string {
  return `${OWN_AVATAR_API}/${clientId}`;
}

export function coachIdentityApi(clientId: string): string {
  return `/api/clients/${clientId}/identity`;
}

export class ClientProfileJourney {
  constructor(private readonly rig: PlatformRig) {}

  async putJson(
    session: AccountSession,
    path: string,
    body: unknown,
  ): Promise<Response> {
    return this.rig.requestAs(session, path, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
  }

  async uploadAvatar(
    session: AccountSession,
    path: string,
    avatar: AvatarPart,
  ): Promise<Response> {
    const form = new FormData();
    form.set(
      "avatar",
      new File([new Uint8Array(avatar.bytes)], avatar.fileName, {
        type: avatar.mimeType,
      }),
    );

    return this.rig.requestAs(session, path, { body: form, method: "POST" });
  }

  async removeAvatar(session: AccountSession, path: string): Promise<Response> {
    return this.rig.requestAs(session, path, { method: "DELETE" });
  }

  async openAvatar(
    session: AccountSession,
    clientId: string,
  ): Promise<Response> {
    return this.rig.requestAs(session, avatarApi(clientId));
  }

  async openAvatarAnonymously(clientId: string): Promise<Response> {
    return this.rig.suite.request(
      new Request(this.rig.suite.url(avatarApi(clientId))),
    );
  }

  async avatarRowOf(clientId: string): Promise<ClientAvatarRow | undefined> {
    const [row] = await this.rig.suite.postgres.queryRows<ClientAvatarRow>({
      sql: 'select avatar_id as "avatarId", storage_key as "storageKey", key_id as "keyId", mime_type as "mimeType", size_bytes as "sizeBytes" from app.client_avatars where client_id = $1',
      values: [clientId],
    });

    return row;
  }

  async identityRowOf(
    clientId: string,
  ): Promise<ClientIdentityRow | undefined> {
    const [row] = await this.rig.suite.postgres.queryRows<ClientIdentityRow>({
      sql: 'select first_name as "firstName", last_name as "lastName", email, phone, date_of_birth::text as "dateOfBirth", country, gender from app.clients where id = $1',
      values: [clientId],
    });

    return row;
  }

  async storedFileOf(storageKey: string): Promise<Buffer | null> {
    return readFile(join(this.rig.suite.mediaRoot(), storageKey)).catch(
      () => null,
    );
  }
}
