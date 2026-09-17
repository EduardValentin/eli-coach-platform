import { describe, expect, it } from "vitest";

import { InMemoryProductEmail } from "./in-memory-product-email.server";

describe("InMemoryProductEmail", () => {
  it("records the sent command and returns a sent result with a message id", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const command = {
      html: "<p>Hi</p>",
      subject: "Subject",
      text: "Hi",
      to: "eli@example.com",
    };

    // act
    const result = await productEmail.send(command);

    // assert
    expect(productEmail.sent).toEqual([command]);
    expect(result).toEqual({ kind: "sent", providerMessageId: "memory-1" });
  });

  it("accumulates every sent command in order", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();

    // act
    await productEmail.send({
      html: "<p>One</p>",
      subject: "One",
      text: "One",
      to: "one@example.com",
    });
    const secondResult = await productEmail.send({
      html: "<p>Two</p>",
      subject: "Two",
      text: "Two",
      to: "two@example.com",
    });

    // assert
    expect(productEmail.sent).toHaveLength(2);
    expect(productEmail.sent[1]).toMatchObject({ to: "two@example.com" });
    expect(secondResult).toEqual({
      kind: "sent",
      providerMessageId: "memory-2",
    });
  });
});
