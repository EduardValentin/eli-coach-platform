import { describe, expect, it } from 'vitest';
import { session as emptySession } from '../../test/programFixtures';
import { coolDownEdits } from './coolDownEditing';

describe('coolDownEdits', () => {
  it('keeps a cool-down note and stretches with seconds each', () => {
    // arrange
    const session = emptySession();

    // act
    const noted = coolDownEdits(session).change({ ...session.coolDown, enabled: true, note: 'Easy walk' });
    const withHamstring = coolDownEdits(noted).add('hamstringStretch');
    const withQuad = coolDownEdits(withHamstring).add('quadStretch');
    const twice = coolDownEdits(withQuad).add('quadStretch');
    const [hamstring, quad] = withQuad.coolDown.items;
    const changed = coolDownEdits(withQuad).changeItem({ ...quad, seconds: 60 });
    const reordered = coolDownEdits(withQuad).moveUp(quad.id);
    const removed = coolDownEdits(changed).remove(hamstring.id);

    // assert
    expect(withQuad.coolDown).toEqual({
      enabled: true,
      note: 'Easy walk',
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
