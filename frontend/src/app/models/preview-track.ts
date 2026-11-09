// A 30-second Deezer preview, as returned by GET /api/albums/:id/previews
export interface PreviewTrack {
  title: string;
  duration: number; // length of the full track in seconds
  preview: string; // mp3 link, expires after a while
  link: string; // the track on deezer.com
}
