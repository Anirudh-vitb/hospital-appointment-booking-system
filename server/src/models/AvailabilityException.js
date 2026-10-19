import mongoose from 'mongoose';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// A date (or part of a date) when a doctor is not available: leave, surgery,
// conference. With no start/end the whole day is blocked.
const availabilityExceptionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    start: { type: String, match: TIME },
    end: { type: String, match: TIME },
    reason: { type: String, trim: true, maxlength: 120, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

availabilityExceptionSchema.index({ doctor: 1, date: 1 });

export default mongoose.model('AvailabilityException', availabilityExceptionSchema);
