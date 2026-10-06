type UploadPhase = "idle" | "sending" | "sent";

export type UploadProgressSnapshot = {
  readonly fraction: number;
  readonly phase: UploadPhase;
};

export type UploadProgress = {
  readonly getSnapshot: () => UploadProgressSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
};

type ProgressWriter = (snapshot: UploadProgressSnapshot) => void;

export const IDLE_UPLOAD_PROGRESS: UploadProgressSnapshot = Object.freeze({
  fraction: 0,
  phase: "idle",
});
const ALL_BYTES_SENT: UploadProgressSnapshot = Object.freeze({
  fraction: 1,
  phase: "sent",
});

const progressWriters = new WeakMap<UploadProgress, ProgressWriter>();

export function createUploadProgress(): UploadProgress {
  let current = IDLE_UPLOAD_PROGRESS;
  const listeners = new Set<() => void>();

  const progress: UploadProgress = Object.freeze({
    getSnapshot: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  });

  progressWriters.set(progress, (next) => {
    if (next.phase === current.phase && next.fraction === current.fraction) {
      return;
    }

    current = next;
    listeners.forEach((listener) => listener());
  });

  return progress;
}

function write(progress: UploadProgress, snapshot: UploadProgressSnapshot) {
  progressWriters.get(progress)?.(snapshot);
}

export function beginUpload(progress: UploadProgress) {
  write(progress, Object.freeze({ fraction: 0, phase: "sending" }));
}

export function reportBytesSent(progress: UploadProgress, fraction: number) {
  write(progress, Object.freeze({ fraction, phase: "sending" }));
}

export function reportAllBytesSent(progress: UploadProgress) {
  write(progress, ALL_BYTES_SENT);
}

export function endUpload(progress: UploadProgress) {
  write(progress, IDLE_UPLOAD_PROGRESS);
}
