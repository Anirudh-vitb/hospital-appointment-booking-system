import mongoose from 'mongoose';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// One weekly block, e.g. Monday 09:00–13:00. A doctor can have several blocks
// on the same day (morning and evening OPD).
const scheduleBlockSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    start: { type: String, match: TIME, required: true },
    end: { type: String, match: TIME, required: true },
  },
  { _id: false },
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalised copy of the user's name so the public directory can search
    // and sort doctors without a $lookup on every request.
    displayName: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    specialty: { type: String, required: true, trim: true, maxlength: 80 },
    qualifications: [{ type: String, trim: true, maxlength: 80 }],
    experienceYears: { type: Number, min: 0, max: 60, required: true },
    consultationFee: { type: Number, min: 0, max: 10000, required: true },
    bio: { type: String, trim: true, maxlength: 800, default: '' },
    languages: [{ type: String, trim: true, maxlength: 30 }],
    room: { type: String, trim: true, maxlength: 40, default: '' },
    gender: { type: String, enum: ['female', 'male', 'other'], default: 'other' },
    slotMinutes: { type: Number, default: 15 },
    weeklySchedule: { type: [scheduleBlockSchema], default: [] },
    // Days of week with at least one block; maintained in pre('save') so the
    // "available on <date>" filter can use an index instead of scanning schedules.
    workingDays: { type: [Number], default: [] },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

doctorProfileSchema.pre('save', function syncWorkingDays() {
  this.workingDays = [...new Set(this.weeklySchedule.map((block) => block.dayOfWeek))].sort();
});

doctorProfileSchema.index({ user: 1 }, { unique: true });
doctorProfileSchema.index({ isActive: 1, department: 1, specialty: 1 });
doctorProfileSchema.index({ isActive: 1, workingDays: 1 });

export default mongoose.model('DoctorProfile', doctorProfileSchema);
