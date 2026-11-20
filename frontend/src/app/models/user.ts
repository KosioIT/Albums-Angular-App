// What the server returns for the logged in user (User.toBasic() in the backend)
export interface User {
  id: string; // the email, it is the Firestore document id
  username: string;
  email: string;
  role: 'user' | 'admin';
  likedAlbums?: string[]; // album ids
}

// Full user, as returned by the admin endpoints (User.toPublic() in the backend)
export interface UserProfile extends User {
  favorites: string[];
  totalLikes: number;
  created_at?: string;
  updated_at?: string | null;
  stats?: { favoritesCount: number; likedCount: number };
}

export interface UserSession {
  id: string;
  userAgent: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

// A row of the admin "Users" page (GET /api/users)
export interface AdminUser {
  id: string; // the email
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
  ban: UserBan | null; // only a ban in force
  stats: {
    favoritesCount: number;
    likedCount: number;
    listens: number;
    downloads: number;
    playlists: number;
    activeSessions: number; // devices the user is signed in on
    lastSeen: string | null; // last use of any of those sessions
  };
}

export interface UserBan {
  reason: string;
  until: string | null; // null = permanent
  by: string; // the admin's email
  at: string;
}

export type BanDays = 1 | 7 | 30 | null; // null = permanent
