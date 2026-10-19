import PageHeader from '../../components/PageHeader.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import PatientAppointmentList from './PatientAppointmentList.jsx';

export default function AppointmentHistory() {
  useDocumentTitle('Appointment history');
  return (
    <>
      <PageHeader title="Appointment history" description="Past visits and appointments that were cancelled or declined, most recent first." />
      <PatientAppointmentList scope="past" />
    </>
  );
}
