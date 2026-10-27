import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInNewTimeEmail,
  checkInNewTimeSubject,
  checkInNewTimeText,
  type CheckInNewTimeEmailProps,
} from "./check-in-new-time-email.server";

const EARLIER = "Thursday, 22 October 2026 at 3:00 PM — Europe/London (GMT+1)";
const WHEN = "Friday, 23 October 2026 at 3:00 PM — Europe/London (GMT+1)";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInNewTimeEmailProps = {
  who: "Eli",
  earlier: EARLIER,
  when: WHEN,
  note: "Something came up on Thursday.",
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInNewTimeEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInNewTimeEmail, props));
}

describe("check-in new time email", () => {
  it("names who proposed the new time in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInNewTimeSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Eli proposed a new time for your check-in");
    expect(html).toContain(
      "<title>Eli proposed a new time for your check-in</title>",
    );
  });

  it("names who proposed it, the earlier time, the new time and the note", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeText(props);

    // assert
    expect(html).toContain("CHECK-IN — NEW TIME");
    expect(html).toContain("A new time for your check-in.");
    expect(html).toContain("Here is who proposed it and when.");
    expect(text).toContain("WHO: Eli");
    expect(text).toContain(`EARLIER: ${EARLIER}`);
    expect(text).toContain(`NEW TIME: ${WHEN}`);
    expect(text).toContain("NOTE: Something came up on Thursday.");
  });

  it("leaves the note out when the proposer wrote none", () => {
    // arrange
    const props = { ...PROPS, note: "   " };

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeText(props);

    // assert
    expect(html).not.toContain(">NOTE<");
    expect(text).not.toContain("NOTE:");
  });

  it("links the recipient's Check-ins page to answer the proposal", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${CHECK_INS_URL}"[^>]*>Answer the proposal</a>`),
    );
    expect(text).toContain(`Answer the proposal: ${CHECK_INS_URL}`);
  });

  it("says why the recipient got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);

    // assert
    expect(html).toContain(
      "You received this email because a new time was proposed for one of your check-ins on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
