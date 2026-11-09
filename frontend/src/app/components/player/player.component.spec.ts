import { formatTime } from './player.component';

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5.9)).toBe('0:05');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(221)).toBe('3:41');
    expect(formatTime(NaN)).toBe('0:00');
  });
});
