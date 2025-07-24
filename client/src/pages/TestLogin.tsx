import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

export default function TestLogin() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: 'antoine.vagnon@gmail.com', // Pre-filled for testing
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginResult(null);

    try {
      // Test Supabase Auth API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setLoginResult(data);
      toast({
        title: "Login Successful!",
        description: `Welcome back ${data.user?.email || 'User'}`,
      });

      // Redirect to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setLoginResult({ error: error instanceof Error ? error.message : 'Login failed' });
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();
      setLoginResult({ currentUser: data });
    } catch (error) {
      setLoginResult({ error: 'Failed to fetch current user' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Supabase Login Test
              </CardTitle>
              <p className="text-gray-600 text-center">
                Test authentication with your Supabase credentials
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="space-y-2">
                <Button 
                  onClick={testCurrentUser}
                  variant="outline"
                  className="w-full"
                >
                  Test Current User
                </Button>
              </div>

              {loginResult && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-medium mb-2">Result:</h3>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(loginResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}