import { describe, expect, it } from "vitest";

import { CoolDownEditing } from "./cool-down-editing";
import type { Session } from "./program-content";

function emptySession(): Session {
  return {
    id: "s",
    originId: "s",
    name: "s",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
  };
}

describe("CoolDownEditing", () => {
  it("keeps the cool-down on with stretches with seconds each", () => {
    // arrange
    let next = 0;
    const editing = new CoolDownEditing({ newId: () => `id-${(next += 1)}` });
    const session = emptySession();

    // act
    const turnedOn = editing.withCoolDown(session, {
      ...session.coolDown,
      enabled: true,
    });
    const withHamstring = editing.add(turnedOn, "hamstringStretch");
    const withQuad = editing.add(withHamstring, "quadStretch");
    const twice = editing.add(withQuad, "quadStretch");
    const [hamstring, quad] = withQuad.coolDown.items;
    const changed = editing.changeItem(withQuad, { ...quad, seconds: 60 });
    const reordered = editing.moveUp(withQuad, quad.id);
    const removed = editing.remove(changed, hamstring.id);

    // assert
    expect(withQuad.coolDown).toEqual({
      enabled: true,
      items: [
        { id: expect.any(String), exerciseId: "hamstringStretch", seconds: 30 },
        { id: expect.any(String), exerciseId: "quadStretch", seconds: 30 },
      ],
    });
    expect(twice).toEqual(withQuad);
    expect(reordered.coolDown.items).toEqual([quad, hamstring]);
    expect(editing.moveDown(reordered, quad.id)).toEqual(withQuad);
    expect(removed.coolDown.items).toEqual([{ ...quad, seconds: 60 }]);
  });
});
