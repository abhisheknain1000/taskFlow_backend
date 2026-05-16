import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  role: {
    type: String,
    enum: ['admin', 'manager', 'member'],
    default: 'member'
  },    
  avatar: { type: String, default: 'https://api.dicebear.com/7.x/bottts/svg' },
  active: { type: Boolean, default: true, select: false }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.correctPassword = async function(candidatePassword: string, userPassword: string) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const User = model('User', userSchema);