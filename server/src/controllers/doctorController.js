import mongoose from 'mongoose';
import AvailabilityException from '../models/AvailabilityException.js';
import Department from '../models/Department.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import { escapeRegex, pageMeta, paginate } from '../utils/query.js';
import { doctorView } from '../utils/serializers.js';
import { dayOfWeek, parseLocalDate } from '../utils/time.js';
import { getDaySlots } from '../services/availabilityService.js';

const SORTS = {
  name: { displayName: 1 },
  experience: { experienceYears: -1, displayName: 1 },
  fee: { consultationFee: 1, displayName: 1 },
};

// Builds the MongoDB filter for the doctor directory from the query string.
export async function buildDoctorFilter(query, { includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };

  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ displayName: pattern }, { specialty: pattern }];
  }

  if (query.department) {
    if (mongoose.isValidObjectId(query.department)) {
      filter.department = query.department;
    } else {
      const dept = await Department.findOne({ slug: query.department }, '_id');
      // Unknown department: match nothing rather than ignoring the filter.
      filter.department = dept?._id ?? new mongoose.Types.ObjectId();
    }
  }

  if (query.specialty) {
    filter.specialty = new RegExp(`^${escapeRegex(query.specialty)}$`, 'i');
  }

  if (query.availableOn) {
    const day = parseLocalDate(query.availableOn);
    if (!day) throw ApiError.badRequest('Choose a valid date.');
    filter.workingDays = dayOfWeek(day);
    // Leave out doctors who have blocked that whole day.
    const onLeave = await AvailabilityException.distinct('doctor', {
      date: query.availableOn,
      start: { $exists: false },
    });
    if (onLeave.length) filter._id = { $nin: onLeave };
  }

  return filter;
}

export async function listDoctors(req, res) {
  const query = req.valid.query;
  const includeInactive = req.user?.role === 'admin' && query.includeInactive === 'true';
  const filter = await buildDoctorFilter(query, { includeInactive });
  const pg = paginate(query, { defaultLimit: 9 });

  let finder = DoctorProfile.find(filter)
    .populate('department')
    .sort(SORTS[query.sort] || SORTS.name)
    .skip(pg.skip)
    .limit(pg.limit);
  if (includeInactive) finder = finder.populate('user', 'email phone');

  const [doctors, total] = await Promise.all([finder, DoctorProfile.countDocuments(filter)]);

  ok(res, doctors.map((d) => doctorView(d, { includeAdmin: includeInactive })), pageMeta(pg, total));
}

export async function featuredDoctors(req, res) {
  const doctors = await DoctorProfile.find({ isActive: true, isFeatured: true })
    .populate('department')
    .sort({ experienceYears: -1 })
    .limit(4);
  ok(res, doctors.map((d) => doctorView(d)));
}

export async function listSpecialties(req, res) {
  const specialties = await DoctorProfile.distinct('specialty', { isActive: true });
  ok(res, specialties.sort());
}

export async function getDoctor(req, res) {
  const doctor = await DoctorProfile.findOne({ _id: req.valid.params.id, isActive: true }).populate('department');
  if (!doctor) throw ApiError.notFound('This doctor profile is not available.');
  ok(res, doctorView(doctor));
}

export async function getDoctorSlots(req, res) {
  const doctor = await DoctorProfile.findOne({ _id: req.valid.params.id, isActive: true });
  if (!doctor) throw ApiError.notFound('This doctor profile is not available.');
  ok(res, await getDaySlots(doctor, req.valid.query.date));
}
