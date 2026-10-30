import { describe, expect, it } from "vitest";

import { InMemoryProductEmailAdapter } from "./in-memory-product-email-adapter.server";

describe("InMemoryProductEmail", () => {
  it("records the sent command and returns a sent result with a message id", async () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();
    const command = {
      html: "<p>Hi</p>",
      subject: "Subject",
      text: "Hi",
      to: "eli@example.com",
    };

    // act
    const result = await inMemoryProductEmailAdapter.send(command);

    // assert
    expect(inMemoryProductEmailAdapter.sent).toEqual([command]);
    expect(result).toEqual({ kind: "sent", providerMessageId: "memory-1" });
  });

  it("accumulates every sent command in order", async () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();

    // act
    await inMemoryProductEmailAdapter.send({
      html: "<p>One</p>",
      subject: "One",
      text: "One",
      to: "one@example.com",
    });
    const secondResult = await inMemoryProductEmailAdapter.send({
      html: "<p>Two</p>",
      subject: "Two",
      text: "Two",
      to: "two@example.com",
    });

    // assert
    expect(inMemoryProductEmailAdapter.sent).toHaveLength(2);
    expect(inMemoryProductEmailAdapter.sent[1]).toMatchObject({
      to: "two@example.com",
    });
    expect(secondResult).toEqual({
      kind: "sent",
      providerMessageId: "memory-2",
    });
  });
});
