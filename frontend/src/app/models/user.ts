export interface User {
  _id: string;
  username: string;
  email: string;
  token: string;
  resetCode: string | null;
  resetCodeExpiry: Date | null;
  favorites: string[]; // Array of favorite album IDs
}