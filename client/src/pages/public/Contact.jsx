import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Contact() {
  useDocumentTitle('Contact');
  const { data, loading, error, reload } = useApi('/public/summary');

  return (
    <div className="page max-w-3xl py-10">
      <PageHeader eyebrow="Contact" title="Contact the outpatient desk" description="For changes within two hours of an appointment, or help with an account." />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Phone className="size-4 text-teal" aria-hidden="true" /> Phone</h2>
            <p className="mt-1 font-mono">{data.hospital.phone}</p>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Mail className="size-4 text-teal" aria-hidden="true" /> Email</h2>
            <p className="mt-1 font-mono">{data.hospital.email}</p>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><MapPin className="size-4 text-teal" aria-hidden="true" /> Address</h2>
            <p className="mt-1">{data.hospital.name}</p>
            <p className="text-sm text-ink-soft">{data.hospital.addressLine}</p>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Clock className="size-4 text-teal" aria-hidden="true" /> Hours</h2>
            <p className="mt-1 text-sm">{data.hospital.hours}</p>
            <p className="text-sm text-ink-soft">Online booking is open {data.bookingRules.maxDaysAhead} days ahead.</p>
          </div>
        </div>
      )}
      <p className="mt-8 text-sm text-ink-soft">
        The hospital and its contact details are fictional — this is a student project. A server-rendered page showing the API’s status is available at{' '}
        <a href="/demo/server-info" className="font-medium text-teal hover:underline">/demo/server-info</a>.
      </p>
    </div>
  );
}
