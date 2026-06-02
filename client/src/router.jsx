import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { LoginPage } from './auth/LoginPage.jsx';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage.jsx';
import { ChangePasswordPage } from './auth/ChangePasswordPage.jsx';
import { DeviceRegistrationPage } from './devices/DeviceRegistrationPage.jsx';
import { PatientRegisterPage } from './patients/PatientRegisterPage.jsx';
import { DashboardPage } from './dashboard/DashboardPage.jsx';
import { VisitsPage } from './visits/VisitsPage.jsx';
import { VisitDetailPage } from './visits/VisitDetailPage.jsx';
import { ReportsPage } from './reports/ReportsPage.jsx';
import { SampleCollectionPage } from './sampleCollection/SampleCollectionPage.jsx';
import { ApiTesterPage } from './apiTester/ApiTesterPage.jsx';
import { ClinicsPage } from './clinics/ClinicsPage.jsx';
import { ClinicDetailPage } from './clinics/ClinicDetailPage.jsx';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/register', element: <PatientRegisterPage /> },
      { path: '/device-registration', element: <DeviceRegistrationPage /> }
    ]
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'visits', element: <VisitsPage /> },
      { path: 'visits/:labNumber', element: <VisitDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'clinics', element: <ClinicsPage /> },
      { path: 'clinics/:clinicNo', element: <ClinicDetailPage /> },
      { path: 'api-tester', element: <ApiTesterPage /> },
      { path: 'sample-collection', element: <SampleCollectionPage /> },
      { path: 'change-password', element: <ChangePasswordPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
]);
