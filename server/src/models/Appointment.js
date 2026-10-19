import mongoose from 'mongoose';

export const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
// Appointments in these states occupy their time slot.
export const SLOT_HOLDING_STATUSES = ['pending', 'confirmed', 'completed'];

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    byRole: { type: String, enum: ['patient', 'doctor', 'admin', 'system'], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 300 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const appointmentSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    // Wall-clock values in the hospital timezone, shown to users as-is.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    // The same instant as an absolute UTC timestamp, used for sorting and for
    // "upcoming vs past" comparisons.
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
    fee: { type: Number, min: 0, required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    // true while the appointment occupies the slot. The partial unique indexes
    // below only cover documents where this is true, so cancelling or
    // rejecting (which sets it to false) releases the slot for others.
    holdsSlot: { type: Boolean, default: true },
    statusNote: { type: String, trim: true, maxlength: 300 },
    doctorNotes: { type: String, trim: true, maxlength: 1000 },
    history: { type: [historySchema], default: [] },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);

appointmentSchema.pre('validate', function syncHoldsSlot() {
  this.holdsSlot = SLOT_HOLDING_STATUSES.includes(this.status);
});

appointmentSchema.index({ reference: 1 }, { unique: true });
// Double-booking prevention: one slot-holding appointment per doctor per start time.
appointmentSchema.index(
  { doctor: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: 'unique_active_doctor_slot' },
);
// A patient cannot hold two appointments that start at the same moment.
appointmentSchema.index(
  { patient: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: 'unique_active_patient_slot' },
);
appointmentSchema.index({ patient: 1, startsAt: -1 });
appointmentSchema.index({ doctor: 1, date: 1, startTime: 1 });
appointmentSchema.index({ status: 1, startsAt: -1 });
appointmentSchema.index({ createdAt: -1 });

export default mongoose.model('Appointment', appointmentSchema);
