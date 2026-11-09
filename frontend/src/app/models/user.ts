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
