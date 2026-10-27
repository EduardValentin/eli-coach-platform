import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInScheduledEmail,
  checkInScheduledSubject,
  checkInScheduledText,
  type CheckInScheduledEmailProps,
} from "./check-in-scheduled-email.server";

const WHEN = "Thursday, 22 October 2026 at 3:00 PM — Europe/London (GMT+1)";
const CHECK_INS_URL = "https://evoa.fit/client/checkins";

const PROPS: CheckInScheduledEmailProps = {
  note: "Let's review your first month.",
  when: WHEN,
  checkInsUrl: CHECK_INS_URL,
  currentYear: 2026,
};

function renderHtml(props: CheckInScheduledEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInScheduledEmail, props));
}

describe("check-in scheduled email", () => {
  it("names the coach who scheduled it in its subject and its title", () => {
    // arrange
    const props = PROPS;

    // act
    const subject = checkInScheduledSubject();
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Eli scheduled a check-in with you");
    expect(html).toContain("<title>Eli scheduled a check-in with you</title>");
  });

  it("names the time in her zone and the coach's note", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduledText(props);

    // assert
    expect(html).toContain("CHECK-IN — NEW REQUEST");
    expect(html).toContain("A check-in with Eli.");
    expect(html).toContain("Eli picked a time. You can approve or decline it.");
    expect(html).toContain(">WHEN<");
    expect(html).toContain(WHEN);
    expect(html).toContain(">NOTE<");
    expect(html).toContain("Let&#x27;s review your first month.");
    expect(text).toContain(`WHEN: ${WHEN}`);
    expect(text).toContain("NOTE: Let's review your first month.");
  });

  it("leaves the note out when the coach wrote none", () => {
    // arrange
    const props = { ...PROPS, note: null };

    // act
    const html = renderHtml(props);
    const text = checkInScheduledText(props);

    // assert
    expect(html).not.toContain(">NOTE<");
    expect(text).not.toContain("NOTE:");
  });

  it("links the answer to her Check-ins page", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduledText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${CHECK_INS_URL}"[^>]*>Answer the request</a>`),
    );
    expect(text).toContain(`Answer the request: ${CHECK_INS_URL}`);
  });

  it("says why she got it and credits the year", () => {
    // arrange
    const props = PROPS;

    // act
    const html = renderHtml(props);
    const text = checkInScheduledText(props);

    // assert
    const footer =
      "You received this email because your coach scheduled a check-in with you on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
    expect(text).toContain("© 2026 Evoa Fitness");
  });
});
