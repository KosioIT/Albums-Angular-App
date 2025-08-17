import { Track } from "./track";

export interface Album {
  _id: string;
  title: string;
  artist: string;
  release_date: string; // ISO date
  producers: string[]; 
  cover_img_url: string;
  genre: string;
  rank: 'gold' | 'silver' | 'bronze' | 'common';
  tracks: Track[];
  
}