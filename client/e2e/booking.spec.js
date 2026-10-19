import { expect, test } from '@playwright/test';

const PASSWORD = 'CarePoint@2026';
const PATIENT = 'patient@carepoint.example';
const DOCTOR = 'lakshmi.narayana@carepoint.example';

async function signIn(page, email, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

// Opens the booking page for Dr. Lakshmi Narayana, picks the first bookable
// date after tomorrow and returns the first free time shown.
async function openBookingAndPickSlot(page) {
  await page.goto('/doctors');
  await page.getByLabel('Name or specialty').fill('Lakshmi');
  await expect(page.getByRole('heading', { name: 'Dr. Lakshmi Narayana' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dr. Anitha Reddy' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Dr. Lakshmi Narayana', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Weekly OPD hours' })).toBeVisible();
  await page.getByRole('link', { name: 'Book an appointment' }).click();

  const dates = page.getByRole('radio');
  await expect(dates.first()).toBeVisible();
  const count = await dates.count();
  for (let i = 3; i < count; i += 1) {
    if (await dates.nth(i).isEnabled()) {
      await dates.nth(i).click();
      break;
    }
  }
  const free = page.locator('fieldset button:not([disabled])').first();
  await expect(free).toBeVisible();
  return free;
}

test('patient books, doctor confirms, patient cancels and the slot is released', async ({ browser }) => {
  const patientCtx = await browser.newContext();
  const patient = await patientCtx.newPage();

  // 1. Patient signs in.
  await signIn(patient, PATIENT);
  await expect(patient).toHaveURL(/\/patient$/);

  // 2–4. Search, open profile, choose date and slot.
  const slotButton = await openBookingAndPickSlot(patient);
  const slotLabel = (await slotButton.textContent()).trim();
  await slotButton.click();
  await patient.getByLabel('What would you like to discuss?').fill('Child has a mild fever and cough');

  // 5. Book.
  await patient.getByRole('button', { name: 'Review booking' }).click();
  await patient.getByRole('button', { name: 'Book appointment' }).click();
  await expect(patient.getByRole('heading', { name: 'Your appointment request is in' })).toBeVisible();
  const reference = (await patient.locator('section[aria-label="Appointment slip"] .font-mono').first().textContent()).trim();
  expect(reference).toMatch(/^CP-\d{8}-[A-Z2-9]{5}$/);

  // 6. Appointment appears in the patient's list and survives a reload.
  await patient.goto('/patient/appointments');
  await patient.reload();
  const card = patient.locator('article', { hasText: reference });
  await expect(card).toContainText('Pending');

  // 7. Doctor signs in (separate browser session) and confirms it.
  const doctorCtx = await browser.newContext();
  const doctor = await doctorCtx.newPage();
  await signIn(doctor, DOCTOR);
  await expect(doctor).toHaveURL(/\/doctor$/);
  await doctor.goto('/doctor/appointments?scope=upcoming&status=pending');
  await doctor.locator('article', { hasText: reference }).getByRole('link').click();
  await expect(doctor.getByText('Child has a mild fever and cough')).toBeVisible();
  await doctor.getByRole('button', { name: 'Confirm', exact: true }).click();
  await doctor.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(doctor.getByText('Confirmed', { exact: true }).first()).toBeVisible();

  // 8. Patient sees the updated status.
  await patient.reload();
  await expect(patient.locator('article', { hasText: reference })).toContainText('Confirmed');

  // 9. Patient cancels.
  await patient.locator('article', { hasText: reference }).getByRole('link').click();
  await patient.getByRole('button', { name: 'Cancel appointment' }).click();
  await patient.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(patient.getByText('Your appointment has been cancelled')).toBeVisible();

  // 10. The slot is bookable again.
  await patient.goBack();
  await openBookingAndPickSlot(patient);
  await expect(patient.getByRole('button', { name: slotLabel, exact: true })).toBeEnabled();

  await doctorCtx.close();
  await patientCtx.close();
});

test('a stale page cannot double-book a slot someone else just took', async ({ browser }) => {
  // Second patient registers through the UI.
  const lateCtx = await browser.newContext();
  const late = await lateCtx.newPage();
  await late.goto('/register');
  await late.getByLabel('Full name').fill('Second Sample Patient');
  await late.getByLabel('Email').fill(`late${Date.now()}@e2e.example`);
  await late.getByLabel('Mobile number').fill('9811122233');
  await late.locator('input[name=password]').fill('LatePass123');
  await late.getByLabel('Confirm password').fill('LatePass123');
  await late.getByRole('button', { name: 'Create account' }).click();
  await expect(late).toHaveURL(/\/patient$/);

  // Both patients open the same day and see the same free slot.
  const lateSlot = await openBookingAndPickSlot(late);
  const time = (await lateSlot.textContent()).trim();
  await lateSlot.click();
  await late.getByLabel('What would you like to discuss?').fill('Routine check');

  const firstCtx = await browser.newContext();
  const first = await firstCtx.newPage();
  await signIn(first, PATIENT);
  await expect(first).toHaveURL(/\/patient$/);
  const firstSlot = await openBookingAndPickSlot(first);
  expect((await firstSlot.textContent()).trim()).toBe(time);
  await firstSlot.click();
  await first.getByLabel('What would you like to discuss?').fill('Vaccination');
  await first.getByRole('button', { name: 'Review booking' }).click();
  await first.getByRole('button', { name: 'Book appointment' }).click();
  await expect(first.getByRole('heading', { name: 'Your appointment request is in' })).toBeVisible();

  // The late patient's page is now stale; the server refuses the booking.
  await late.getByRole('button', { name: 'Review booking' }).click();
  await late.getByRole('button', { name: 'Book appointment' }).click();
  await expect(late.getByText('That time is no longer available')).toBeVisible();
  await expect(late.getByText(/Refresh the available times/)).toBeVisible();
  await expect(late.getByRole('button', { name: `${time}, already booked` })).toBeDisabled();

  await firstCtx.close();
  await lateCtx.close();
});

test('role restrictions: patients are kept out of doctor and admin areas', async ({ page }) => {
  await signIn(page, PATIENT);
  await expect(page).toHaveURL(/\/patient$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/patient$/);
  const status = await page.evaluate(async () => (await fetch('/api/admin/stats')).status);
  expect(status).toBe(403);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/patient');
  await expect(page).toHaveURL(/\/login$/);
});

test('administrator sees live statistics', async ({ page }) => {
  await signIn(page, 'admin@e2e.example', 'AdminE2E2026');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Hospital overview' })).toBeVisible();
  await expect(page.getByText('Active doctors')).toBeVisible();
  await page.getByRole('link', { name: 'Audit log' }).click();
  await page.getByLabel('Action').selectOption('appointment');
  await expect(page.getByText('appointment.book').first()).toBeVisible();
});
