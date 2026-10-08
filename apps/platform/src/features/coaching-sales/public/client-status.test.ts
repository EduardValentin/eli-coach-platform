import { describe, expect, it } from "vitest";

import {
  CLIENT_STATUS_GROUPS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_ORDER,
  clientStatusTone,
} from "./client-status";

describe("the client status vocabulary", () => {
  it("orders the statuses as the filter groups list them", () => {
    // arrange, act
    const order = CLIENT_STATUS_ORDER;

    // assert
    expect(order).toEqual([
      "invited",
      "onboarding",
      "awaiting-review",
      "in-review",
      "needs-details",
      "approved",
      "active",
      "cancelled",
      "inactive",
    ]);
  });

  it("names every status the way the coach reads it", () => {
    // arrange, act
    const labels = CLIENT_STATUS_ORDER.map(
      (status) => CLIENT_STATUS_LABELS[status],
    );

    // assert
    expect(labels).toEqual([
      "Invited",
      "Onboarding",
      "Awaiting review",
      "In review",
      "Needs details",
      "Approved",
      "Active",
      "Cancelled",
      "Inactive",
    ]);
  });

  it("groups the statuses under Onboarding, Active and Inactive", () => {
    // arrange, act
    const groups = CLIENT_STATUS_GROUPS;

    // assert
    expect(groups).toEqual([
      {
        label: "Onboarding",
        statuses: [
          "invited",
          "onboarding",
          "awaiting-review",
          "in-review",
          "needs-details",
          "approved",
        ],
      },
      { label: "Active", statuses: ["active"] },
      { label: "Inactive", statuses: ["cancelled", "inactive"] },
    ]);
  });

  it("tones each status as the prototype does", () => {
    // arrange, act
    const tones = CLIENT_STATUS_ORDER.map(clientStatusTone);

    // assert
    expect(tones).toEqual([
      "neutral",
      "neutral",
      "pending",
      "info",
      "pending",
      "info",
      "success",
      "muted",
      "muted",
    ]);
  });
});
