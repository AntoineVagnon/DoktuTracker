import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Calendar, 
  FileText, 
  Settings, 
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DoctorTopNavigation() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  return (
    <>
      {/* Sticky transparent navigation bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-900">Doktu</h2>
              <span className="ml-2 text-sm text-gray-500">Doctor Portal</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={item.current ? "default" : "ghost"}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

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

          {/* Mobile Navigation */}
          {isMobileOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white">
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
      </nav>
    </>
  );
}