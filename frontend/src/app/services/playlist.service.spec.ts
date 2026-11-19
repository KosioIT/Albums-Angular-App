import { formatDuration } from './playlist.service';

describe('formatDuration', () => {
  it('formats a track as m:ss', () => {
    expect(formatDuration(309)).toBe('5:09');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats a playlist in minutes and hours', () => {
    expect(formatDuration(1077, true)).toBe('18 min');
    expect(formatDuration(4320, true)).toBe('1 h 12 min');
  });
});
