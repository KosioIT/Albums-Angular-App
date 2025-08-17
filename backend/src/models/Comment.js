import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, minlength: 2 },
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);
