import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Briefcase, CreditCard, Shield, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorSettings() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Simulate loading error for demonstration
  const handleRetry = () => {
    setLoadError(false);
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">Failed to load profile data</div>
            <Button onClick={handleRetry}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/doctor-dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professional Information
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
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
                    <Input id="title" defaultValue={user?.title || "Dr."} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user?.email} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue={user?.firstName || ""} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue={user?.lastName || ""} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+33 1 23 45 67 89" />
                </div>
                <Button>Save Profile</Button>
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
    </div>
  );
}