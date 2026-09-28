import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

export const EMAIL_CAPTURE_PORT = 3199;
export const EMAIL_CAPTURE_URL = `http://127.0.0.1:${EMAIL_CAPTURE_PORT}`;

const EMAILS_PATH = "/emails";

type SentEmail = {
  html: string;
  id: string;
  subject: string;
  text: string;
  to: string[];
};

export type CapturedEmail = {
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
  const captureServer = createServer((request, response) => {
    void answerResendRequest({ request, response, sentEmails });
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
    html: latest.html,
    links: linksIn(latest),
    subject: latest.subject,
    text: latest.text,
  };
}

type CaptureExchange = {
  request: IncomingMessage;
  response: ServerResponse;
  sentEmails: SentEmail[];
};

async function answerResendRequest(exchange: CaptureExchange): Promise<void> {
  const url = new URL(exchange.request.url ?? "/", EMAIL_CAPTURE_URL);

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
    exchange.sentEmails.push(email);
    respondWithJson(exchange.response, { status: 200, body: { id: email.id } });
  } catch {
    respondWithJson(exchange.response, {
      status: 422,
      body: { name: "validation_error" },
    });
  }
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
  html?: string;
  subject?: string;
  text?: string;
  to: string | string[];
}): SentEmail {
  return {
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
