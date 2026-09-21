import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it } from "vitest";

import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";

import BookRoute from "./book-page";

const COACH_TIME_ZONE = "Pacific/Honolulu";

describe("assessment call booking page server rendering", () => {
  it("renders the booking page with its heading and first step, naming no zone", async () => {
    // arrange
    const html = await renderBookingPage({
      botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
      coachTimeZone: COACH_TIME_ZONE,
      slots: ["2026-03-02T15:00:00.000Z"],
      status: "open",
    });

    // act
    const visible = html.replace(/<!--[^>]*-->/g, "");

    // assert
    expect(visible).not.toContain("All times shown in your local timezone");
    expect(visible).not.toContain("GMT-10");
    expect(html).toContain("Free Call");
    expect(html).toContain("Select a Date &amp; Time");
  });

  it("offers the times again when availability could not be read", async () => {
    // arrange
    const html = await renderBookingPage({
      botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
      status: "unavailable",
    });

    // act
    // assert
    expect(html).toContain("Try again");
    expect(html).not.toContain("All times shown in your local timezone");
  });
});

async function renderBookingPage(page: unknown): Promise<string> {
  const handler = createStaticHandler([
    {
      Component: () => (
        <main aria-label="Public site content">
          <BookRoute />
        </main>
      ),
      loader: () => page,
      path: BOOK_PATH,
    },
  ]);
  const context = await handler.query(
    new Request(`https://eli.example${BOOK_PATH}`),
  );

  if (context instanceof Response) {
    throw new Error(`Expected route context, received ${context.status}.`);
  }

  return renderToString(
    <StaticRouterProvider
      context={context}
      router={createStaticRouter(handler.dataRoutes, context)}
    />,
  );
}
