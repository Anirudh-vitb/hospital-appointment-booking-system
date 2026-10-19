import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import useAuth, { HOME_FOR_ROLE } from '../hooks/useAuth.js';
import Logo from './Logo.jsx';

const PUBLIC_LINKS = [
  { to: '/doctors', label: 'Find a doctor' },
  { to: '/departments', label: 'Departments' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const ROLE_LABEL = { patient: 'My appointments', doctor: 'Doctor desk', admin: 'Administration' };

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-teal-dark bg-teal-tint/70' : 'text-ink-soft hover:text-ink hover:bg-paper-deep'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile menu whenever the page changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  // Close the mobile menu with the Escape key.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const accountArea = user ? (
    <>
      <NavLink to={HOME_FOR_ROLE[user.role]} className={linkClass}>
        {ROLE_LABEL[user.role]}
      </NavLink>
      <span className="hidden text-sm text-ink-faint lg:inline" title={user.email}>
        {user.name.split(' ')[0]}
      </span>
      <button type="button" onClick={handleLogout} disabled={signingOut} className="btn-ghost px-3">
        <LogOut className="size-4" aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" className={linkClass}>
        Sign in
      </NavLink>
      <Link to="/register" className="btn-primary">
        Create account
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="CarePoint home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">{accountArea}</div>

        <button
          type="button"
          className="btn-ghost px-2 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-line bg-paper md:hidden">
          <nav aria-label="Mobile" className="page flex flex-col gap-1 py-3">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">{accountArea}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
