import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

export const EMAIL_CAPTURE_PORT = 3199;
export const EMAIL_CAPTURE_URL = `http://127.0.0.1:${EMAIL_CAPTURE_PORT}`;
export const COACH_NOTIFICATION_EMAIL = "coach-notifications@e2e.invalid";

const EMAILS_PATH = "/emails";
const REFUSALS_PATH = "/refusals";

type SentEmail = {
  attachmentNames: string[];
  html: string;
  id: string;
  subject: string;
  text: string;
  to: string[];
};

export type CapturedEmail = {
  attachmentNames: string[];
  html: string;
  links: string[];
  subject: string;
  text: string;
};

const TEXT_LINK = /https?:\/\/[^\s"'<>)]+/g;
const HTML_HREF = /href="([^"]+)"/g;

let server: Server | null = null;

export async function startEmailCapture(): Promise<void> {
  const sentEmails: SentEmail[] = [];
  const refusedRecipients = new Set<string>();
  const captureServer = createServer((request, response) => {
    void answerCaptureRequest({
      request,
      response,
      sentEmails,
      refusedRecipients,
    });
  });

  await new Promise<void>((resolve, reject) => {
    captureServer.once("error", reject);
    captureServer.listen(EMAIL_CAPTURE_PORT, "127.0.0.1", resolve);
  });
  captureServer.unref();
  server = captureServer;
}

export async function stopEmailCapture(): Promise<void> {
  const captureServer = server;
  server = null;

  if (!captureServer) {
    return;
  }

  await new Promise<void>((resolve) => captureServer.close(() => resolve()));
}

export async function latestEmailTo(address: string): Promise<CapturedEmail> {
  const response = await fetch(
    `${EMAIL_CAPTURE_URL}${EMAILS_PATH}?${new URLSearchParams({ to: address })}`,
  );
  const [latest] = (await response.json()) as SentEmail[];

  if (!latest) {
    throw new Error(`No email has been sent to ${address}.`);
  }

  return {
    attachmentNames: latest.attachmentNames,
    html: latest.html,
    links: linksIn(latest),
    subject: latest.subject,
    text: latest.text,
  };
}

export async function refuseEmailsTo(address: string): Promise<void> {
  const response = await fetch(`${EMAIL_CAPTURE_URL}${REFUSALS_PATH}`, {
    body: JSON.stringify({ to: address }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`The email capture did not refuse ${address}.`);
  }
}

type CaptureExchange = {
  request: IncomingMessage;
  response: ServerResponse;
  sentEmails: SentEmail[];
  refusedRecipients: Set<string>;
};

async function answerCaptureRequest(exchange: CaptureExchange): Promise<void> {
  const url = new URL(exchange.request.url ?? "/", EMAIL_CAPTURE_URL);

  if (url.pathname === REFUSALS_PATH && exchange.request.method === "POST") {
    await recordRefusal(exchange);
    return;
  }

  if (url.pathname !== EMAILS_PATH) {
    respondWithJson(exchange.response, {
      status: 404,
      body: { name: "not_found" },
    });
    return;
  }

  if (exchange.request.method === "POST") {
    await captureSentEmail(exchange);
    return;
  }

  listEmailsSentTo(exchange, url.searchParams.get("to"));
}

async function captureSentEmail(exchange: CaptureExchange): Promise<void> {
  const body = await readBody(exchange.request);

  try {
    const email = toSentEmail(JSON.parse(body));

    if (
      email.to.some((recipient) => exchange.refusedRecipients.has(recipient))
    ) {
      respondWithJson(exchange.response, {
        status: 422,
        body: { name: "validation_error" },
      });
      return;
    }

    exchange.sentEmails.push(email);
    respondWithJson(exchange.response, { status: 200, body: { id: email.id } });
  } catch {
    respondWithJson(exchange.response, {
      status: 422,
      body: { name: "validation_error" },
    });
  }
}

async function recordRefusal(exchange: CaptureExchange): Promise<void> {
  const { to } = JSON.parse(await readBody(exchange.request)) as { to: string };
  exchange.refusedRecipients.add(to);
  respondWithJson(exchange.response, { status: 200, body: { to } });
}

function listEmailsSentTo(
  exchange: CaptureExchange,
  recipient: string | null,
): void {
  const received = exchange.sentEmails
    .filter((email) => recipient === null || email.to.includes(recipient))
    .reverse();
  respondWithJson(exchange.response, { status: 200, body: received });
}

function toSentEmail(payload: {
  attachments?: { filename?: string }[];
  html?: string;
  subject?: string;
  text?: string;
  to: string | string[];
}): SentEmail {
  return {
    attachmentNames: (payload.attachments ?? []).flatMap(({ filename }) =>
      filename ? [filename] : [],
    ),
    html: payload.html ?? "",
    id: randomUUID(),
    subject: payload.subject ?? "",
    text: payload.text ?? "",
    to: [payload.to].flat(),
  };
}

function linksIn(email: SentEmail): string[] {
  const textLinks = email.text.match(TEXT_LINK) ?? [];
  const htmlLinks = [...email.html.matchAll(HTML_HREF)].map(([, href]) =>
    href.replaceAll("&amp;", "&"),
  );

  return [...new Set([...textLinks, ...htmlLinks])];
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function respondWithJson(
  response: ServerResponse,
  reply: { body: unknown; status: number },
): void {
  response.writeHead(reply.status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(reply.body));
}
