import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Home, 
  Calendar, 
  FileText, 
  Settings, 
  Menu,
  X,
  User,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getUserInitials } from "@/lib/nameUtils";

export default function DoctorTopNavigation() {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 64);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    {
      name: "Dashboard",
      href: "/doctor-dashboard",
      icon: Home,
      current: location === "/doctor-dashboard"
    },
    {
      name: "Calendar",
      href: "/doctor-calendar", 
      icon: Calendar,
      current: location === "/doctor-calendar"
    },
    {
      name: "Patient Records",
      href: "/doctor-records",
      icon: FileText,
      current: location === "/doctor-records"
    },
    {
      name: "Settings",
      href: "/doctor-settings",
      icon: Settings,
      current: location === "/doctor-settings"
    }
  ];

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      
      if (response.ok) {
        sessionStorage.clear();
        localStorage.removeItem('auth_redirect');
        localStorage.removeItem('booking_redirect');
        
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
        
        setLocation('/');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Sticky transparent header like homepage */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/20' 
          : 'bg-white/70 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - clickable to go back to homepage */}
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Doktu</span>
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={item.current ? "default" : "ghost"}
                      className={`flex items-center gap-2 px-4 py-2 min-w-fit ${
                        item.current 
                          ? 'bg-white shadow-sm text-gray-900 font-medium' 
                          : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                      }`}
                      size="sm"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* User Avatar - right side like homepage */}
            <div className="flex items-center space-x-4">
              {/* Always show user menu with logout option */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.email || "User"} />
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {user ? getUserInitials(user) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/doctor-dashboard">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                >
                  {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileOpen && (
            <div className="md:hidden border-t border-gray-200/20 bg-white/90 backdrop-blur-md">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <Button
                        variant={item.current ? "default" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}