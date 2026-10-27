import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInNewTimeDeclinedEmail,
  checkInNewTimeDeclinedSubject,
  checkInNewTimeDeclinedText,
  type CheckInNewTimeDeclinedEmailProps,
} from "./check-in-new-time-declined-email.server";

const WHEN = "Friday, 23 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";

const PROPS: CheckInNewTimeDeclinedEmailProps = {
  who: "Ana Popescu",
  when: WHEN,
  currentYear: 2026,
};

function renderHtml(props: CheckInNewTimeDeclinedEmailProps): string {
  return renderToStaticMarkup(
    createElement(CheckInNewTimeDeclinedEmail, props),
  );
}

describe("check-in new time declined email", () => {
  it("names who declined the new time in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInNewTimeDeclinedSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu declined the new time");
    expect(html).toContain("<title>Ana Popescu declined the new time</title>");
  });

  it("names who acted and the time", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeDeclinedText(props);

    // assert
    expect(html).toContain("CHECK-IN — NEW TIME DECLINED");
    expect(html).toContain("The new time was declined.");
    expect(html).toContain(
      "Here is who declined it. The check-in is cancelled.",
    );
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("tells the recipient the hour is free again, with nothing to act on", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeDeclinedText(props);

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
      "You received this email because a new time you proposed for a check-in was declined on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
