import mongoose, { Schema } from 'mongoose';

export const trackSchema = new Schema({
  title: { type: String, required: true },
  duration: { type: String, required: true },
  composer: { type: [String], required: true }
});

export const Track = mongoose.model('Track', trackSchema);