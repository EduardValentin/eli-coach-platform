import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInSeriesStoppedEmail,
  checkInSeriesStoppedSubject,
  checkInSeriesStoppedText,
  type CheckInSeriesStoppedEmailProps,
} from "./check-in-series-stopped-email.server";

const WHEN = "Every Wednesday at 4:00 PM — Europe/London (GMT+1)";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInSeriesStoppedEmailProps = {
  coachName: "Eli",
  when: WHEN,
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInSeriesStoppedEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInSeriesStoppedEmail, props));
}

describe("check-in series stopped email", () => {
  it("names the coach who stopped it in its subject and its title", () => {
    // act
    const subject = checkInSeriesStoppedSubject(PROPS);
    const html = renderHtml(PROPS);

    // assert
    expect(subject).toBe("Eli stopped your weekly check-in");
    expect(html).toContain("<title>Eli stopped your weekly check-in</title>");
  });

  it("names the weekday and time that stopped, in her zone", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesStoppedText(PROPS);

    // assert
    expect(html).toContain("CHECK-IN — WEEKLY");
    expect(html).toContain("Your weekly check-in has stopped.");
    expect(html).toContain("Eli cancelled every week still to come.");
    expect(text).toContain(`WHEN: ${WHEN}`);
    expect(text).not.toContain("FIRST WEEK");
  });

  it("links to her check-ins and tells her the hours are free again", () => {
    // act
    const html = renderHtml(PROPS);
    const text = checkInSeriesStoppedText(PROPS);

    // assert
    expect(html).toContain(`href="${CHECK_INS_URL}"`);
    expect(html).toContain("The hours are free again.");
    expect(text).toContain(`See your check-ins: ${CHECK_INS_URL}`);
    expect(text).toContain("The hours are free again.");
  });

  it("says why she got it and credits the year", () => {
    // act
    const html = renderHtml(PROPS);

    // assert
    expect(html).toContain(
      "You received this email because your coach stopped your weekly check-in on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
