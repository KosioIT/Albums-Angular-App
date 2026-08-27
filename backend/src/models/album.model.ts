import { Track } from './track.model';

export interface Album {
  id?: string; // Firestore document ID
  title: string;
  artist: string;
  release_date: string;
  producers: string[];
  genre: string;
  cover_img_url?: string;
  rank: 'gold' | 'silver' | 'bronze' | 'common';
  likes: number;
  tracks: Track[];
}
