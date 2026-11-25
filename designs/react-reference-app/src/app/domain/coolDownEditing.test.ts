import { describe, expect, it } from 'vitest';
import { session as emptySession } from '../../test/programFixtures';
import { coolDownEdits } from './coolDownEditing';

describe('coolDownEdits', () => {
  it('says why it refuses a stretch already in the cool-down', () => {
    // arrange
    const session = coolDownEdits(emptySession()).add('hamstringStretch');

    // act
    const repeated = coolDownEdits(session).refusalFor('hamstringStretch');
    const another = coolDownEdits(session).refusalFor('quadStretch');

    // assert
    expect(repeated).toBe('already-in-cool-down');
    expect(another).toBeUndefined();
  });

  it('keeps the cool-down on with stretches with seconds each', () => {
    // arrange
    const session = emptySession();

    // act
    const turnedOn = coolDownEdits(session).change({ ...session.coolDown, enabled: true });
    const withHamstring = coolDownEdits(turnedOn).add('hamstringStretch');
    const withQuad = coolDownEdits(withHamstring).add('quadStretch');
    const twice = coolDownEdits(withQuad).add('quadStretch');
    const [hamstring, quad] = withQuad.coolDown.items;
    const changed = coolDownEdits(withQuad).changeItem({ ...quad, seconds: 60 });
    const reordered = coolDownEdits(withQuad).moveUp(quad.id);
    const removed = coolDownEdits(changed).remove(hamstring.id);

    // assert
    expect(withQuad.coolDown).toEqual({
      enabled: true,
      items: [
        { id: expect.any(String), exerciseId: 'hamstringStretch', seconds: 30 },
        { id: expect.any(String), exerciseId: 'quadStretch', seconds: 30 },
      ],
    });
    expect(twice).toEqual(withQuad);
    expect(reordered.coolDown.items).toEqual([quad, hamstring]);
    expect(coolDownEdits(reordered).moveDown(quad.id)).toEqual(withQuad);
    expect(removed.coolDown.items).toEqual([{ ...quad, seconds: 60 }]);
  });
});
