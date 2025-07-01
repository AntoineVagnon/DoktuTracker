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
import BookAppointment from "@/pages/BookAppointment";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Checkout from "@/pages/Checkout";
import DoctorDashboard from "@/pages/DoctorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={isLoading || !isAuthenticated ? Landing : Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/book" component={BookAppointment} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/doctor/:id" component={DoctorProfile} />
      
      {isAuthenticated && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/doctor-dashboard" component={DoctorDashboard} />
          <Route path="/admin" component={AdminDashboard} />
        </>
      )}
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
