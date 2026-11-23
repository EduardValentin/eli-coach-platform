import { expect, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalScroll } from "./viewport";

const TOLERANCE_PX = 1;
const OVERLAP_PX = 2;

type Box = {
  name: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export async function expectLayoutFits(
  page: Page,
  scope: Locator = page.getByRole("main"),
): Promise<void> {
  await expectNoHorizontalScroll(page);

  const { cutOff, overlapping } = await scope.evaluate(
    (root, { tolerance, overlap }) => {
      const visible = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return (
          rect.width > 2 &&
          rect.height > 2 &&
          style.opacity !== "0" &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };
      const named = (element: Element) =>
        `${element.tagName.toLowerCase()} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}"`;
      const cutOff = [...root.querySelectorAll("*")]
        .filter(visible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();

          return rect.left < -tolerance || rect.right > innerWidth + tolerance;
        })
        .map(named);
      const controls: (Box & { element: Element })[] = [
        ...root.querySelectorAll(
          "a[href], button, [role=combobox], [role=radio], [role=checkbox], label",
        ),
      ]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            element,
            name: named(element),
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        });
      const overlapping: string[] = [];

      for (const [index, first] of controls.entries()) {
        for (const second of controls.slice(index + 1)) {
          if (
            first.element.contains(second.element) ||
            second.element.contains(first.element)
          ) {
            continue;
          }

          const across =
            Math.min(first.right, second.right) -
            Math.max(first.left, second.left);
          const down =
            Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top);

          if (across > overlap && down > overlap) {
            overlapping.push(`${first.name} over ${second.name}`);
          }
        }
      }

      return { cutOff, overlapping };
    },
    { tolerance: TOLERANCE_PX, overlap: OVERLAP_PX },
  );

  expect(cutOff).toEqual([]);
  expect(overlapping).toEqual([]);
}
