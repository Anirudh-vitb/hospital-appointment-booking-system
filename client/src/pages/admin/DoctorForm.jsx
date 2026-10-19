import { useState } from 'react';
import { apiPatch, apiPost } from '../../api/client.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import { SHORT_DAYS } from '../../utils/format.js';
import { validatePassword } from '../../utils/validation.js';

const list = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

function toForm(doctor) {
  return {
    name: doctor?.name.replace(/^Dr\.?\s+/i, '') ?? '',
    email: doctor?.account?.email ?? '',
    phone: doctor?.account?.phone ?? '',
    password: '',
    department: doctor?.department?.id ?? '',
    specialty: doctor?.specialty ?? '',
    qualifications: doctor?.qualifications.join(', ') ?? '',
    experienceYears: doctor?.experienceYears ?? '',
    consultationFee: doctor?.consultationFee ?? '',
    languages: doctor?.languages.join(', ') ?? 'English, Telugu',
    room: doctor?.room ?? '',
    gender: doctor?.gender ?? 'other',
    bio: doctor?.bio ?? '',
    isFeatured: doctor?.isFeatured ?? false,
    // Used only when creating: one block applied to the selected days.
    days: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '13:00',
    slotMinutes: 15,
  };
}

// Create and edit form for administrators. Editing does not touch the weekly
// hours: doctors manage those themselves from the Doctor desk.
export default function DoctorForm({ doctor, departments, onSaved, onCancel }) {
  const isEdit = Boolean(doctor);
  const [form, setForm] = useState(() => toForm(doctor));
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ saving: false, error: null });

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };
  const toggleDay = (day) => setForm((f) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day] }));

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter the doctor’s name';
    if (!form.department) found.department = 'Choose a department';
    if (form.specialty.trim().length < 2) found.specialty = 'Enter a specialty';
    if (form.experienceYears === '' || form.experienceYears < 0) found.experienceYears = 'Enter years of experience';
    if (form.consultationFee === '' || form.consultationFee < 0) found.consultationFee = 'Enter the fee in rupees';
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) found.phone = 'Enter a 10-digit mobile number';
    if (!isEdit) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) found.email = 'Enter the doctor’s login email';
      const pw = validatePassword(form.password);
      if (pw) found.password = pw;
      if (form.days.length === 0) found.days = 'Choose at least one OPD day';
      if (form.start >= form.end) found.end = 'End time must be after the start time';
    }
    return found;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const common = {
      name: form.name.trim(),
      department: form.department,
      specialty: form.specialty.trim(),
      qualifications: list(form.qualifications),
      experienceYears: Number(form.experienceYears),
      consultationFee: Number(form.consultationFee),
      languages: list(form.languages),
      room: form.room.trim(),
      gender: form.gender,
      bio: form.bio.trim(),
      isFeatured: form.isFeatured,
    };
    if (form.phone) common.phone = form.phone;

    setState({ saving: true, error: null });
    try {
      const { data } = isEdit
        ? await apiPatch(`/admin/doctors/${doctor.id}`, common)
        : await apiPost('/admin/doctors', {
            ...common,
            email: form.email.trim(),
            password: form.password,
            slotMinutes: Number(form.slotMinutes),
            weeklySchedule: form.days.map((dayOfWeek) => ({ dayOfWeek, start: form.start, end: form.end })),
          });
      onSaved(data);
    } catch (err) {
      setErrors(err.fieldErrors);
      setState({ saving: false, error: err });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-5">
      <h2 className="text-lg">{isEdit ? `Edit ${doctor.name}` : 'Add a doctor'}</h2>
      {state.error && <ErrorMessage error={state.error} title="Doctor not saved" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name (without “Dr.”)" required value={form.name} onChange={set('name')} error={errors.name} />
        <FormField as="select" label="Department" required value={form.department} onChange={set('department')} error={errors.department}>
          <option value="">Choose…</option>
          {departments.filter((d) => d.isActive).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </FormField>
        {!isEdit && <FormField label="Login email" type="email" required value={form.email} onChange={set('email')} error={errors.email} />}
        {!isEdit && <FormField label="Initial password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} error={errors.password} hint="Share it with the doctor privately" />}
        <FormField label="Specialty" required value={form.specialty} onChange={set('specialty')} error={errors.specialty} />
        <FormField label="Qualifications" hint="Comma-separated, e.g. MBBS, MD" value={form.qualifications} onChange={set('qualifications')} />
        <FormField label="Experience (years)" type="number" min={0} max={60} required value={form.experienceYears} onChange={set('experienceYears')} error={errors.experienceYears} />
        <FormField label="Consultation fee (₹)" type="number" min={0} max={10000} required value={form.consultationFee} onChange={set('consultationFee')} error={errors.consultationFee} />
        <FormField label="Phone" type="tel" maxLength={10} value={form.phone} onChange={set('phone')} error={errors.phone} />
        <FormField label="Room" value={form.room} onChange={set('room')} />
        <FormField label="Languages" hint="Comma-separated" value={form.languages} onChange={set('languages')} />
        <FormField as="select" label="Gender" value={form.gender} onChange={set('gender')}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other / not stated</option>
        </FormField>
        <FormField as="textarea" rows={3} className="sm:col-span-2" label="Short profile" maxLength={800} value={form.bio} onChange={set('bio')} />
      </div>

      {!isEdit && (
        <fieldset className="rounded-md bg-paper-deep/60 p-4">
          <legend className="label">Initial OPD hours</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="OPD days">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <label key={day} className={`cursor-pointer rounded border px-2.5 py-1 text-sm ${form.days.includes(day) ? 'border-teal bg-teal-tint text-teal-dark' : 'border-line-strong bg-surface'}`}>
                <input type="checkbox" className="sr-only" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                {SHORT_DAYS[day]}
              </label>
            ))}
          </div>
          {errors.days && <p className="mt-1 text-xs text-danger">{errors.days}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <FormField label="From" type="time" value={form.start} onChange={set('start')} />
            <FormField label="To" type="time" value={form.end} onChange={set('end')} error={errors.end} />
            <FormField as="select" label="Slot length" value={form.slotMinutes} onChange={set('slotMinutes')}>
              {[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} min</option>)}
            </FormField>
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-teal" checked={form.isFeatured} onChange={set('isFeatured')} /> Show on the home page as a featured doctor
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={state.saving}>{state.saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create doctor'}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
