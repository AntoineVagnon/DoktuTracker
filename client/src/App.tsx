import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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
import DoctorDashboard from "@/pages/DoctorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Payment from "@/pages/Payment";


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
      <Route path="/checkout" component={Payment} />
      <Route path="/payment" component={Payment} />
      <Route path="/doctor/:id" component={DoctorProfile} />
      
      {/* Dashboard routes - always accessible for role-based redirects */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/doctor-dashboard" component={DoctorDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
