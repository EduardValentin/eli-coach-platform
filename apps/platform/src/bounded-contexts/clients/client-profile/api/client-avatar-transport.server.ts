import type {
  ReceivedClientAvatar,
  RemoveClientAvatarAsCoachUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadClientAvatarAsCoachUseCase,
  UploadOwnClientAvatarUseCase,
} from "@eli-coach-platform/domain/client-profile";
import {
  createBadRequestResponse,
  readFormDataRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";

import {
  CLIENT_AVATAR_FIELD,
  clientAvatarRefusalSchema,
  clientAvatarWrittenAnswerSchema,
  type ClientAvatarRefusal,
} from "~/bounded-contexts/clients/client-profile/public/client-avatar";

type AvatarWriteResult = Awaited<
  ReturnType<
    | UploadOwnClientAvatarUseCase["execute"]
    | UploadClientAvatarAsCoachUseCase["execute"]
    | RemoveOwnClientAvatarUseCase["execute"]
    | RemoveClientAvatarAsCoachUseCase["execute"]
  >
>;

type ReceivedAvatarPart =
  | { status: "received"; avatar: ReceivedClientAvatar }
  | { status: "unreadable" }
  | { status: "too-large" };

const AVATAR_REQUEST_MAX_BYTES = 32 * 1024 * 1024;

const REFUSAL_STATUS: Record<ClientAvatarRefusal["error"], number> = {
  "not-found": 404,
  "not-on-journey": 404,
  ended: 409,
  "not-accepted": 422,
  "rendition-refused": 422,
  "too-large": 413,
};

export async function receivedAvatarOf(
  request: Request,
): Promise<ReceivedAvatarPart> {
  const body = await readFormDataRequestBody(request, {
    maxBytes: AVATAR_REQUEST_MAX_BYTES,
  });

  if (body.status === "too_large") {
    return { status: "too-large" };
  }

  const part =
    body.status === "valid" ? body.formData.get(CLIENT_AVATAR_FIELD) : null;

  if (!(part instanceof File)) {
    return { status: "unreadable" };
  }

  return {
    status: "received",
    avatar: {
      mimeType: part.type,
      sizeBytes: part.size,
      bytes: new Uint8Array(await part.arrayBuffer()),
    },
  };
}

export function unreceivedAvatarResponse(
  part: Exclude<ReceivedAvatarPart, { status: "received" }>,
): Response {
  return part.status === "too-large"
    ? avatarRefusalResponse("too-large")
    : createBadRequestResponse("The avatar could not be read.");
}

export function avatarWrittenResponse(result: AvatarWriteResult): Response {
  if (result.status === "uploaded" || result.status === "removed") {
    return Response.json(
      clientAvatarWrittenAnswerSchema.parse({ status: result.status }),
    );
  }

  return avatarRefusalResponse(
    result.status === "refused" ? result.reason : result.status,
  );
}

function avatarRefusalResponse(error: ClientAvatarRefusal["error"]): Response {
  return Response.json(clientAvatarRefusalSchema.parse({ error }), {
    status: REFUSAL_STATUS[error],
  });
}
