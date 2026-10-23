import { Track } from "./track";

export interface Album {
  _id: string;
  title: string;
  artist: string;
  release_date: string; // ISO date
  producers: string[]; 
  cover_img_url: string;
  genre: string;
  moods: string[]; // Moods like 'love', 'sadness', 'epic', etc.
  rank: 'gold' | 'silver' | 'bronze' | 'common';
  tracks: Track[];
  megaUrl: string; // Download URL for the album file
  createdBy: string; // User ID of the creator
}