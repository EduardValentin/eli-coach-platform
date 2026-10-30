import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckInRequestedEmail,
  checkInRequestedSubject,
  checkInRequestedText,
  type CheckInRequestedEmailProps,
} from "./check-in-requested-email.server";

const WHEN = "Thursday, 22 October 2026 at 5:00 PM — Europe/Bucharest (GMT+3)";
const REVIEW_URL = "https://evoa.fit/coach/checkins";

function propsWith(
  overrides: Partial<CheckInRequestedEmailProps> = {},
): CheckInRequestedEmailProps {
  return {
    clientName: "Ana Popescu",
    note: null,
    when: WHEN,
    reviewUrl: REVIEW_URL,
    currentYear: 2026,
    ...overrides,
  };
}

function renderHtml(props: CheckInRequestedEmailProps): string {
  return renderToStaticMarkup(createElement(CheckInRequestedEmail, props));
}

describe("check-in requested email", () => {
  it("names who asked in its subject and its title", () => {
    // arrange
    const props = propsWith();

    // act
    const subject = checkInRequestedSubject(props);
    const html = renderHtml(props);

    // assert
    expect(subject).toBe("Ana Popescu asked for a check-in");
    expect(html).toContain("<title>Ana Popescu asked for a check-in</title>");
    expect(html).toContain('lang="en"');
  });

  it("announces the request and names who asked and when, in the coach's zone", () => {
    // arrange
    const props = propsWith();

    // act
    const html = renderHtml(props);
    const text = checkInRequestedText(props);

    // assert
    expect(html).toContain("CHECK-IN — NEW REQUEST");
    expect(html).toContain("A new check-in request.");
    expect(html).toContain("Here is who asked and when.");
    expect(html).toContain(">WHO<");
    expect(html).toContain(">Ana Popescu<");
    expect(html).toContain(">WHEN<");
    expect(html).toContain(WHEN);
    expect(text).toContain("WHO: Ana Popescu");
    expect(text).toContain(`WHEN: ${WHEN}`);
  });

  it("shows her note when she wrote one", () => {
    // arrange
    const props = propsWith({ note: "My knee felt sore after Tuesday." });

    // act
    const html = renderHtml(props);
    const text = checkInRequestedText(props);

    // assert
    expect(html).toContain(">NOTE<");
    expect(html).toContain("My knee felt sore after Tuesday.");
    expect(text).toContain("NOTE: My knee felt sore after Tuesday.");
  });

  it("leaves the note out when she wrote none", () => {
    // arrange
    const props = propsWith({ note: null });

    // act
    const html = renderHtml(props);
    const text = checkInRequestedText(props);

    // assert
    expect(html).not.toContain("NOTE");
    expect(text).not.toContain("NOTE");
  });

  it("links the coach to her Check-ins page to review the request", () => {
    // arrange
    const props = propsWith();

    // act
    const html = renderHtml(props);
    const text = checkInRequestedText(props);

    // assert
    expect(html).toMatch(
      new RegExp(`<a href="${REVIEW_URL}"[^>]*>Review the request</a>`),
    );
    expect(text).toContain(`Review the request: ${REVIEW_URL}`);
  });

  it("says why the coach got it and credits the year", () => {
    // arrange
    const props = propsWith();

    // act
    const html = renderHtml(props);
    const text = checkInRequestedText(props);

    // assert
    const footer =
      "You received this email because a client asked for a check-in on the Evoa site.";
    expect(html).toContain(footer);
    expect(html).toContain("© 2026 Evoa Fitness");
    expect(text).toContain(footer);
    expect(text).toContain("© 2026 Evoa Fitness");
  });
});
