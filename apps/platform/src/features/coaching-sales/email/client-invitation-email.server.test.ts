import { describe, expect, it } from "vitest";

import { createClientInvitationEmailContent } from "./client-invitation-email.server";

const OPTIONS = {
  acceptUrl: "https://evoa.fit/eli-coach-platform/invitation#raw-token",
  contactEmail: "contact@evoa.fit",
  currentYear: 2026,
  firstName: "Ana",
};

const OPENING =
  "Thank you — your place in my coaching is booked. Create your account from the button below; it takes a minute. Then you'll answer a short form about you, and I'll build your program from your answers.";
const VALIDITY =
  "This link works for the next 30 days. You have to create your account from it — reading this email isn't enough. If it runs out, tell me and I'll send you a new one.";
const NEXT_STEPS = [
  "Create your account from the button above.",
  "Answer a short form about your goals, your health and your day-to-day.",
  "I build your program, and you'll find it right here in your account.",
];
const REASSURANCE =
  "This is your personal invitation — please don't forward it. It belongs to your email address alone.";

describe("createClientInvitationEmailContent", () => {
  it("uses the approved subject as the preview text", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.subject).toBe("Your place is booked — create your account.");
    expect(content.html).toContain(
      "<title>Your place is booked — create your account.</title>",
    );
  });

  it("carries the eyebrow, heading and subhead", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.html).toContain("INVITATION — 1-ON-1 COACHING");
    expect(content.html).toContain("Your place is booked.");
    expect(content.html).toContain("Let&#x27;s get you set up.");
    expect(content.text).toContain(
      "Your place is booked.\nLet's get you set up.",
    );
  });

  it("greets her by first name and carries the letter and its sign-off in the html and text", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.text).toContain(
      ["Hi Ana,", OPENING, VALIDITY, "— Eli"].join("\n"),
    );
    for (const paragraph of ["Hi Ana,", OPENING, VALIDITY, "— Eli"]) {
      expect(content.html).toContain(escapeHtml(paragraph));
    }
  });

  it("links the create-account button and its text line to the invitation link", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.html).toContain(`href="${OPTIONS.acceptUrl}"`);
    expect(content.html).toContain("Create your account");
    expect(content.text).toContain(`Create your account: ${OPTIONS.acceptUrl}`);
  });

  it("lists what happens next in order", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.html).toContain("WHAT HAPPENS NEXT");
    expect(content.text).toContain(
      [
        "What happens next",
        ...NEXT_STEPS.map((step, index) => `0${index + 1} ${step}`),
      ].join("\n"),
    );
    for (const step of NEXT_STEPS) {
      expect(content.html).toContain(escapeHtml(step));
    }
  });

  it("keeps the personal-invitation reassurance and the contact line", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    expect(content.html).toContain(escapeHtml(REASSURANCE));
    expect(content.text).toContain(REASSURANCE);
    expect(content.html).toContain(`href="mailto:${OPTIONS.contactEmail}"`);
    expect(content.text).toContain(
      `Questions? Reply to this email or write to ${OPTIONS.contactEmail}.`,
    );
  });

  it("says why she received it in the footer", () => {
    // arrange
    const options = OPTIONS;

    // act
    const content = createClientInvitationEmailContent(options);

    // assert
    const footer =
      "You received this email because Eli invited you to 1-on-1 coaching.";

    expect(content.html).toContain(footer);
    expect(content.text).toContain(footer);
    expect(content.text).toContain("© 2026 Evoa Fitness");
  });
});

function escapeHtml(text: string): string {
  return text.replaceAll("'", "&#x27;");
}
