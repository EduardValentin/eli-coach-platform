import { describe, expect, it } from "vitest";

import { createStoreDeliveryEmailContent } from "./store-delivery-email-template.server";

describe("createStoreDeliveryEmailContent", () => {
  it("renders the approved single-resource delivery variant", () => {
    // arrange
    const downloadUrl =
      "https://eli.example/store/download#opaque-download-token";

    // act
    const content = createStoreDeliveryEmailContent({
      contactEmail: "contact@evoa.fit",
      currentYear: 2026,
      downloadUrl,
      resources: [
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
      ],
    });

    // assert
    expect(content.subject).toBe("Your guide is ready");
    expect(content.html).toContain(downloadUrl);
    expect(content.text).toContain(downloadUrl);
    expect(content.html.match(/Download your guide/g)).toHaveLength(1);
    expect(content.html).toContain("EVOA");
    expect(content.html).toContain("Coaching for women");
    expect(content.html).toContain("Hormone Harmony");
    expect(content.html).toContain("E-Books");
    expect(content.html).toContain(
      "no marketing, just your download",
    );
    expect(content.html).toContain("mailto:contact@evoa.fit");
    expect(content.html).toContain("© 2026 Evoa Fitness");
  });

  it("renders the approved multiple-resource delivery variant", () => {
    // arrange
    const downloadUrl =
      "https://eli.example/store/download#opaque-download-token";

    // act
    const content = createStoreDeliveryEmailContent({
      contactEmail: "contact@evoa.fit",
      currentYear: 2026,
      downloadUrl,
      resources: [
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
        {
          title: "Nutrition Foundations",
          typeLabels: ["Nutrition Plans"],
        },
      ],
    });

    // assert
    expect(content.subject).toBe("Your resources are ready");
    expect(content.html.match(/Download your resources/g)).toHaveLength(1);
    expect(content.html).toContain(
      "Everything you picked, in one download.",
    );
    expect(content.html).toContain("Hormone Harmony");
    expect(content.html).toContain("E-Books");
    expect(content.html).toContain("Nutrition Foundations");
    expect(content.html).toContain("Nutrition Plans");
    expect(content.text).toContain(
      "everything arrives together in one ZIP file.",
    );
  });
});
