import { useState } from 'react';
import { apiPatch, apiPut } from '../../api/client.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import Notice from '../../components/Notice.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { validatePassword } from '../../utils/validation.js';

function initialForm(user) {
  const profile = user.patientProfile || {};
  return {
    name: user.name,
    phone: user.phone,
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile.gender || '',
    address: profile.address || '',
    emergencyContact: profile.emergencyContact || '',
  };
}

export default function PatientProfile() {
  useDocumentTitle('My profile');
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(() => initialForm(user));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [pwState, setPwState] = useState({ saving: false, error: null, done: false, fieldError: null });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setResult(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(form.phone)) found.phone = 'Enter a 10-digit mobile number';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const { data } = await apiPatch('/patients/me', {
        name: form.name.trim(),
        phone: form.phone,
        patientProfile: {
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          address: form.address,
          emergencyContact: form.emergencyContact,
        },
      });
      setUser(data);
      setResult({ ok: true });
    } catch (error) {
      setErrors(error.fieldErrors);
      setResult({ error });
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    const fieldError = validatePassword(passwords.newPassword);
    if (fieldError) return setPwState({ saving: false, error: null, done: false, fieldError });
    setPwState({ saving: true, error: null, done: false, fieldError: null });
    try {
      await apiPut('/patients/me/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPwState({ saving: false, error: null, done: true, fieldError: null });
    } catch (error) {
      setPwState({ saving: false, error, done: false, fieldError: null });
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="My profile" description={`Signed in as ${user.email}. The doctor sees your name, phone, age and gender with each appointment.`} />

      <form onSubmit={handleSave} noValidate className="card grid gap-4 p-5 sm:grid-cols-2">
        {result?.ok && <div className="sm:col-span-2"><Notice tone="success">Profile saved.</Notice></div>}
        {result?.error && <div className="sm:col-span-2"><ErrorMessage error={result.error} title="Profile not saved" /></div>}
        <FormField label="Full name" name="name" required value={form.name} onChange={handleChange} error={errors.name} />
        <FormField label="Mobile number" name="phone" type="tel" required maxLength={10} value={form.phone} onChange={handleChange} error={errors.phone} />
        <FormField label="Date of birth" name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={handleChange} error={errors.dateOfBirth} />
        <FormField as="select" label="Gender" name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Not specified</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </FormField>
        <FormField className="sm:col-span-2" label="Address" name="address" maxLength={200} value={form.address} onChange={handleChange} />
        <FormField className="sm:col-span-2" label="Emergency contact" name="emergencyContact" maxLength={100} placeholder="Name and phone number" value={form.emergencyContact} onChange={handleChange} />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form onSubmit={handlePassword} noValidate className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-lg sm:col-span-2">Change password</h2>
        {pwState.done && <div className="sm:col-span-2"><Notice tone="success">Password changed.</Notice></div>}
        {pwState.error && <div className="sm:col-span-2"><ErrorMessage error={pwState.error} title="Password not changed" /></div>}
        <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
        <FormField label="New password" name="newPassword" type="password" autoComplete="new-password" value={passwords.newPassword} error={pwState.fieldError} hint="8+ characters with a letter and a number" onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-secondary" disabled={pwState.saving || !passwords.currentPassword}>
            {pwState.saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
