import { expect } from "@playwright/test";

export type Box = { x: number; y: number; width: number; height: number };

export function expectButtonsAlongTopEdgeOf(
  buttons: readonly Box[],
  frame: Box,
): void {
  for (const button of buttons) {
    expect(button.x).toBeGreaterThanOrEqual(frame.x);
    expect(button.x + button.width).toBeLessThanOrEqual(frame.x + frame.width);
    expect(button.y).toBeGreaterThanOrEqual(frame.y);
    expect(button.y + button.height).toBeLessThan(frame.y + frame.height / 3);
  }
}
