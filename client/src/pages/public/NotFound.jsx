import { Link } from 'react-router-dom';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="page max-w-xl py-20 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 text-3xl">This page does not exist</h1>
      <p className="mt-2 text-ink-soft">The link may be mistyped, or the page may have moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn-primary">Home</Link>
        <Link to="/doctors" className="btn-secondary">Find a doctor</Link>
      </div>
    </div>
  );
}
