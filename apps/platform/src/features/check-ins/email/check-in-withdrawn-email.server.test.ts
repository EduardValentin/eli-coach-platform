import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInWithdrawnEmail,
  checkInWithdrawnSubject,
  checkInWithdrawnText,
  type CheckInWithdrawnEmailProps,
} from "./check-in-withdrawn-email.server";

const WHEN = "Thursday, 22 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";

const PROPS: CheckInWithdrawnEmailProps = {
  clientName: "Ana Popescu",
  when: WHEN,
  currentYear: 2026,
};

function renderHtml(props: CheckInWithdrawnEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInWithdrawnEmail, props));
}

describe("check-in withdrawn email", () => {
  it("names who withdrew in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInWithdrawnSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu withdrew the check-in request");
    expect(html).toContain(
      "<title>Ana Popescu withdrew the check-in request</title>",
    );
  });

  it("says the request was withdrawn and names its time, in the coach's zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInWithdrawnText(props);

    // assert
    expect(html).toContain("CHECK-IN — WITHDRAWN");
    expect(html).toContain("A request was withdrawn.");
    expect(html).toContain("Ana Popescu withdrew the check-in request.");
    expect(html).toContain(">WHEN<");
    expect(html).toContain(WHEN);
    expect(text).toContain("Ana Popescu withdrew the check-in request.");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("tells the coach the hour is free again, with nothing to act on", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInWithdrawnText(props);

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
    const text = checkInWithdrawnText(props);

    // assert
    const footer =
      "You received this email because a client withdrew a check-in request on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
    expect(text).toContain("© 2026 Evoa Fitness");
  });
});
