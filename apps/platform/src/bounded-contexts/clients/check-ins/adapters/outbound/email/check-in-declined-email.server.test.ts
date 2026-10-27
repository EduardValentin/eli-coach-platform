import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInDeclinedEmail,
  checkInDeclinedSubject,
  checkInDeclinedText,
  type CheckInDeclinedEmailProps,
} from "./check-in-declined-email.server";

const WHEN = "Thursday, 22 October 2026 at 3:00 PM — Europe/London (GMT+1)";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInDeclinedEmailProps = {
  when: WHEN,
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInDeclinedEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInDeclinedEmail, props));
}

describe("check-in declined email", () => {
  it("names the coach in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInDeclinedSubject();
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Eli could not make your check-in time");
    expect(html).toContain(
      "<title>Eli could not make your check-in time</title>",
    );
  });

  it("says the coach could not make the time she asked for, in her zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInDeclinedText(props);

    // assert
    expect(html).toContain("CHECK-IN — DECLINED");
    expect(html).toContain("Eli could not make that time.");
    expect(html).toContain("You can pick another time on your Check-ins page.");
    expect(html).toContain(">YOU ASKED FOR<");
    expect(html).toContain(WHEN);
    expect(text).toContain("Eli could not make that time.");
    expect(text).toContain(`YOU ASKED FOR: ${WHEN}`);
  });

  it("links her to her Check-ins page to pick another time", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInDeclinedText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${CHECK_INS_URL}"[^>]*>Pick another time</a>`),
    );
    expect(text).toContain(`Pick another time: ${CHECK_INS_URL}`);
  });

  it("says why she got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInDeclinedText(props);

    // assert
    const footer =
      "You received this email because your coach answered a check-in you asked for on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
    expect(text).toContain("© 2026 Evoa Fitness");
  });
});
