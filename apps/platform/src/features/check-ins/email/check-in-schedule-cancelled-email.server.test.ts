import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInScheduleCancelledEmail,
  checkInScheduleCancelledSubject,
  checkInScheduleCancelledText,
  type CheckInScheduleCancelledEmailProps,
} from "./check-in-schedule-cancelled-email.server";

const WHEN = "Thursday, 22 October 2026 at 3:00 PM — Europe/London (GMT+1)";

const PROPS: CheckInScheduleCancelledEmailProps = {
  when: WHEN,
  currentYear: 2026,
};

function renderHtml(props: CheckInScheduleCancelledEmailProps): string {
  return renderToStaticMarkup(
    createElement(CheckInScheduleCancelledEmail, props),
  );
}

describe("check-in schedule cancelled email", () => {
  it("names the coach who cancelled in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInScheduleCancelledSubject();
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Eli cancelled the check-in request");
    expect(html).toContain("<title>Eli cancelled the check-in request</title>");
  });

  it("says the request was cancelled and names its time, in her zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduleCancelledText(props);

    // assert
    expect(html).toContain("CHECK-IN — CANCELLED");
    expect(html).toContain("A request was cancelled.");
    expect(html).toContain("Eli cancelled the check-in request.");
    expect(html).toContain(">WHEN<");
    expect(html).toContain(WHEN);
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("tells her no check-in is planned for that hour, with nothing to act on", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduleCancelledText(props);

    // assert
    expect(html).toContain("No check-in is planned for that hour.");
    expect(html).not.toContain("<a ");
    expect(text).toContain("No check-in is planned for that hour.");
  });

  it("says why she got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduleCancelledText(props);

    // assert
    const footer =
      "You received this email because your coach cancelled a check-in request on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
  });
});
