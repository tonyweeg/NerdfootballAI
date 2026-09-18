const MnfTiebreak = require('../public/js/utils/mnf-tiebreak.js');

describe('mnfGameId', () => {
    test('returns the highest game ID of the week', () => {
        expect(MnfTiebreak.mnfGameId(['101', '102', '116', '115'])).toBe('116');
    });

    test('picks the nightcap in a Monday doubleheader week', () => {
        expect(MnfTiebreak.mnfGameId(['713', '714', '715'])).toBe('715');
    });

    test('does not compare IDs as strings', () => {
        // '9' > '10' lexically; numerically it is not
        expect(MnfTiebreak.mnfGameId(['9', '10'])).toBe('10');
    });

    test('returns null for empty or invalid input', () => {
        expect(MnfTiebreak.mnfGameId([])).toBeNull();
        expect(MnfTiebreak.mnfGameId(null)).toBeNull();
        expect(MnfTiebreak.mnfGameId(['nope'])).toBeNull();
    });
});
