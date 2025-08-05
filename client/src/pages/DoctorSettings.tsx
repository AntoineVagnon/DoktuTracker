import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { User, Briefcase, CreditCard, Shield, Eye, EyeOff } from "lucide-react";
import DoctorLayout from "@/components/DoctorLayout";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DoctorSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [profileData, setProfileData] = useState({
    title: "Dr.",
    email: "",
    firstName: "",
    lastName: "",
    phone: ""
  });

  // Update profile data when user data loads
  useEffect(() => {
    if (user) {
      setProfileData({
        title: user.title || "Dr.",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || ""
      });
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // Remove email from the data to prevent authentication issues
      const { email, ...dataWithoutEmail } = data;
      return await apiRequest('PATCH', '/api/auth/user', dataWithoutEmail);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === profileData.email) {
      toast({
        title: "Invalid email",
        description: "Please enter a different email address.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingEmail(true);
    
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change email');
      }

      toast({
        title: "Email change initiated",
        description: "Please check your new email address for a verification link. You'll need to verify the new email before it becomes active.",
      });
      
      setShowEmailChange(false);
      setNewEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Simulate loading error for demonstration
  const handleRetry = () => {
    setLoadError(false);
  };

  if (loadError) {
    return (
      <DoctorLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">Failed to load profile data</div>
            <Button onClick={handleRetry}>Retry</Button>
          </CardContent>
        </Card>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2 py-3">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Professional Information</span>
              <span className="sm:hidden">Professional</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2 py-3">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Methods</span>
              <span className="sm:hidden">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={profileData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="email" 
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-gray-100 cursor-not-allowed flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmailChange(true)}
                      >
                        Change Email
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Use the Change Email button to update your email address securely
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+33 1 23 45 67 89"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="expertise">Fields of Expertise</Label>
                  <Input id="expertise" placeholder="Rechercher une expertise (min. 3 caractères)" />
                  <div className="text-sm text-gray-500 mt-1">0/10 expertise - Tous de moins 7 caractères ajoutées</div>
                </div>
                <div>
                  <Label htmlFor="degrees">Degrees and Qualifications</Label>
                  <Textarea id="degrees" placeholder="List your degrees and certifications..." />
                </div>
                <div>
                  <Label htmlFor="presentation">Professional Presentation</Label>
                  <Textarea id="presentation" placeholder="Introduce yourself to future patients: your experience, approach, specialties..." />
                </div>
                <div>
                  <Label htmlFor="awards">Awards and Distinctions</Label>
                  <Textarea id="awards" placeholder="Awards, distinctions, publications..." />
                </div>
                <div>
                  <Label htmlFor="languages">Languages Spoken</Label>
                  <Input id="languages" placeholder="Ex: French, English, Spanish..." />
                </div>
                <Button>Save Professional Information</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Moyen de Paiement</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <CreditCard className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Aucun IBAN enregistré</h3>
                <p className="text-gray-500 mb-6">Ajouter votre IBAN pour recevoir vos honoraires</p>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Ajouter un IBAN
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Modifier le Mot de Passe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input 
                        id="currentPassword" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Entrez votre mot de passe actuel" 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" placeholder="Minimum 12 caractères avec majuscules, chiffres et symboles" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input id="confirmPassword" type="password" placeholder="Confirmez votre nouveau mot de passe" />
                  </div>
                  <Button>Modifier le mot de passe</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Préférences de Notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Notifications par email</h4>
                    <div className="text-sm text-red-600">Recevoir les alertes importantes par email</div>
                    <div className="text-sm text-gray-500">Aucune adresse email utilisée</div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Notifications par SMS</h4>
                    <div className="text-sm text-gray-600">Recevoir les alertes importantes par SMS</div>
                    <div className="text-sm text-red-600">Aucun numéro de téléphone validé</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm text-blue-800">
                        <strong>Ajoutez vos coordonnées</strong><br />
                        Pour activer toutes les notifications, ajoutez et vérifiez vos coordonnées dans les paramètres de profil.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informations de Sécurité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Politique de mot de passe</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Minimum 12 caractères</li>
                        <li>• Au moins 1 majuscule et 1 minuscule</li>
                        <li>• Au moins 1 chiffre et 1 caractère spécial</li>
                        <li>• Ne peut pas être identique aux 5 derniers</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Sécurité du compte</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Verrouillage après 5 tentatives échouées</li>
                        <li>• Audit complet des actions de sécurité</li>
                        <li>• Chiffrement AES-256 des données sensibles</li>
                        <li>• Conforme HIPAA et RGPD</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Change Dialog */}
      <Dialog open={showEmailChange} onOpenChange={setShowEmailChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              Enter your new email address. You'll receive a verification link to confirm the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-email">Current Email</Label>
              <Input
                id="current-email"
                value={profileData.email}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailChange(false);
                setNewEmail('');
              }}
              disabled={isChangingEmail}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEmailChange}
              disabled={isChangingEmail || !newEmail}
            >
              {isChangingEmail ? 'Changing...' : 'Change Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DoctorLayout>
  );
}