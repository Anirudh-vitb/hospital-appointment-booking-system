import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]+$/ },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    // Name of a lucide icon the frontend maps to a component.
    icon: { type: String, trim: true, default: 'stethoscope' },
    floor: { type: String, trim: true, maxlength: 40, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

departmentSchema.index({ slug: 1 }, { unique: true });
departmentSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Department', departmentSchema);
