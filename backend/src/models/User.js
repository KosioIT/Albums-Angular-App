import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3 },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true, minlength: 8 },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  resetCodeStatus: {
    type: String,
    enum: ['initial', 'sending', 'sent', 'expired', 'invalid', 'failed'],
    default: 'initial'
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchEmail = function (enteredEmail) {
  return this.email === enteredEmail;
};

export default mongoose.model('User', userSchema);
