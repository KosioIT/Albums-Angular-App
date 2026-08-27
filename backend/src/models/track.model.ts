export interface Track {
  title: string;
  duration: string;
  composer: string[]; // Firestore поддържа масиви директно
}