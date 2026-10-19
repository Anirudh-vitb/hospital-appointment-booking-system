import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import RoleBasedRoute from './components/RoleBasedRoute.jsx';
import ServerWakeNotice from './components/ServerWakeNotice.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import Home from './pages/public/Home.jsx';

// Every page other than Home is loaded on demand, so a patient never
// downloads the administrator screens.
const Doctors = lazy(() => import('./pages/public/Doctors.jsx'));
const DoctorDetails = lazy(() => import('./pages/public/DoctorDetails.jsx'));
const Departments = lazy(() => import('./pages/public/Departments.jsx'));
const Login = lazy(() => import('./pages/public/Login.jsx'));
const Register = lazy(() => import('./pages/public/Register.jsx'));
const About = lazy(() => import('./pages/public/About.jsx'));
const Contact = lazy(() => import('./pages/public/Contact.jsx'));
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));

const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard.jsx'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile.jsx'));
const BookAppointment = lazy(() => import('./pages/patient/BookAppointment.jsx'));
const BookingConfirmation = lazy(() => import('./pages/patient/BookingConfirmation.jsx'));
const UpcomingAppointments = lazy(() => import('./pages/patient/UpcomingAppointments.jsx'));
const AppointmentHistory = lazy(() => import('./pages/patient/AppointmentHistory.jsx'));
const AppointmentDetails = lazy(() => import('./pages/patient/AppointmentDetails.jsx'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard.jsx'));
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments.jsx'));
const DoctorAppointmentDetails = lazy(() => import('./pages/doctor/DoctorAppointmentDetails.jsx'));
const ManageAvailability = lazy(() => import('./pages/doctor/ManageAvailability.jsx'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const ManageDoctors = lazy(() => import('./pages/admin/ManageDoctors.jsx'));
const ManageDepartments = lazy(() => import('./pages/admin/ManageDepartments.jsx'));
const ManageAppointments = lazy(() => import('./pages/admin/ManageAppointments.jsx'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs.jsx'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner className="page" />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="doctors/:id" element={<DoctorDetails />} />
            <Route path="departments" element={<Departments />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<RoleBasedRoute roles={['patient']} />}>
            <Route path="patient" element={<DashboardLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="book/:doctorId" element={<BookAppointment />} />
              <Route path="appointments" element={<UpcomingAppointments />} />
              <Route path="appointments/:id" element={<AppointmentDetails />} />
              <Route path="appointments/:id/confirmation" element={<BookingConfirmation />} />
              <Route path="history" element={<AppointmentHistory />} />
            </Route>
          </Route>

          <Route element={<RoleBasedRoute roles={['doctor']} />}>
            <Route path="doctor" element={<DashboardLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="appointments/:id" element={<DoctorAppointmentDetails />} />
              <Route path="availability" element={<ManageAvailability />} />
            </Route>
          </Route>

          <Route element={<RoleBasedRoute roles={['admin']} />}>
            <Route path="admin" element={<DashboardLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="doctors" element={<ManageDoctors />} />
              <Route path="departments" element={<ManageDepartments />} />
              <Route path="appointments" element={<ManageAppointments />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <ServerWakeNotice />
    </ErrorBoundary>
  );
}
