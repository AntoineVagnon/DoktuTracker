import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { CookieBanner } from "@/components/CookieBanner";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import DoctorProfile from "@/pages/DoctorProfile";

import Register from "@/pages/Register";
import AuthChoice from "@/pages/AuthChoice";
import RegisterForm from "@/pages/RegisterForm";
import LoginForm from "@/pages/LoginForm";
import LoginBook from "@/pages/LoginBook";
import TestLogin from "@/pages/TestLogin";
import AuthCallback from "@/pages/AuthCallback";
import CreateAccount from "@/pages/CreateAccount";
import PasswordReset from "@/pages/PasswordReset";
import TestPasswordReset from "@/pages/TestPasswordReset";
import EmailRecovery from "@/pages/EmailRecovery";
import DoctorDashboard from "@/pages/DoctorDashboard";
import DoctorCalendar from "@/pages/DoctorCalendar";
import DoctorSettings from "@/pages/DoctorSettings";
import PatientRecords from "@/pages/PatientRecords";
import DocumentLibrary from "@/pages/DocumentLibrary";
import { PatientCalendar } from "@/pages/PatientCalendar";
import AdminDashboard from "@/pages/AdminDashboard";
import Payment from "@/pages/Payment";
import Checkout from "@/pages/Checkout";
import DoctorList from "@/pages/DoctorList";
import BookAppointmentChoice from "@/pages/BookAppointmentChoice";
import PatientLogin from "@/pages/PatientLogin";
import PatientRegistration from "@/pages/PatientRegistration";
import PaymentSuccess from "@/pages/PaymentSuccess";
import VideoConsultation from "@/pages/VideoConsultation";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import GDPRCompliance from "@/pages/GDPRCompliance";
import MedicalDisclaimer from "@/pages/MedicalDisclaimer";
import ConsentManagement from "@/pages/ConsentManagement";
import DataProcessingRecords from "@/pages/DataProcessingRecords";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/register" component={Register} />
      <Route path="/auth-choice" component={AuthChoice} />
      <Route path="/register-form" component={RegisterForm} />
      <Route path="/login-form" component={LoginForm} />
      <Route path="/login-book" component={LoginBook} />
      <Route path="/test-login" component={TestLogin} />
      <Route path="/create-account" component={CreateAccount} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/password-reset" component={PasswordReset} />
      <Route path="/test-password-reset" component={TestPasswordReset} />
      <Route path="/email-recovery" component={EmailRecovery} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment" component={Payment} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/doctor/:id" component={DoctorProfile} />
      <Route path="/doctors" component={DoctorList} />
      <Route path="/book-appointment-choice" component={BookAppointmentChoice} />
      <Route path="/patient-login" component={PatientLogin} />
      <Route path="/patient-registration" component={PatientRegistration} />
      
      {/* Dashboard routes - always accessible for role-based redirects */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/doctor-dashboard" component={DoctorDashboard} />
      <Route path="/doctor-calendar" component={DoctorCalendar} />
      <Route path="/doctor-settings" component={DoctorSettings} />
      <Route path="/doctor-records" component={PatientRecords} />
      <Route path="/documents" component={DocumentLibrary} />
      <Route path="/patient-calendar" component={PatientCalendar} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/video-consultation/:id" component={VideoConsultation} />
      
      {/* Legal and Compliance Pages */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/gdpr" component={GDPRCompliance} />
      <Route path="/disclaimer" component={MedicalDisclaimer} />
      <Route path="/consent-management" component={ConsentManagement} />
      <Route path="/data-processing-records" component={DataProcessingRecords} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CookieBanner />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
