import {
  FormDataParseError,
  MaxFileSizeExceededError,
  MaxTotalSizeExceededError,
  MultipartParseError,
  parseFormData,
} from "@remix-run/form-data-parser";

import { declaresLengthOver } from "./http.server";

type StreamingFormDataOptions<Received> = {
  maxTotalBytes: number;
  fileField: string;
  receiveFile: (bytes: AsyncIterable<Uint8Array>) => Promise<Received>;
};

type StreamingFormDataResult<Received> =
  | {
      status: "valid";
      fields: ReadonlyMap<string, string>;
      received: Received | null;
    }
  | { status: "too_large"; received: Received | null }
  | { status: "malformed"; received: Received | null };

const MAX_FORM_PARTS = 8;

class UnexpectedFilePartError extends Error {}

export async function readStreamingFormData<Received>(
  request: Request,
  options: StreamingFormDataOptions<Received>,
): Promise<StreamingFormDataResult<Received>> {
  if (!isFormDataRequest(request)) {
    return { status: "malformed", received: null };
  }

  if (declaresLengthOver(request, options.maxTotalBytes)) {
    return { status: "too_large", received: null };
  }

  let received: Received | null = null;

  try {
    const formData = await parseFormData(
      request,
      {
        maxFiles: 1,
        maxFileSize: options.maxTotalBytes,
        maxParts: MAX_FORM_PARTS,
        maxTotalSize: options.maxTotalBytes,
      },
      async (file) => {
        if (file.fieldName !== options.fileField) {
          throw new UnexpectedFilePartError();
        }

        received = await options.receiveFile(file.stream());

        return null;
      },
    );
    const fields = textFieldsOf(formData);

    return fields
      ? { status: "valid", fields, received }
      : { status: "malformed", received };
  } catch (error) {
    if (
      error instanceof MaxTotalSizeExceededError ||
      error instanceof MaxFileSizeExceededError
    ) {
      return { status: "too_large", received };
    }

    if (
      error instanceof UnexpectedFilePartError ||
      error instanceof FormDataParseError ||
      error instanceof MultipartParseError
    ) {
      return { status: "malformed", received };
    }

    throw error;
  }
}

function isFormDataRequest(request: Request): boolean {
  const mediaType = request.headers.get("Content-Type")?.split(";")[0];

  return mediaType?.trim().toLowerCase() === "multipart/form-data";
}

function textFieldsOf(formData: FormData): ReadonlyMap<string, string> | null {
  const fields = new Map<string, string>();

  for (const [name, value] of formData) {
    if (fields.has(name) || typeof value !== "string") {
      return null;
    }

    fields.set(name, value);
  }

  return fields;
}
