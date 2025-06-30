import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Star, TrendingUp } from "lucide-react";
import { DoctorsGrid } from "@/components/DoctorsGrid";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getDashboardRoute = () => {
    if (user?.role === "doctor") return "/doctor-dashboard";
    if (user?.role === "admin") return "/admin";
    return "/dashboard";
  };

  const getUserGreeting = () => {
    const name = user?.firstName || "there";
    const hour = new Date().getHours();

    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const quickActions = [
    {
      title: "My Dashboard",
      description: user?.role === "doctor" ? "Manage your schedule and appointments" : "View your appointments and health records",
      icon: Calendar,
      href: getDashboardRoute(),
      color: "blue",
    },
    {
      title: "Find Doctors",
      description: "Browse our network of certified healthcare professionals",
      icon: Users,
      href: "#doctors",
      color: "green",
    },
    {
      title: "Book Appointment",
      description: "Schedule a consultation with a specialist",
      icon: Star,
      href: "#doctors",
      color: "purple",
    },
  ];

  const stats = [
    {
      title: "Consultations Completed",
      value: "50,000+",
      description: "Successful patient consultations",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Patient Satisfaction",
      value: "4.9/5",
      description: "Average rating from patients",
      icon: Star,
      color: "text-yellow-600",
    },
    {
      title: "Response Time",
      value: "< 2 min",
      description: "Average booking completion time",
      icon: Calendar,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getUserGreeting()}
          </h1>
          <p className="text-gray-600">
            Welcome back to Doktu. What would you like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg bg-${action.color}-100`}>
                    <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    <Button size="sm" asChild>
                      <Link href={action.href}>Get Started</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-gray-600">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Doctors Grid - only show for unauthenticated users */}
        {!isAuthenticated && <DoctorsGrid />}

        {/* Role-specific CTA */}
        <Card className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] text-white">
          <CardContent className="p-8 text-center">
            {user?.role === "doctor" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Ready to help patients?</h2>
                <p className="text-blue-100 mb-6">
                  Manage your schedule and connect with patients who need your expertise.
                </p>
                <Button size="lg" className="bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50" asChild>
                  <Link href="/doctor-dashboard">Go to Doctor Dashboard</Link>
                </Button>
              </>
            ) : user?.role === "admin" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Monitor platform performance</h2>
                <p className="text-blue-100 mb-6">
                  View analytics, manage users, and oversee the platform operations.
                </p>
                <Button size="lg" className="bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50" asChild>
                  <Link href="/admin">Go to Admin Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4">Need medical consultation?</h2>
                <p className="text-blue-100 mb-6">
                  Connect with certified doctors for secure video consultations.
                </p>
                <Button size="lg" className="bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50" asChild>
                  <Link href="/dashboard">Book Your Consultation</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}