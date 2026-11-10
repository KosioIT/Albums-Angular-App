import { Track } from "./track";

export interface Album {
  id: string; // slug of the title, e.g. "black-ice"
  title: string;
  artist: string;
  release_date: string; // DD.MM.YYYY
  length?: string | null; // total running time, "m:ss" or "h:mm:ss"
  producers: string[]; 
  cover_img_url: string;
  genre: string;
  moods: string[]; // Moods like 'love', 'sadness', 'epic', etc.
  rank: 'gold' | 'silver' | 'bronze' | 'common';
  tracks: Track[];
  hasDownload?: boolean; // the link itself never leaves the backend
  deezerAlbumId?: number | null; // Deezer album behind the previews
  createdBy: string | null; // User ID of the creator
  likes?: number;
  listens?: number; // by signed-in users
  guestListens?: number; // by visitors without an account
  downloads?: number;
}