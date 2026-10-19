import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  History,
  LayoutDashboard,
  ScrollText,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import useAuth from '../hooks/useAuth.js';

const NAV = {
  patient: [
    { to: '/patient', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/patient/appointments', label: 'Upcoming', icon: CalendarDays },
    { to: '/patient/history', label: 'History', icon: History },
    { to: '/doctors', label: 'Book a visit', icon: CalendarPlus },
    { to: '/patient/profile', label: 'Profile', icon: UserRound },
  ],
  doctor: [
    { to: '/doctor', label: 'Today', icon: LayoutDashboard, end: true },
    { to: '/doctor/appointments', label: 'Appointments', icon: ClipboardList },
    { to: '/doctor/availability', label: 'Availability', icon: CalendarClock },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/appointments', label: 'Appointments', icon: ClipboardList },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/audit-logs', label: 'Audit log', icon: ScrollText },
  ],
};

const TITLES = { patient: 'Patient', doctor: 'Doctor desk', admin: 'Administration' };

// Shared frame for the signed-in areas: a section menu (sidebar on desktop,
// scrollable tab row on mobile) and the page content.
export default function DashboardLayout() {
  const { user } = useAuth();
  const items = NAV[user.role];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page grid gap-6 py-6 lg:grid-cols-[210px_1fr] lg:py-10">
        <aside className="min-w-0">
          <p className="mb-2 hidden px-3 text-xs font-semibold tracking-wide text-ink-faint uppercase lg:block">{TITLES[user.role]}</p>
          <nav aria-label={`${TITLES[user.role]} sections`} className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2 lg:mx-0 lg:flex-col lg:border-0 lg:px-0">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
