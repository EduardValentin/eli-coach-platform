import { describe, expect, it } from "vitest";

import { createDetailsRequestEmailContent } from "./details-request-email.server";

const OPTIONS = {
  contactEmail: "contact@evoa.fit",
  currentYear: 2026,
  firstName: "Ana",
  portalUrl: "https://evoa.fit/app/client",
};

const BODY =
  "I've gone through your answers and need a few more details before I build your program. Open your portal and you'll see what I asked.";

describe("createDetailsRequestEmailContent", () => {
  it("uses the approved subject as the preview text", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createDetailsRequestEmailContent(options);

    // assert
    expect(content.subject).toBe("Eli needs a few more details");
    expect(content.html).toContain(
      "<title>Eli needs a few more details</title>",
    );
  });

  it("carries the heading, the greeting by first name, the body and the sign-off in the html and text", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createDetailsRequestEmailContent(options);

    // assert
    expect(content.text).toContain(
      ["A few more details", "", "Hi Ana,", BODY, "", "Answer now"].join("\n"),
    );
    for (const line of ["A few more details", "Hi Ana,", BODY, "— Eli"]) {
      expect(content.html).toContain(escapeHtml(line));
      expect(content.text).toContain(line);
    }
  });

  it("links the answer button and its text line to her portal", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createDetailsRequestEmailContent(options);

    // assert
    expect(content.html).toContain(`href="${OPTIONS.portalUrl}"`);
    expect(content.html).toContain("Answer now");
    expect(content.text).toContain(`Answer now: ${OPTIONS.portalUrl}`);
  });

  it("keeps the contact link and the copyright line", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createDetailsRequestEmailContent(options);

    // assert
    expect(content.html).toContain(`href="mailto:${OPTIONS.contactEmail}"`);
    expect(content.html).toContain("Contact");
    expect(content.html).toContain("© 2026 Evoa Fitness");
    expect(content.text).toContain(`Contact: ${OPTIONS.contactEmail}`);
    expect(content.text).toContain("© 2026 Evoa Fitness");
  });

  it("never carries the coach's note, a question or any request or client id", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createDetailsRequestEmailContent(options);

    // assert
    for (const body of [content.html, content.text]) {
      expect(body).not.toContain("Your weight and check-in day look off.");
      expect(body).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      );
      expect(body).not.toContain("data-");
    }
    expect(content.html.match(/href="[^"]*"/g)).toEqual([
      `href="${OPTIONS.portalUrl}"`,
      `href="mailto:${OPTIONS.contactEmail}"`,
    ]);
  });
});

function escapeHtml(text: string): string {
  return text.replaceAll("'", "&#x27;");
}
