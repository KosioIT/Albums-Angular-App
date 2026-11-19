import { filterActivity } from './activity.component';
import { ActivityAlbum } from '../../../models/activity';

const album = (albumId: string, liked: boolean, listenCount: number, downloadCount: number) =>
  ({ albumId, liked, listenCount, downloadCount }) as ActivityAlbum;

describe('filterActivity', () => {
  const albums = [album('a', true, 0, 0), album('b', false, 3, 0), album('c', true, 1, 2)];

  it('filters by kind of activity', () => {
    expect(filterActivity(albums, 'all').length).toBe(3);
    expect(filterActivity(albums, 'liked').map((a) => a.albumId)).toEqual(['a', 'c']);
    expect(filterActivity(albums, 'listened').map((a) => a.albumId)).toEqual(['b', 'c']);
    expect(filterActivity(albums, 'downloaded').map((a) => a.albumId)).toEqual(['c']);
  });
});
