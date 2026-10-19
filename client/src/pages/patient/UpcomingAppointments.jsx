import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import PatientAppointmentList from './PatientAppointmentList.jsx';

export default function UpcomingAppointments() {
  useDocumentTitle('Upcoming appointments');
  return (
    <>
      <PageHeader title="Upcoming appointments" description="Soonest first. Open an appointment to see details or cancel it." actions={<Link to="/doctors" className="btn-primary">Book another</Link>} />
      <PatientAppointmentList scope="upcoming" />
    </>
  );
}
