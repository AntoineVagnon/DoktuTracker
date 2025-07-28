import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, GraduationCap, CreditCard, Shield } from "lucide-react";

export default function DoctorSettingsTabs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and professional information</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </TabsTrigger>
          <TabsTrigger value="professional" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>Professional Info</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Payment Methods</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="James" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Rodriguez" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="james.rodriguez@doktu.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+33 1 23 45 67 89" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>
                Manage your medical credentials and specializations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Medical Specialty</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Medicine</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="dermatology">Dermatology</SelectItem>
                    <SelectItem value="psychiatry">Psychiatry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpps">RPPS Number</Label>
                <Input id="rpps" placeholder="10003000000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Textarea id="education" placeholder="Medical degree from..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea id="experience" placeholder="Years of practice..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languages">Languages</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">French</Badge>
                  <Badge variant="secondary">English</Badge>
                  <Badge variant="secondary">Spanish</Badge>
                </div>
              </div>
              <Button>Update Professional Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your payment methods for receiving consultation fees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consultation-price">Consultation Price (EUR)</Label>
                <Input id="consultation-price" placeholder="35" type="number" />
              </div>
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">No bank account connected</p>
                  <Button variant="outline" className="mt-2">Connect Bank Account</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Stripe Account</Label>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Stripe account not connected</p>
                  <Button variant="outline" className="mt-2">Connect Stripe</Button>
                </div>
              </div>
              <Button>Save Payment Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button>Change Password</Button>
              
              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">Two-factor authentication is not enabled</p>
                  <Button variant="outline" className="mt-2">Enable 2FA</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}