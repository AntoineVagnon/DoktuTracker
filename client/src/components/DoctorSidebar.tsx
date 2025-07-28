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

interface DoctorSidebarProps {
  className?: string;
}

export default function DoctorSidebar({ className }: DoctorSidebarProps) {
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
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-md"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:static lg:z-auto lg:h-screen",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Doktu</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
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
                    size="lg"
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2025 Doktu
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for main content on desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
}