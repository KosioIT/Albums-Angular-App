import mongoose, { Schema } from 'mongoose';

const trackSchema = new Schema({
  title: { type: String, required: true },
  duration: { type: String, required: true },
  composer: {type: [String] , required: true}
});

const albumSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  release_date: { type: String, required: true },
  producers: [{ type: String }],
  genre: { type: String, required: true },
  cover_img_url: { type: String },
  rank: { 
    type: String, 
    enum: ['gold', 'silver', 'bronze', 'common'],
    default: 'common'
  },
  tracks: [trackSchema]
});

export const Album = mongoose.model('Album', albumSchema);
