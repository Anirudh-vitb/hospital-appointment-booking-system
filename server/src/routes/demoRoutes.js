import { Router } from 'express';
import mongoose from 'mongoose';
import DoctorProfile from '../models/DoctorProfile.js';
import Department from '../models/Department.js';
import { dbState } from '../config/db.js';
import env from '../config/env.js';
import { HOSPITAL } from '../config/hospital.js';
import { getDaySlots } from '../services/availabilityService.js';
import { todayISO } from '../utils/time.js';

// Supplementary syllabus demonstration: Express rendering EJS templates on
// the server and reading a URL-encoded HTML form (no JavaScript involved).
// The real application UI is the React SPA; this page only reads public data.
const router = Router();

async function pageData() {
  const [doctors, departmentCount] = await Promise.all([
    DoctorProfile.find({ isActive: true }, 'displayName specialty').sort({ displayName: 1 }).limit(50).lean(),
    Department.countDocuments({ isActive: true }),
  ]);
  return {
    hospital: HOSPITAL,
    server: {
      node: process.version,
      environment: env.nodeEnv,
      timezone: env.timezone,
      uptimeMinutes: Math.round(process.uptime() / 60),
      database: dbState(),
      mongoose: mongoose.version,
      renderedAt: new Date().toLocaleString('en-IN', { timeZone: env.timezone }),
    },
    doctors,
    departmentCount,
    today: todayISO(),
  };
}

router.get('/server-info', async (req, res) => {
  res.render('server-info', { ...(await pageData()), form: { date: todayISO() }, result: null, error: null });
});

// <form method="post"> sends application/x-www-form-urlencoded; express.urlencoded()
// has already parsed it into req.body by the time this handler runs.
router.post('/availability', async (req, res) => {
  const data = await pageData();
  const form = { doctorId: String(req.body.doctorId || ''), date: String(req.body.date || '') };
  let result = null;
  let error = null;

  try {
    if (!mongoose.isValidObjectId(form.doctorId)) throw new Error('Choose a doctor from the list.');
    const doctor = await DoctorProfile.findOne({ _id: form.doctorId, isActive: true });
    if (!doctor) throw new Error('That doctor is not accepting appointments.');
    const day = await getDaySlots(doctor, form.date);
    result = { doctor: doctor.displayName, ...day };
  } catch (e) {
    error = e.message;
  }

  res.status(error ? 400 : 200).render('server-info', { ...data, form, result, error });
});

export default router;
