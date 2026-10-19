import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-paper/80">
      <div className="page grid gap-8 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo inverted />
          <p className="mt-3 text-paper/60">Outpatient appointment booking for a fictional hospital.</p>
        </div>
        <nav aria-label="Patients">
          <p className="mb-2 font-semibold text-paper">Patients</p>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-paper" to="/doctors">Find a doctor</Link></li>
            <li><Link className="hover:text-paper" to="/departments">Departments</Link></li>
            <li><Link className="hover:text-paper" to="/patient">My appointments</Link></li>
            <li><Link className="hover:text-paper" to="/register">Create an account</Link></li>
          </ul>
        </nav>
        <nav aria-label="Project">
          <p className="mb-2 font-semibold text-paper">Project</p>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-paper" to="/about">About this project</Link></li>
            <li><Link className="hover:text-paper" to="/contact">Contact</Link></li>
            <li><a className="hover:text-paper" href="/demo/server-info">Server-rendered demo (EJS)</a></li>
            <li><Link className="hover:text-paper" to="/login">Staff sign in</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-2 font-semibold text-paper">Academic demonstration</p>
          <p className="text-paper/60">
            Built for Full Stack Development – 2 (R-23), Department of CSE, Vishnu Institute of Technology, Bhimavaram. All doctors,
            patients and contact details are fictional. Not for real medical use.
          </p>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <p className="page py-4 text-xs text-paper/50">© {new Date().getFullYear()} CarePoint student project · React · Express · MongoDB</p>
      </div>
    </footer>
  );
}
