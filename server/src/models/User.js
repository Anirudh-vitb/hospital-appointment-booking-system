import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['patient', 'doctor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, match: /^[6-9]\d{9}$/ },
    // select: false keeps the hash out of every query unless explicitly requested.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'patient', required: true },
    isActive: { type: Boolean, default: true },
    patientProfile: {
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['female', 'male', 'other', 'prefer_not_to_say'] },
      address: { type: String, trim: true, maxlength: 200 },
      emergencyContact: { type: String, trim: true, maxlength: 100 },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Login looks users up by email; uniqueness is enforced by the index, not by
// a pre-check, so two simultaneous registrations cannot both succeed.
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, createdAt: -1 });

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    patientProfile: this.role === 'patient' ? this.patientProfile || {} : undefined,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
