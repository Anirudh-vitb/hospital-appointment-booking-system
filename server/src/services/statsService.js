import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';
import DoctorProfile from '../models/DoctorProfile.js';
import User from '../models/User.js';
import { nowInZone } from '../utils/time.js';

// Administrator dashboard figures. Every number is computed inside MongoDB
// with aggregation pipelines; only the small summarised result is sent back.
export async function adminOverview() {
  const now = nowInZone();
  const since = now.minus({ days: 13 }).toISODate();

  const [usersByRole, doctorsByStatus, [appointmentFacets]] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    DoctorProfile.aggregate([{ $group: { _id: '$isActive', count: { $sum: 1 } } }]),
    Appointment.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          // Appointment volume per day for the last 14 days (by visit date).
          daily: [
            { $match: { date: { $gte: since, $lte: now.toISODate() } } },
            { $group: { _id: '$date', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          monthly: [
            { $group: { _id: { $substrBytes: ['$date', 0, 7] }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 6 },
          ],
          byDepartment: [
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
            { $unwind: '$department' },
            { $project: { _id: 0, name: '$department.name', count: 1 } },
            { $sort: { count: -1 } },
          ],
          today: [{ $match: { date: now.toISODate() } }, { $count: 'count' }],
        },
      },
    ]),
  ]);

  const roleCount = Object.fromEntries(usersByRole.map((r) => [r._id, r.count]));
  const activeDoctors = doctorsByStatus.find((d) => d._id === true)?.count || 0;
  const inactiveDoctors = doctorsByStatus.find((d) => d._id === false)?.count || 0;

  // Fill gaps so the chart shows a bar (possibly zero) for every day.
  const dailyMap = new Map(appointmentFacets.daily.map((d) => [d._id, d.count]));
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = now.minus({ days: 13 - i }).toISODate();
    return { date, count: dailyMap.get(date) || 0 };
  });

  return {
    patients: roleCount.patient || 0,
    activeDoctors,
    inactiveDoctors,
    totalAppointments: appointmentFacets.total[0]?.count || 0,
    appointmentsToday: appointmentFacets.today[0]?.count || 0,
    byStatus: Object.fromEntries(appointmentFacets.byStatus.map((s) => [s._id, s.count])),
    daily,
    monthly: appointmentFacets.monthly.reverse().map((m) => ({ month: m._id, count: m.count })),
    byDepartment: appointmentFacets.byDepartment,
  };
}

export async function doctorSummary(doctorId) {
  const now = nowInZone();
  const today = now.toISODate();
  const monthStart = now.startOf('month').toISODate();

  const [result] = await Appointment.aggregate([
    { $match: { doctor: doctorId } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        today: [
          { $match: { date: today, status: { $in: ['pending', 'confirmed', 'completed'] } } },
          { $count: 'count' },
        ],
        upcoming: [
          { $match: { startsAt: { $gt: now.toJSDate() }, status: { $in: ['pending', 'confirmed'] } } },
          { $count: 'count' },
        ],
        completedThisMonth: [
          { $match: { date: { $gte: monthStart }, status: 'completed' } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  return {
    byStatus: Object.fromEntries(result.byStatus.map((s) => [s._id, s.count])),
    today: result.today[0]?.count || 0,
    upcoming: result.upcoming[0]?.count || 0,
    completedThisMonth: result.completedThisMonth[0]?.count || 0,
  };
}

// Public numbers shown on the home page.
export async function publicSummary() {
  const [doctors, departments, specialties] = await Promise.all([
    DoctorProfile.countDocuments({ isActive: true }),
    Department.countDocuments({ isActive: true }),
    DoctorProfile.distinct('specialty', { isActive: true }),
  ]);
  return { doctors, departments, specialties: specialties.length };
}

// Active departments with the number of active doctors in each.
export function departmentsWithDoctorCounts({ includeInactive = false } = {}) {
  return Department.aggregate([
    { $match: includeInactive ? {} : { isActive: true } },
    {
      $lookup: {
        from: 'doctorprofiles',
        let: { deptId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$department', '$$deptId'] }, { $eq: ['$isActive', true] }] } } },
          { $project: { _id: 1 } },
        ],
        as: 'doctors',
      },
    },
    { $addFields: { doctorCount: { $size: '$doctors' } } },
    { $project: { doctors: 0, __v: 0 } },
    { $sort: { name: 1 } },
  ]);
}
