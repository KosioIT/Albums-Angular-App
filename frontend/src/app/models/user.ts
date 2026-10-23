export interface User {
  _id: string;
  username: string;
  email: string;
  token: string;
  role: "user" | "admin";
  resetCode: string | null;
  resetCodeExpiry: Date | null;
  favorites: string[]; // Array of favorite album IDs
  totalLikes: number;          // count of liked albums
  likedAlbums: string[];       // album IDs
  created_at?: string;
  updated_at?: string;
}