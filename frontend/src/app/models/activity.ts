import { Album } from './album';

// One album the user interacted with (GET /api/users/me/activity)
export interface ActivityAlbum extends Omit<Album, 'id'> {
  albumId: string;
  liked: boolean;
  listenCount: number;
  downloadCount: number;
  lastActivityAt: string; // ISO date
}

export interface MyActivity {
  stats: {
    likedAlbums: number;
    listenedAlbums: number;
    downloadedAlbums: number;
    totalListens: number;
    totalDownloads: number;
  };
  albums: ActivityAlbum[]; // most recent first
}

// Site-wide numbers for admins (GET /api/stats)
export interface StatsAlbum {
  id: string;
  title: string;
  artist: string;
  rank: Album['rank'];
  cover_img_url: string | null;
  likes: number;
  listens: number;
  guestListens: number;
  totalListens: number;
  downloads: number;
}

export interface StatsBand {
  artist: string;
  albums: number;
  likes: number;
  listens: number;
  guestListens: number;
  totalListens: number;
  downloads: number;
}

export interface SiteStats {
  totals: {
    users: number;
    albums: number;
    likes: number;
    listens: number;
    guestListens: number;
    totalListens: number;
    downloads: number;
  };
  top: { listens: StatsAlbum[]; likes: StatsAlbum[]; downloads: StatsAlbum[] };
  bands: StatsBand[];
}
