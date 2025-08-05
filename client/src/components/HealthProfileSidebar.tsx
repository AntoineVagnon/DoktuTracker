import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Heart, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { HealthProfile } from "@shared/schema";

const healthProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  medicalHistory: z.array(z.string()).default([]),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type HealthProfileForm = z.infer<typeof healthProfileSchema>;

interface HealthProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HealthProfileSidebar({ isOpen, onClose }: HealthProfileSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [completionScore, setCompletionScore] = useState(0);

  // Fetch existing health profile
  const { data: healthProfile, isLoading } = useQuery<HealthProfile>({
    queryKey: ["/api/health-profile", user?.id],
    enabled: !!user && isOpen,
  });

  const form = useForm<HealthProfileForm>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      allergies: [],
      medications: [],
      medicalHistory: [],
    }
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  // Calculate completion score
  useEffect(() => {
    const basicFields = [
      watchedValues.dateOfBirth,
      watchedValues.gender,
      watchedValues.height,
      watchedValues.weight,
      watchedValues.bloodType,
      watchedValues.emergencyContactName,
      watchedValues.emergencyContactPhone,
    ];
    
    const arrayFields = [
      watchedValues.allergies,
      watchedValues.medications,
      watchedValues.medicalHistory,
    ];
    
    // Count filled basic fields (strings)
    const filledBasicFields = basicFields.filter(field => field && field.trim() !== '').length;
    
    // Count filled array fields (arrays with at least one item)
    const filledArrayFields = arrayFields.filter(field => field && Array.isArray(field) && field.length > 0).length;
    
    const totalFields = basicFields.length + arrayFields.length;
    const totalFilledFields = filledBasicFields + filledArrayFields;
    
    const score = Math.round((totalFilledFields / totalFields) * 100);
    setCompletionScore(score);
  }, [watchedValues]);

  // Reset form when health profile loads
  useEffect(() => {
    if (healthProfile) {
      reset({
        dateOfBirth: healthProfile.dateOfBirth || '',
        gender: healthProfile.gender || '',
        height: healthProfile.height || '',
        weight: healthProfile.weight || '',
        bloodType: healthProfile.bloodType || '',
        allergies: healthProfile.allergies || [],
        medications: healthProfile.medications || [],
        medicalHistory: healthProfile.medicalHistory || [],
        emergencyContactName: healthProfile.emergencyContactName || '',
        emergencyContactPhone: healthProfile.emergencyContactPhone || '',
      });
    }
  }, [healthProfile, reset]);

  // Save health profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: HealthProfileForm) => {
      const profileData = {
        ...data,
        completionScore,
        profileStatus: completionScore >= 80 ? 'complete' : 'incomplete',
        lastReviewedAt: new Date().toISOString(),
        needsReviewAfter: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
      };

      if (healthProfile) {
        return apiRequest('PUT', `/api/health-profile/${healthProfile.id}`, profileData);
      } else {
        return apiRequest('POST', '/api/health-profile', profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-profile"] });
      toast({
        title: "Health Profile Updated",
        description: "Your health information has been saved successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save health profile",
        variant: "destructive",
      });
    }
  });

  const addArrayItem = (field: 'allergies' | 'medications' | 'medicalHistory', value: string) => {
    if (!value.trim()) return;
    const currentValues = watchedValues[field] || [];
    setValue(field, [...currentValues, value.trim()]);
  };

  const removeArrayItem = (field: 'allergies' | 'medications' | 'medicalHistory', index: number) => {
    const currentValues = watchedValues[field] || [];
    setValue(field, currentValues.filter((_, i) => i !== index));
  };

  const ArrayInput = ({ 
    field, 
    label, 
    placeholder 
  }: { 
    field: 'allergies' | 'medications' | 'medicalHistory';
    label: string;
    placeholder: string;
  }) => {
    const [inputValue, setInputValue] = useState('');
    const values = watchedValues[field] || [];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItem(field, inputValue);
                setInputValue('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              addArrayItem(field, inputValue);
              setInputValue('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {values.map((item, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {item}
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, index)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health Profile
          </SheetTitle>
          <SheetDescription>
            Complete your health profile to enable appointment bookings and provide better care.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Completion Progress */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm font-bold">{completionScore}%</span>
            </div>
            <Progress value={completionScore} className="h-2" />
            {completionScore < 80 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Complete at least 80% to enable appointment booking
              </div>
            )}
          </div>

          <form onSubmit={form.handleSubmit((data) => saveProfileMutation.mutate(data))} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register('dateOfBirth')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={watchedValues.gender} onValueChange={(value) => setValue('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    placeholder="e.g., 170 cm"
                    {...form.register('height')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    placeholder="e.g., 70 kg"
                    {...form.register('weight')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select value={watchedValues.bloodType} onValueChange={(value) => setValue('bloodType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Medical Information</h3>
              
              <ArrayInput
                field="allergies"
                label="Allergies"
                placeholder="Enter an allergy (e.g., Peanuts, Penicillin)"
              />
              
              <ArrayInput
                field="medications"
                label="Current Medications"
                placeholder="Enter a medication (e.g., Aspirin 100mg daily)"
              />
              
              <ArrayInput
                field="medicalHistory"
                label="Medical History"
                placeholder="Enter a condition (e.g., Hypertension, Diabetes)"
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Contact</h3>
              
              <div>
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Full name"
                  {...form.register('emergencyContactName')}
                />
              </div>
              
              <div>
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  placeholder="Phone number"
                  {...form.register('emergencyContactPhone')}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saveProfileMutation.isPending}
                className="flex-1"
              >
                {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}