import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInCancelledEmail,
  checkInCancelledSubject,
  checkInCancelledText,
  type CheckInCancelledEmailProps,
} from "./check-in-cancelled-email.server";

const WHEN = "Friday, 23 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";

const PROPS: CheckInCancelledEmailProps = {
  who: "Ana Popescu",
  when: WHEN,
  currentYear: 2026,
};

function renderHtml(props: CheckInCancelledEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInCancelledEmail, props));
}

describe("check-in cancelled email", () => {
  it("names who cancelled the check-in in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInCancelledSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu cancelled the check-in");
    expect(html).toContain("<title>Ana Popescu cancelled the check-in</title>");
  });

  it("names who acted and the time", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInCancelledText(props);

    // assert
    expect(html).toContain("CHECK-IN — CANCELLED");
    expect(html).toContain("A check-in was cancelled.");
    expect(html).toContain("Here is who cancelled it and when.");
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("tells the recipient the hour is free again, with nothing to act on", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInCancelledText(props);

    // assert
    expect(html).toContain("That hour is free again.");
    expect(html).not.toContain("<a ");
    expect(text).toContain("That hour is free again.");
  });

  it("says why the recipient got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);

    // assert
    expect(html).toContain(
      "You received this email because a check-in you had planned was cancelled on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
