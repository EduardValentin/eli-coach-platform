import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInApprovedByClientEmail,
  checkInApprovedByClientSubject,
  checkInApprovedByClientText,
  type CheckInApprovedByClientEmailProps,
} from "./check-in-approved-by-client-email.server";

const WHEN = "Thursday, 22 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";
const JOIN_URL = "https://evoa.fit/coach/checkins/ci-1/join";
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Ana+Popescu";

const PROPS: CheckInApprovedByClientEmailProps = {
  clientName: "Ana Popescu",
  when: WHEN,
  joinUrl: JOIN_URL,
  googleCalendarUrl: CALENDAR_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInApprovedByClientEmailProps): string {
  return renderToStaticMarkup(
    createElement(CheckInApprovedByClientEmail, props),
  );
}

describe("check-in approved by client email", () => {
  it("names the client who approved in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInApprovedByClientSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu approved the check-in");
    expect(html).toContain("<title>Ana Popescu approved the check-in</title>");
  });

  it("names who approved and the time, in the coach's zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedByClientText(props);

    // assert
    expect(html).toContain("CHECK-IN — APPROVED");
    expect(html).toContain("Your check-in is approved.");
    expect(html).toContain("Here is who approved it and when.");
    expect(html).toContain(">WHO<");
    expect(html).toContain("Ana Popescu");
    expect(html).toContain(WHEN);
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("links the coach's join link and says when to use it", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedByClientText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${JOIN_URL}"[^>]*>Join Meet</a>`),
    );
    expect(html).toContain("Use the button to join when it is time.");
    expect(text).toContain(`Join Meet: ${JOIN_URL}`);
  });

  it("offers the check-in to her calendar by link and by the attached invite", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedByClientText(props);

    // assert
    const attachmentLine =
      "A calendar file is attached to this email, so you can add the check-in to any calendar you use.";
    expect(html).toContain(`href="${CALENDAR_URL.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(">Add to Google Calendar</a>");
    expect(html).toContain(attachmentLine);
    expect(text).toContain(`Add to Google Calendar: ${CALENDAR_URL}`);
  });

  it("says why the coach got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);

    // assert
    expect(html).toContain(
      "You received this email because a client answered a check-in you scheduled on the Evoa site.",
    );
    expect(html).toContain("© 2026 Evoa Fitness");
  });
});
