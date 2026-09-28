import { describe, expect, it } from "vitest";

import { DetailRequest } from "./detail-request";

const ASKED_AT = new Date("2026-09-29T10:00:00.000Z");
const ANSWERED_AT = new Date("2026-09-30T10:00:00.000Z");

function raisedRequest(): DetailRequest {
  return DetailRequest.raise({
    id: "request-1",
    clientId: "client-1",
    questionIds: [{ formId: "goal-availability", fieldId: "weight" }],
    note: "Please weigh yourself in the morning.",
    askedAt: ASKED_AT,
  });
}

describe("DetailRequest", () => {
  it("is open once raised", () => {
    // arrange
    const request = raisedRequest();

    // act
    const open = request.isOpen();

    // assert
    expect(open).toBe(true);
    expect(request.answeredAt).toBeNull();
  });

  it("closes once answered and keeps what was asked", () => {
    // arrange
    const request = raisedRequest();

    // act
    const answered = request.answer(ANSWERED_AT);

    // assert
    expect(answered.isOpen()).toBe(false);
    expect(answered.toSnapshot()).toEqual({
      id: "request-1",
      clientId: "client-1",
      questionIds: [{ formId: "goal-availability", fieldId: "weight" }],
      note: "Please weigh yourself in the morning.",
      askedAt: ASKED_AT,
      answeredAt: ANSWERED_AT,
    });
    expect(request.isOpen()).toBe(true);
  });

  it("asks exactly the questions it names", () => {
    // arrange
    const request = raisedRequest();

    // act
    const asksWeight = request.asks({
      formId: "goal-availability",
      fieldId: "weight",
    });
    const asksHeight = request.asks({
      formId: "goal-availability",
      fieldId: "height",
    });

    // assert
    expect(asksWeight).toBe(true);
    expect(asksHeight).toBe(false);
  });

  it("reconstitutes an answered request from its snapshot", () => {
    // arrange
    const snapshot = raisedRequest().answer(ANSWERED_AT).toSnapshot();

    // act
    const request = DetailRequest.reconstitute(snapshot);

    // assert
    expect(request.toSnapshot()).toEqual(snapshot);
  });
});
