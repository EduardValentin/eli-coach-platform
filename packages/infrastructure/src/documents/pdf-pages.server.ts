import { Worker } from "node:worker_threads";

import type {
  PageRendition,
  PdfPagesAnswer,
  PdfPagesQuestion,
  PdfPagesReply,
} from "./pdf-pages-messages.server";

export type PdfPages = {
  readonly pageCount: number;
  renderPage(pageNumber: number, rendition: PageRendition): Promise<Uint8Array>;
  close(): Promise<void>;
};

export type PdfPagesOpening =
  { status: "opened"; pages: PdfPages } | { status: "unreadable" };

type PdfToOpen = { bytes: Uint8Array; longestEdge: number };

type PendingAnswer = {
  resolve: (answer: PdfPagesAnswer) => void;
  reject: (error: Error) => void;
};

export async function openPdfPages(
  workerUrl: URL,
  pdf: PdfToOpen,
): Promise<PdfPagesOpening> {
  const worker = new PdfPagesWorker(workerUrl);

  try {
    const answer = await worker.ask({ kind: "open", ...pdf });

    if (answer.kind === "opened") {
      return { status: "opened", pages: pagesOf(worker, answer.pageCount) };
    }

    await worker.stop();
    return { status: "unreadable" };
  } catch (error) {
    await worker.stop();
    throw error;
  }
}

function pagesOf(worker: PdfPagesWorker, pageCount: number): PdfPages {
  return {
    pageCount,
    async renderPage(pageNumber, rendition) {
      const answer = await worker.ask({
        kind: "render",
        pageNumber,
        rendition,
      });

      if (answer.kind !== "rendered") {
        throw new Error(`Page ${pageNumber} could not be rendered.`, {
          cause: answer,
        });
      }

      return answer.bytes;
    },
    close: () => worker.stop(),
  };
}

const PDF_WORKER_HEAP_LIMIT_MB = 1024;

class PdfPagesWorker {
  readonly #worker: Worker;
  readonly #pending = new Map<number, PendingAnswer>();
  #nextRequestId = 1;
  #stopped: Error | undefined;

  constructor(workerUrl: URL) {
    this.#worker = new Worker(workerUrl, {
      resourceLimits: { maxOldGenerationSizeMb: PDF_WORKER_HEAP_LIMIT_MB },
    });
    this.#worker.on("message", (reply: PdfPagesReply) => this.#settle(reply));
    this.#worker.on("error", (error) => this.#failEveryPending(error));
    this.#worker.on("exit", (code) =>
      this.#failEveryPending(
        new Error(`The PDF pages worker stopped with exit code ${code}.`),
      ),
    );
  }

  ask(question: PdfPagesQuestion): Promise<PdfPagesAnswer> {
    if (this.#stopped) {
      return Promise.reject(this.#stopped);
    }

    const requestId = this.#nextRequestId++;

    return new Promise((resolve, reject) => {
      this.#pending.set(requestId, { resolve, reject });
      this.#worker.postMessage({ ...question, requestId });
    });
  }

  async stop(): Promise<void> {
    this.#stopped ??= new Error("The PDF pages worker was closed.");
    await this.#worker.terminate();
  }

  #settle({ requestId, ...answer }: PdfPagesReply): void {
    const pending = this.#pending.get(requestId);
    this.#pending.delete(requestId);
    pending?.resolve(answer);
  }

  #failEveryPending(error: Error): void {
    this.#stopped ??= error;

    for (const pending of this.#pending.values()) {
      pending.reject(error);
    }

    this.#pending.clear();
  }
}
