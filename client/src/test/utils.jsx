import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/authContextObject.js';

export const sampleDoctor = {
  id: 'd1',
  name: 'Dr. Meera Iyer',
  specialty: 'Dermatology',
  department: { id: 'dep1', name: 'Dermatology', slug: 'dermatology' },
  qualifications: ['MBBS', 'MD (DVL)'],
  experienceYears: 8,
  consultationFee: 500,
  languages: ['English'],
  weeklySchedule: [
    { dayOfWeek: 1, start: '15:00', end: '18:00' },
    { dayOfWeek: 3, start: '15:00', end: '18:00' },
  ],
  workingDays: [1, 3],
};

// Renders a component inside a router and a fake auth context, so tests can
// control who is "signed in" without a server.
export function renderWithProviders(ui, { user = null, route = '/', auth = {} } = {}) {
  const value = {
    user,
    status: 'ready',
    login: async () => user,
    register: async () => user,
    logout: async () => {},
    setUser: () => {},
    refreshSession: async () => {},
    ...auth,
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}

// Fake fetch that answers by URL path.
export function mockFetch(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '');
    const handler = routes[path];
    if (!handler) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not mocked' } }), { status: 404 });
    const { status = 200, body } = typeof handler === 'function' ? handler(url) : handler;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
}
