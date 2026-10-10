import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInApprovedEmail,
  checkInApprovedSubject,
  checkInApprovedText,
  type CheckInApprovedEmailProps,
} from "./check-in-approved-email.server";

const WHEN = "Thursday, 22 October 2026 at 3:00 PM — Europe/London (GMT+1)";
const JOIN_URL = "https://evoa.fit/client/checkins/ci-1/join";
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Eli";

const PROPS: CheckInApprovedEmailProps = {
  when: WHEN,
  joinUrl: JOIN_URL,
  googleCalendarUrl: CALENDAR_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInApprovedEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInApprovedEmail, props));
}

describe("check-in approved email", () => {
  it("tells her the check-in is approved in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInApprovedSubject();
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Your check-in is approved");
    expect(html).toContain("<title>Your check-in is approved</title>");
  });

  it("names the coach and the time, in the client's zone", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedText(props);

    // assert
    expect(html).toContain("CHECK-IN — APPROVED");
    expect(html).toContain("Your check-in is approved.");
    expect(html).toContain("Eli approved your check-in.");
    expect(html).toContain(">WHEN<");
    expect(html).toContain(WHEN);
    expect(text).toContain("Eli approved your check-in.");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("links Join Meet to her join link and says when to use it", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${JOIN_URL}"[^>]*>Join Meet</a>`),
    );
    expect(html).toContain("Use the button to join when it is time.");
    expect(text).toContain(`Join Meet: ${JOIN_URL}`);
    expect(text).toContain("Use the button to join when it is time.");
  });

  it("offers the check-in to her calendar by link and by the attached invite", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedText(props);

    // assert
    const attachmentLine =
      "A calendar file is attached to this email, so you can add the check-in to any calendar you use.";
    expect(html).toContain(`href="${CALENDAR_URL.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(">Add to Google Calendar</a>");
    expect(html).toContain(attachmentLine);
    expect(text).toContain(`Add to Google Calendar: ${CALENDAR_URL}`);
    expect(text).toContain(attachmentLine);
  });

  it("says why she got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInApprovedText(props);

    // assert
    const footer =
      "You received this email because your coach approved a check-in you asked for on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
    expect(text).toContain("© 2026 Evoa Fitness");
  });
});
