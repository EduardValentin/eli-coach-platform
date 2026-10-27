import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInSeriesChangedEmail,
  checkInSeriesChangedSubject,
  checkInSeriesChangedText,
  type CheckInSeriesChangedEmailProps,
} from "./check-in-series-changed-email.server";

const WHEN = "Every Friday at 9:00 AM — Europe/London (GMT+1)";
const FIRST_WEEK = "Friday, 16 October 2026 at 9:00 AM";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInSeriesChangedEmailProps = {
  coachName: "Eli",
  when: WHEN,
  firstWeek: FIRST_WEEK,
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInSeriesChangedEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInSeriesChangedEmail, props));
}

describe("check-in series changed email", () => {
  it("names the coach who changed it in its subject and its title", () => {
    // act
    const subject = checkInSeriesChangedSubject(PROPS);
    const html = renderHtml(PROPS);

    // assert
    expect(subject).toBe("Eli changed your weekly check-in");
    expect(html).toContain("<title>Eli changed your weekly check-in</title>");
  });

  it("names the new weekday and time in her zone and the first week", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesChangedText(PROPS);

    // assert
    expect(html).toContain("CHECK-IN — WEEKLY");
    expect(html).toContain("Your weekly check-in moved.");
    expect(html).toContain("Eli moved every week still to come.");
    expect(text).toContain(`WHEN: ${WHEN}`);
    expect(text).toContain(`FIRST WEEK: ${FIRST_WEEK}`);
  });

  it("links to her check-ins", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesChangedText(PROPS);

    // assert
    expect(html).toContain(`href="${CHECK_INS_URL}"`);
    expect(text).toContain(`See your check-ins: ${CHECK_INS_URL}`);
  });

  it("says why she got it and credits the year", () => {
    // act
    const html = renderHtml(PROPS);

    // assert
    expect(html).toContain(
      "You received this email because your coach changed your weekly check-in on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
