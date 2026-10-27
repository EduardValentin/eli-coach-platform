import { refusedSubmission, unreachableSubmission } from "./failed-submission";
import {
  beginUpload,
  endUpload,
  reportAllBytesSent,
  reportBytesSent,
  type UploadProgress,
} from "./upload-progress";

type ServerAnswer = {
  body: string;
  contentType: string | null;
  httpStatus: number;
};

const NO_CONTENT = 204;
const FIRST_REFUSAL_STATUS = 400;
const NOT_ANSWERED = 0;

function sendTracked(
  request: Request,
  body: Blob,
  progress: UploadProgress,
): Promise<ServerAnswer | null> {
  return new Promise((resolve) => {
    if (request.signal.aborted) {
      resolve(null);
      return;
    }

    const xhr = new XMLHttpRequest();
    const abandon = () => xhr.abort();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        reportBytesSent(progress, event.loaded / event.total);
      }
    });
    xhr.upload.addEventListener("load", () => reportAllBytesSent(progress));
    xhr.addEventListener("loadend", () => {
      request.signal.removeEventListener("abort", abandon);
      resolve(
        xhr.status === NOT_ANSWERED
          ? null
          : {
              body: xhr.responseText,
              contentType: xhr.getResponseHeader("Content-Type"),
              httpStatus: xhr.status,
            },
      );
    });
    request.signal.addEventListener("abort", abandon, { once: true });

    xhr.open(request.method, request.url);
    const contentType = request.headers.get("Content-Type");
    if (contentType) {
      xhr.setRequestHeader("Content-Type", contentType);
    }
    xhr.send(body);
  });
}

function outcomeOf(answer: ServerAnswer): unknown {
  if (answer.httpStatus === NO_CONTENT) {
    return undefined;
  }

  const isRefused = answer.httpStatus >= FIRST_REFUSAL_STATUS;
  const isJson = answer.contentType?.includes("application/json") ?? false;

  if (isRefused && !isJson) {
    return refusedSubmission(answer.httpStatus);
  }

  const parsed: unknown = JSON.parse(answer.body);

  return isRefused
    ? Response.json(parsed, { status: answer.httpStatus })
    : parsed;
}

export async function uploadOutcomeOf(
  request: Request,
  progress: UploadProgress,
): Promise<unknown> {
  beginUpload(progress);

  try {
    const answer = await sendTracked(request, await request.blob(), progress);

    return answer === null ? unreachableSubmission() : outcomeOf(answer);
  } catch {
    return unreachableSubmission();
  } finally {
    endUpload(progress);
  }
}
