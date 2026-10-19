// Shapes database documents into API responses. Each view exposes only the
// fields its audience needs — public doctor data never includes contact
// details, and patients never see other patients.

export function departmentView(dept) {
  if (!dept || !dept._id) return null;
  return {
    id: dept._id.toString(),
    name: dept.name,
    slug: dept.slug,
    description: dept.description,
    icon: dept.icon,
    floor: dept.floor,
    isActive: dept.isActive,
    doctorCount: dept.doctorCount,
  };
}

export function doctorView(doc, { includeAdmin = false } = {}) {
  const view = {
    id: doc._id.toString(),
    name: doc.displayName,
    department: departmentView(doc.department),
    specialty: doc.specialty,
    qualifications: doc.qualifications,
    experienceYears: doc.experienceYears,
    consultationFee: doc.consultationFee,
    bio: doc.bio,
    languages: doc.languages,
    room: doc.room,
    gender: doc.gender,
    slotMinutes: doc.slotMinutes,
    weeklySchedule: doc.weeklySchedule.map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end })),
    workingDays: doc.workingDays,
    isFeatured: doc.isFeatured,
  };
  if (includeAdmin) {
    view.isActive = doc.isActive;
    view.account = doc.user?.email ? { email: doc.user.email, phone: doc.user.phone || '' } : undefined;
  }
  return view;
}

function age(dateOfBirth) {
  if (!dateOfBirth) return undefined;
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function appointmentView(appt, viewerRole) {
  const view = {
    id: appt._id.toString(),
    reference: appt.reference,
    date: appt.date,
    startTime: appt.startTime,
    endTime: appt.endTime,
    startsAt: appt.startsAt,
    reason: appt.reason,
    fee: appt.fee,
    status: appt.status,
    statusNote: appt.statusNote,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
    isSample: appt.isSample,
    doctor: appt.doctor?.displayName
      ? {
          id: appt.doctor._id.toString(),
          name: appt.doctor.displayName,
          specialty: appt.doctor.specialty,
          room: appt.doctor.room,
        }
      : undefined,
    department: departmentView(appt.department),
    history: appt.history.map((h) => ({ status: h.status, byRole: h.byRole, note: h.note, at: h.at })),
  };
  if (viewerRole !== 'patient' && appt.patient?.name) {
    const profile = appt.patient.patientProfile || {};
    view.patient = {
      id: appt.patient._id.toString(),
      name: appt.patient.name,
      phone: appt.patient.phone,
      email: viewerRole === 'admin' ? appt.patient.email : undefined,
      gender: profile.gender,
      age: age(profile.dateOfBirth),
    };
  }
  if (viewerRole === 'doctor' || viewerRole === 'admin') view.doctorNotes = appt.doctorNotes;
  return view;
}
