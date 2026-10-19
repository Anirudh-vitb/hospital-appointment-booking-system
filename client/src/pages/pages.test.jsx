import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Login from './public/Login.jsx';
import Register from './public/Register.jsx';
import Doctors from './public/Doctors.jsx';
import RoleBasedRoute from '../components/RoleBasedRoute.jsx';
import { ApiError } from '../api/client.js';
import { mockFetch, renderWithProviders, sampleDoctor } from '../test/utils.jsx';

describe('Login form', () => {
  it('validates before calling the server', async () => {
    const login = vi.fn();
    renderWithProviders(<Login />, { auth: { login } });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter the email address you registered with')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the server’s message when sign-in fails', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError('The email or password is incorrect.', { status: 401 }));
    renderWithProviders(<Login />, { auth: { login } });
    await userEvent.type(screen.getByLabelText(/Email/), 'patient@carepoint.example');
    await userEvent.type(screen.getByLabelText(/Password/), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('patient@carepoint.example', 'wrong');
  });

  it('demo account buttons fill in the form', async () => {
    renderWithProviders(<Login />);
    await userEvent.click(screen.getByRole('button', { name: 'patient@carepoint.example' }));
    expect(screen.getByLabelText(/Email/)).toHaveValue('patient@carepoint.example');
  });
});

describe('Registration form', () => {
  it('reports every invalid field and mismatched passwords', async () => {
    const register = vi.fn();
    renderWithProviders(<Register />, { auth: { register } });
    await userEvent.type(screen.getByLabelText(/Mobile number/), '12345');
    await userEvent.type(screen.getByLabelText(/^Password/), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'different1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Enter a 10-digit mobile number without +91')).toBeInTheDocument();
    expect(screen.getByText('Include at least one letter and one number')).toBeInTheDocument();
    expect(screen.getByText('The two passwords do not match')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});

describe('Doctor directory', () => {
  it('loads doctors from the API and searches by name', async () => {
    const fetchSpy = mockFetch({
      '/departments': { body: { success: true, data: [] } },
      '/doctors/specialties': { body: { success: true, data: ['Dermatology'] } },
      '/doctors': (url) => {
        const q = new URL(url, 'http://localhost').searchParams.get('q');
        const data = !q || 'dr. meera iyer'.includes(q.toLowerCase()) ? [sampleDoctor] : [];
        return { body: { success: true, data, meta: { page: 1, limit: 9, total: data.length, totalPages: 1 } } };
      },
    });
    renderWithProviders(<Doctors />, { route: '/doctors' });
    expect(await screen.findByRole('heading', { name: 'Dr. Meera Iyer' })).toBeInTheDocument();
    expect(screen.getByText('1 doctor')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Name or specialty'), 'zzz');
    expect(await screen.findByText('No doctors match these filters')).toBeInTheDocument();
    const lastUrl = fetchSpy.mock.calls.at(-1)[0];
    expect(lastUrl).toContain('q=zzz');
  });

  it('shows an error with retry when the API is unreachable', async () => {
    // DATABASE_UNAVAILABLE is reported straight away rather than retried.
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'The appointment database is not reachable right now.' } }), { status: 503 }),
    );
    renderWithProviders(<Doctors />, { route: '/doctors' });
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => a.textContent.includes('not reachable right now'))).toBe(true);
    expect(screen.getAllByRole('button', { name: /retry/i }).length).toBeGreaterThan(0);
  });
});

describe('Role-based routes', () => {
  const tree = (
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/patient" element={<p>Patient home</p>} />
      <Route element={<RoleBasedRoute roles={['admin']} />}>
        <Route path="/admin" element={<p>Admin area</p>} />
      </Route>
    </Routes>
  );

  it('sends visitors to the login page', () => {
    renderWithProviders(tree, { route: '/admin' });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('sends a patient back to their own dashboard', () => {
    renderWithProviders(tree, { route: '/admin', user: { role: 'patient', name: 'P' } });
    expect(screen.getByText('Patient home')).toBeInTheDocument();
  });

  it('lets an administrator in', async () => {
    renderWithProviders(tree, { route: '/admin', user: { role: 'admin', name: 'A' } });
    await waitFor(() => expect(screen.getByText('Admin area')).toBeInTheDocument());
  });
});
