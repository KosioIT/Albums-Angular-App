export interface User {
  id?: string;                 // Firestore document ID
  username: string;
  email: string;
  password: string;            // hashed password
  token?: string | null;
  resetCode?: string | null;
  resetCodeExpiry?: string | null;
  favorites: string[];         // album IDs
  totalLikes: number;          // count of liked albums
  likedAlbums: string[];       // album IDs
  created_at?: string;
  updated_at?: string;
}
