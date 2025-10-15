import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";

// Helper function to safely extract string from error messages
const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as any).message;
    return typeof msg === 'string' ? msg : 'An error occurred';
  }
  return 'An error occurred';
};

// Helper function to safely extract string from response data
const getMessageString = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return '';
};

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation('auth');

  // Sync activeTab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setAuthError(null);

      // Store auth data in localStorage for Authorization header
      if (data.session) {
        localStorage.setItem('doktu_auth', JSON.stringify(data));
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      onClose();

      // Role-based redirect based on the authenticated user's role
      const userRole = data.user?.role;
      if (userRole === 'doctor') {
        window.location.href = '/doctor-dashboard';
      } else if (userRole === 'admin') {
        window.location.href = '/admin-dashboard';
      } else {
        // Default to patient dashboard
        window.location.href = '/dashboard';
      }
    },
    onError: (error: Error) => {
      // Improve error message for common cases
      let errorMessage = error.message;
      if (errorMessage === "Invalid login credentials") {
        errorMessage = "Incorrect email or password";
      }
      
      setAuthError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setAuthError(null);

      // Store auth data in localStorage for Authorization header
      if (data.session) {
        localStorage.setItem('doktu_auth', JSON.stringify(data));
      }

      const successMessage = getMessageString(data) || "Your account has been created successfully!";
      toast({
        title: "Account Created",
        description: successMessage,
      });
      onClose();
      // For new patients, redirect to dashboard
      // New users are patients by default
      window.location.href = '/dashboard';
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error) || "An error occurred during signup";
      setAuthError(errorMessage);
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleSignupSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  const handlePasswordReset = async () => {
    const email = loginForm.getValues("email");
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    
    try {
      // Store context for password reset flow
      sessionStorage.setItem('password_reset_context', JSON.stringify({
        source: 'homepage_modal',
        timestamp: Date.now()
      }));

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          context: 'homepage_modal'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions",
        });
        onClose();
      } else {
        throw new Error(data.error || 'Password reset failed');
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error) || "An error occurred while sending reset email";
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleClose = () => {
    loginForm.reset();
    signupForm.reset();
    setIsResettingPassword(false);
    setAuthError(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Backdrop click handler - only catches clicks outside modal */}
      <div 
        className="absolute inset-0"
        onClick={handleClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal - prevent event bubbling to backdrop */}
      <div 
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 z-10"
        onClick={(e) => e.stopPropagation()}
        data-testid="auth-modal"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal content */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-center mb-2">{t('auth.modal.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
            {t('auth.modal.subtitle')}
          </p>
        </div>

        {/* Error message at the top */}
        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium text-center">
              {authError}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as "login" | "signup");
          setAuthError(null); // Clear error when switching tabs
        }}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">{t('auth.login.title')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.register.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="login-email">{t('auth.login.email_field')}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={t('auth.login.email_field')}
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="login-password">{t('auth.login.password_field')}</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder={t('auth.login.password_field')}
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : t('auth.login.button')}
              </Button>
            </form>

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResettingPassword}
                className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
              >
                {isResettingPassword ? "Sending reset email..." : t('auth.login.forgot_password')}
              </button>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.login.no_account')}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {t('auth.login.sign_up_link')}
                </button>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signup-firstName">{t('auth.register.first_name')}</Label>
                  <Input
                    id="signup-firstName"
                    placeholder={t('auth.register.first_name')}
                    {...signupForm.register("firstName")}
                  />
                  {signupForm.formState.errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">
                      {signupForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="signup-lastName">{t('auth.register.last_name')}</Label>
                  <Input
                    id="signup-lastName"
                    placeholder={t('auth.register.last_name')}
                    {...signupForm.register("lastName")}
                  />
                  {signupForm.formState.errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">
                      {signupForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="signup-email">{t('auth.register.email_field')}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={t('auth.register.email_field')}
                  {...signupForm.register("email")}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-password">{t('auth.register.password_field')}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder={t('auth.register.password_field')}
                  {...signupForm.register("password")}
                />
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Creating Account..." : t('auth.register.button')}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.register.have_account')}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {t('auth.register.login_link')}
                </button>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>,
    document.body
  );
}