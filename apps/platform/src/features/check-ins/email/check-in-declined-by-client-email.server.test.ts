import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInDeclinedByClientEmail,
  checkInDeclinedByClientSubject,
  checkInDeclinedByClientText,
  type CheckInDeclinedByClientEmailProps,
} from "./check-in-declined-by-client-email.server";

const WHEN = "Thursday, 22 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";

const PROPS: CheckInDeclinedByClientEmailProps = {
  clientName: "Ana Popescu",
  when: WHEN,
  currentYear: 2026,
};

function renderHtml(props: CheckInDeclinedByClientEmailProps): string {
  return renderToStaticMarkup(
    createElement(CheckInDeclinedByClientEmail, props),
  );
}

describe("check-in declined by client email", () => {
  it("names the client who declined in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInDeclinedByClientSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu declined the check-in");
    expect(html).toContain("<title>Ana Popescu declined the check-in</title>");
  });

  it("names who declined and the time, in the coach's zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInDeclinedByClientText(props);

    // assert
    expect(html).toContain("CHECK-IN — DECLINED");
    expect(html).toContain("Your check-in was declined.");
    expect(html).toContain("Here is who declined and when.");
    expect(html).toContain(">WHO<");
    expect(html).toContain(WHEN);
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("tells the coach the hour is free again, with nothing to act on", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInDeclinedByClientText(props);

    // assert
    expect(html).toContain("That hour is free again.");
    expect(html).not.toContain("<a ");
    expect(text).toContain("That hour is free again.");
  });

  it("says why the coach got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);

    // assert
    expect(html).toContain(
      "You received this email because a client answered a check-in you scheduled on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
