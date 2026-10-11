import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInNewTimeAcceptedEmail,
  checkInNewTimeAcceptedSubject,
  checkInNewTimeAcceptedText,
  type CheckInNewTimeAcceptedEmailProps,
} from "./check-in-new-time-accepted-email.server";

const WHEN = "Friday, 23 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";
const JOIN_URL = "https://evoa.fit/coach/checkins/ci-1/join";
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Ana+Popescu";

const PROPS: CheckInNewTimeAcceptedEmailProps = {
  who: "Ana Popescu",
  when: WHEN,
  joinUrl: JOIN_URL,
  googleCalendarUrl: CALENDAR_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInNewTimeAcceptedEmailProps): string {
  return renderToStaticMarkup(
    createElement(CheckInNewTimeAcceptedEmail, props),
  );
}

describe("check-in new time accepted email", () => {
  it("names who accepted the new time in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInNewTimeAcceptedSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu accepted the new time");
    expect(html).toContain("<title>Ana Popescu accepted the new time</title>");
  });

  it("names who accepted it and the new time", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeAcceptedText(props);

    // assert
    expect(html).toContain("CHECK-IN — NEW TIME ACCEPTED");
    expect(html).toContain("The new time is set.");
    expect(html).toContain("Here is who accepted it and when.");
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("links the recipient's join link and says when to use it", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeAcceptedText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${JOIN_URL}"[^>]*>Join the check-in</a>`),
    );
    expect(html).toContain("Use the button to join when it is time.");
    expect(text).toContain(`Join the check-in: ${JOIN_URL}`);
  });

  it("offers the new time to the calendar by link and by the attached invite", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInNewTimeAcceptedText(props);

    // assert
    expect(html).toContain(`href="${CALENDAR_URL.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(
      "A calendar file is attached to this email, so you can add the check-in to any calendar you use.",
    );
    expect(text).toContain(`Add to Google Calendar: ${CALENDAR_URL}`);
  });

  it("says why the recipient got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);

    // assert
    expect(html).toContain(
      "You received this email because a new time you proposed for a check-in was accepted on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
