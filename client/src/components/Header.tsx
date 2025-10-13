import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import { AllowanceDashboard } from "@/components/AllowanceDashboard";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('common');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 64);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { nameKey: "header.navigation.doctors", href: "#doctors" },
    { nameKey: "header.navigation.how_it_works", href: "#how-it-works" },
    { nameKey: "header.navigation.pricing", href: "#pricing" },
  ];

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return "U";
  };

  const getDashboardRoute = () => {
    if (user?.role === "doctor") return "/doctor-dashboard";
    if (user?.role === "admin") return "/admin";
    return "/dashboard";
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      const data = await response.json();
      
      if (response.ok) {
        // Clear any local storage items
        sessionStorage.clear();
        localStorage.removeItem('auth_redirect');
        localStorage.removeItem('booking_redirect');
        localStorage.removeItem('doktu_auth');

        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
        
        // Redirect to homepage
        setLocation('/');
        
        // Refresh page to update auth state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        throw new Error(data.error || 'Logout failed');
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: error.message || "Logout failed, please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
        isScrolled ? "shadow-lg" : ""
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
              <span className="text-lg font-bold text-white">D</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Doktu</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {!isAuthenticated && navigation.map((item) => (
              <a
                key={item.nameKey}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-[hsl(207,100%,52%)] transition-colors"
              >
                {t(item.nameKey)}
              </a>
            ))}
          </nav>

          {/* Right side - Auth buttons or User menu */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {!isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAuthModalTab("login");
                    setIsAuthModalOpen(true);
                  }}
                >
                  {t('header.auth.sign_in')}
                </Button>
                <Button
                  className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] hover:shadow-lg transition-all duration-200"
                  onClick={() => {
                    setAuthModalTab("signup");
                    setIsAuthModalOpen(true);
                  }}
                >
                  {t('header.auth.sign_up')}
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardRoute()} className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('header.navigation.dashboard')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? t('header.auth.logging_out') : t('header.auth.log_out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            {!isAuthenticated && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <nav className="flex flex-col space-y-4">
                    {navigation.map((item) => (
                      <a
                        key={item.nameKey}
                        href={item.href}
                        className="text-lg font-medium text-gray-700 hover:text-[hsl(207,100%,52%)] transition-colors"
                      >
                        {t(item.nameKey)}
                      </a>
                    ))}
                    <div className="pt-4 space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setAuthModalTab("login");
                          setIsAuthModalOpen(true);
                        }}
                      >
                        {t('header.auth.sign_in')}
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                        onClick={() => {
                          setAuthModalTab("signup");
                          setIsAuthModalOpen(true);
                        }}
                      >
                        {t('header.auth.sign_up')}
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </header>
  );
}
