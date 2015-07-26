import Store from '../../lib/store';

jest.dontMock('../../lib/store');

describe(Store, () => {
  describe('#initialize', () => {
    it('succeeds', () => {
      expect(true).toBe(true);
    });
  });
});
