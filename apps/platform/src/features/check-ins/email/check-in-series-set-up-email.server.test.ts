import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInSeriesSetUpEmail,
  checkInSeriesSetUpSubject,
  checkInSeriesSetUpText,
  type CheckInSeriesSetUpEmailProps,
} from "./check-in-series-set-up-email.server";

const WHEN = "Every Wednesday at 4:00 PM — Europe/London (GMT+1)";
const FIRST_WEEK = "Wednesday, 14 October 2026 at 4:00 PM";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInSeriesSetUpEmailProps = {
  coachName: "Eli",
  when: WHEN,
  firstWeek: FIRST_WEEK,
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInSeriesSetUpEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInSeriesSetUpEmail, props));
}

describe("check-in series set up email", () => {
  it("names the coach who set it up in its subject and its title", () => {
    // act
    const subject = checkInSeriesSetUpSubject(PROPS);
    const html = renderHtml(PROPS);

    // assert
    expect(subject).toBe("Eli set up a weekly check-in with you");
    expect(html).toContain(
      "<title>Eli set up a weekly check-in with you</title>",
    );
  });

  it("names the weekday and time in her zone and the first week", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesSetUpText(PROPS);

    // assert
    expect(html).toContain("CHECK-IN — WEEKLY");
    expect(html).toContain("A weekly check-in with Eli.");
    expect(html).toContain(
      "Eli booked a check-in every week until your paid period ends.",
    );
    expect(text).toContain(`WHEN: ${WHEN}`);
    expect(text).toContain(`FIRST WEEK: ${FIRST_WEEK}`);
  });

  it("links to her check-ins and offers no calendar", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesSetUpText(PROPS);

    // assert
    expect(html).toContain(`href="${CHECK_INS_URL}"`);
    expect(html).toContain("See your check-ins");
    expect(html).not.toContain("calendar");
    expect(text).toContain(`See your check-ins: ${CHECK_INS_URL}`);
  });

  it("says why she got it and credits the year", () => {
    // act
    const html = renderHtml(PROPS);

    // assert
    expect(html).toContain(
      "You received this email because your coach set up a weekly check-in with you on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
