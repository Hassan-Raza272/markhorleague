import {
  getDraftSize,
  getLiveDraftTotalPicks,
  getPickDetails,
  getRoundPickOrder,
  isDraftComplete,
} from '../src/utils/draftOrder';

describe('draft order uses added franchise count', () => {
  it('starts round 2 after every franchise has picked once (3 teams)', () => {
    expect(getPickDetails(1, 3)).toMatchObject({ round: 1, franchiseIndex: 0 });
    expect(getPickDetails(2, 3)).toMatchObject({ round: 1, franchiseIndex: 1 });
    expect(getPickDetails(3, 3)).toMatchObject({ round: 1, franchiseIndex: 2 });
    expect(getPickDetails(4, 3)).toMatchObject({ round: 2, franchiseIndex: 1 });
  });

  it('starts round 2 after 4 picks when 4 franchises are added', () => {
    expect(getPickDetails(4, 4).round).toBe(1);
    expect(getPickDetails(5, 4).round).toBe(2);
  });

  it('sizes rounds from player pool and franchise count', () => {
    expect(getDraftSize(6, 3)).toEqual({
      totalPicks: 6,
      totalRounds: 2,
      picksPerFranchise: 2,
    });
    expect(getDraftSize(6, 4)).toEqual({
      totalPicks: 6,
      totalRounds: 2,
      picksPerFranchise: 2,
    });
  });

  it('does not treat an empty total as complete so later rounds can continue', () => {
    expect(isDraftComplete(4, 0)).toBe(false);
    expect(isDraftComplete(4, 3)).toBe(true);
    expect(getLiveDraftTotalPicks(3, 3, 3)).toBe(6);
  });

  it('rotates only the added franchise ids', () => {
    const three = ['f1', 'f2', 'f3'];
    expect(getRoundPickOrder(1, three)).toEqual(['f1', 'f2', 'f3']);
    expect(getRoundPickOrder(2, three)).toEqual(['f2', 'f3', 'f1']);
  });
});
