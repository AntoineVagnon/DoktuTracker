import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  GraduationCap, 
  Shield, 
  FileCheck, 
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Qualification {
  id: string;
  qualificationType: string;
  issuingAuthority: string;
  qualificationNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: string;
  verificationDate: string | null;
  verificationMethod: string | null;
  euRecognitionStatus: string | null;
  homeMemberState: string | null;
  hostMemberStates: string[] | null;
  specialization: string | null;
  institutionName: string | null;
}

interface Insurance {
  id: string;
  insuranceProvider: string;
  policyNumber: string;
  coverageAmount: string;
  coverageCurrency: string;
  coverageTerritory: string;
  effectiveDate: string;
  expiryDate: string;
  coverageType: string | null;
  verificationStatus: string;
  meetsEuRequirements: boolean;
}

interface CrossBorderDeclaration {
  id: string;
  declarationType: string;
  homeMemberState: string;
  hostMemberState: string;
  declarationDate: string;
  validityStartDate: string;
  validityEndDate: string | null;
  status: string;
  languageCompetencyVerified: boolean;
}

export default function DoctorQualifications() {
  const { doctorId } = useParams();
  const [activeTab, setActiveTab] = useState('qualifications');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formType, setFormType] = useState<'qualification' | 'insurance' | 'crossborder'>('qualification');

  // Fetch verification status
  const { data: verificationStatus, isLoading } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/verification-status`],
    enabled: !!doctorId
  });

  // Fetch qualifications
  const { data: qualifications = [] } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/qualifications`],
    enabled: !!doctorId
  });

  // Fetch insurance
  const { data: insurance = [] } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/insurance`],
    enabled: !!doctorId
  });

  // Fetch cross-border declarations
  const { data: crossBorder = [] } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/cross-border`],
    enabled: !!doctorId
  });

  // Fetch EU Professional Card
  const { data: epcData } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/epc`],
    enabled: !!doctorId
  });

  // Add qualification mutation
  const addQualificationMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/doctors/${doctorId}/qualifications`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/qualifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/verification-status`] });
      setShowAddDialog(false);
    }
  });

  // Add insurance mutation
  const addInsuranceMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/doctors/${doctorId}/insurance`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/insurance`] });
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/verification-status`] });
      setShowAddDialog(false);
    }
  });

  // Verify qualification mutation
  const verifyQualificationMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => 
      apiRequest(`/api/qualifications/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/qualifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/verification-status`] });
    }
  });

  // EU verification mutation
  const euVerifyMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/qualifications/${id}/eu-verify`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/qualifications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/verification-status`] });
    }
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string }> = {
      'pending': { variant: 'secondary', icon: Clock, label: 'Pending' },
      'verified': { variant: 'default', icon: CheckCircle2, label: 'Verified' },
      'expired': { variant: 'destructive', icon: XCircle, label: 'Expired' },
      'revoked': { variant: 'destructive', icon: XCircle, label: 'Revoked' },
      'approved': { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      'rejected': { variant: 'destructive', icon: XCircle, label: 'Rejected' }
    };
    
    const badge = badges[status] || { variant: 'outline', icon: AlertCircle, label: status };
    const Icon = badge.icon;
    
    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {badge.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading verification data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Professional Qualification Verification</h1>
        <p className="text-muted-foreground mt-2">
          Manage doctor qualifications, insurance, and cross-border practice declarations
        </p>
      </div>

      {/* Verification Status Overview */}
      {verificationStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Verification Status</span>
              {verificationStatus.overallStatus === 'verified' ? (
                <Badge variant="default" className="text-lg px-3 py-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Fully Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  <Clock className="mr-2 h-4 w-4" />
                  Verification Pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Doctor: {verificationStatus.doctor.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Qualifications</span>
                <span className="text-2xl font-bold">
                  {verificationStatus.qualifications.verified}/{verificationStatus.qualifications.total}
                </span>
                <span className="text-xs text-muted-foreground">verified</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Insurance</span>
                <span className="text-2xl font-bold">
                  {verificationStatus.insurance.hasValidInsurance ? '✅' : '❌'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {verificationStatus.insurance.verified ? 'Verified' : 'Not verified'}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">EU Card</span>
                <span className="text-2xl font-bold">
                  {verificationStatus.euProfessionalCard.hasCard ? '✅' : '❌'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {verificationStatus.euProfessionalCard.cardNumber || 'No card'}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Cross-Border</span>
                <span className="text-2xl font-bold">
                  {verificationStatus.crossBorderPractice.activeDeclarations}
                </span>
                <span className="text-xs text-muted-foreground">
                  active declarations
                </span>
              </div>
            </div>
            
            {verificationStatus.canPractice ? (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Ready to Practice</AlertTitle>
                <AlertDescription>
                  This doctor has all required verifications and can practice on the platform.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mt-4 border-orange-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Required</AlertTitle>
                <AlertDescription>
                  Additional verifications are needed before this doctor can practice on the platform.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="qualifications">
            <GraduationCap className="mr-2 h-4 w-4" />
            Qualifications
          </TabsTrigger>
          <TabsTrigger value="insurance">
            <Shield className="mr-2 h-4 w-4" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="crossborder">
            <Globe className="mr-2 h-4 w-4" />
            Cross-Border
          </TabsTrigger>
          <TabsTrigger value="epc">
            <CreditCard className="mr-2 h-4 w-4" />
            EU Card
          </TabsTrigger>
        </TabsList>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Medical Qualifications</CardTitle>
                  <CardDescription>
                    Degrees, certifications, and professional licenses
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog && formType === 'qualification'} onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (open) setFormType('qualification');
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Add Qualification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Qualification</DialogTitle>
                      <DialogDescription>
                        Enter the details of the medical qualification
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      addQualificationMutation.mutate({
                        qualificationType: formData.get('qualificationType'),
                        issuingAuthority: formData.get('issuingAuthority'),
                        qualificationNumber: formData.get('qualificationNumber'),
                        issueDate: formData.get('issueDate'),
                        expiryDate: formData.get('expiryDate'),
                        specialization: formData.get('specialization'),
                        institutionName: formData.get('institutionName'),
                        qualificationCountry: formData.get('qualificationCountry')
                      });
                    }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="qualificationType">Type</Label>
                          <Select name="qualificationType" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="medical_degree">Medical Degree</SelectItem>
                              <SelectItem value="specialty_certification">Specialty Certification</SelectItem>
                              <SelectItem value="license">Professional License</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="qualificationNumber">Number</Label>
                          <Input
                            id="qualificationNumber"
                            name="qualificationNumber"
                            placeholder="e.g., MD-123456"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                        <Input
                          id="issuingAuthority"
                          name="issuingAuthority"
                          placeholder="e.g., French Medical Council"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="institutionName">Institution</Label>
                          <Input
                            id="institutionName"
                            name="institutionName"
                            placeholder="e.g., Sorbonne University"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialization">Specialization</Label>
                          <Input
                            id="specialization"
                            name="specialization"
                            placeholder="e.g., Cardiology"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="qualificationCountry">Country</Label>
                          <Input
                            id="qualificationCountry"
                            name="qualificationCountry"
                            placeholder="e.g., FR"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issueDate">Issue Date</Label>
                          <Input
                            id="issueDate"
                            name="issueDate"
                            type="date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            name="expiryDate"
                            type="date"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addQualificationMutation.isPending}>
                          Add Qualification
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {qualifications.length > 0 ? (
                <div className="space-y-4">
                  {qualifications.map((qual: Qualification) => (
                    <div key={qual.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-lg">
                              {qual.qualificationType.replace('_', ' ').toUpperCase()}
                            </strong>
                            {getStatusBadge(qual.verificationStatus)}
                          </div>
                          <div className="text-sm space-y-1">
                            <div><strong>Authority:</strong> {qual.issuingAuthority}</div>
                            <div><strong>Number:</strong> {qual.qualificationNumber}</div>
                            {qual.specialization && (
                              <div><strong>Specialization:</strong> {qual.specialization}</div>
                            )}
                            {qual.institutionName && (
                              <div><strong>Institution:</strong> {qual.institutionName}</div>
                            )}
                            {qual.issueDate && (
                              <div><strong>Issued:</strong> {format(new Date(qual.issueDate), 'MMM dd, yyyy')}</div>
                            )}
                            {qual.expiryDate && (
                              <div><strong>Expires:</strong> {format(new Date(qual.expiryDate), 'MMM dd, yyyy')}</div>
                            )}
                          </div>
                          {qual.euRecognitionStatus && (
                            <div className="flex items-center gap-2 mt-2">
                              <Globe className="h-4 w-4" />
                              <span className="text-sm">EU Recognition: {qual.euRecognitionStatus}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {qual.verificationStatus === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => verifyQualificationMutation.mutate({
                                  id: qual.id,
                                  status: 'verified',
                                  verificationMethod: 'Manual Review'
                                })}
                                disabled={verifyQualificationMutation.isPending}
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                Verify Manually
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => euVerifyMutation.mutate(qual.id)}
                                disabled={euVerifyMutation.isPending}
                              >
                                <Globe className="mr-2 h-4 w-4" />
                                EU Database Check
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No qualifications registered</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Professional Insurance</CardTitle>
                  <CardDescription>
                    Medical malpractice and liability coverage
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog && formType === 'insurance'} onOpenChange={(open) => {
                  setShowAddDialog(open);
                  if (open) setFormType('insurance');
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Shield className="mr-2 h-4 w-4" />
                      Add Insurance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Insurance Policy</DialogTitle>
                      <DialogDescription>
                        Enter the professional insurance details
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      addInsuranceMutation.mutate({
                        insuranceProvider: formData.get('insuranceProvider'),
                        policyNumber: formData.get('policyNumber'),
                        coverageAmount: formData.get('coverageAmount'),
                        coverageCurrency: 'EUR',
                        coverageTerritory: formData.get('coverageTerritory'),
                        coverageType: formData.get('coverageType'),
                        effectiveDate: formData.get('effectiveDate'),
                        expiryDate: formData.get('expiryDate')
                      });
                    }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                          <Input
                            id="insuranceProvider"
                            name="insuranceProvider"
                            placeholder="e.g., AXA Medical Insurance"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="policyNumber">Policy Number</Label>
                          <Input
                            id="policyNumber"
                            name="policyNumber"
                            placeholder="e.g., POL-123456"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="coverageAmount">Coverage Amount (EUR)</Label>
                          <Input
                            id="coverageAmount"
                            name="coverageAmount"
                            type="number"
                            placeholder="e.g., 5000000"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="coverageType">Coverage Type</Label>
                          <Select name="coverageType" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="medical_malpractice">Medical Malpractice</SelectItem>
                              <SelectItem value="professional_liability">Professional Liability</SelectItem>
                              <SelectItem value="general_liability">General Liability</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coverageTerritory">Coverage Territory</Label>
                        <Input
                          id="coverageTerritory"
                          name="coverageTerritory"
                          placeholder="e.g., EU, France, Germany"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="effectiveDate">Effective Date</Label>
                          <Input
                            id="effectiveDate"
                            name="effectiveDate"
                            type="date"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            name="expiryDate"
                            type="date"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addInsuranceMutation.isPending}>
                          Add Insurance
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {insurance.length > 0 ? (
                <div className="space-y-4">
                  {insurance.map((ins: Insurance) => (
                    <div key={ins.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-lg">{ins.insuranceProvider}</strong>
                            {getStatusBadge(ins.verificationStatus)}
                            {ins.meetsEuRequirements && (
                              <Badge variant="default">EU Compliant</Badge>
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <div><strong>Policy Number:</strong> {ins.policyNumber}</div>
                            <div><strong>Coverage:</strong> {ins.coverageCurrency} {parseFloat(ins.coverageAmount).toLocaleString()}</div>
                            <div><strong>Territory:</strong> {ins.coverageTerritory}</div>
                            <div><strong>Type:</strong> {ins.coverageType?.replace('_', ' ')}</div>
                            <div><strong>Valid:</strong> {format(new Date(ins.effectiveDate), 'MMM dd, yyyy')} - {format(new Date(ins.expiryDate), 'MMM dd, yyyy')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No insurance policies registered</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-Border Tab */}
        <TabsContent value="crossborder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Border Practice Declarations</CardTitle>
              <CardDescription>
                Temporary service provision and permanent establishment declarations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crossBorder.length > 0 ? (
                <div className="space-y-4">
                  {crossBorder.map((declaration: CrossBorderDeclaration) => (
                    <div key={declaration.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-lg">
                              {declaration.declarationType === 'temporary_provision' ? 'Temporary Service' : 'Permanent Establishment'}
                            </strong>
                            {getStatusBadge(declaration.status)}
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{declaration.homeMemberState} → {declaration.hostMemberState}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(declaration.validityStartDate), 'MMM dd, yyyy')}
                                {declaration.validityEndDate && ` - ${format(new Date(declaration.validityEndDate), 'MMM dd, yyyy')}`}
                              </span>
                            </div>
                            {declaration.languageCompetencyVerified && (
                              <Badge variant="outline">Language Verified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No cross-border declarations</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EU Professional Card Tab */}
        <TabsContent value="epc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EU Professional Card</CardTitle>
              <CardDescription>
                European Professional Card for cross-border practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {epcData?.hasCard ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="text-xl font-semibold">European Professional Card</h3>
                            <p className="text-muted-foreground">Card Number: {epcData.card.epcNumber}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Issued:</strong> {epcData.card.issueDate && format(new Date(epcData.card.issueDate), 'MMM dd, yyyy')}
                          </div>
                          <div>
                            <strong>Expires:</strong> {epcData.card.expiryDate && format(new Date(epcData.card.expiryDate), 'MMM dd, yyyy')}
                          </div>
                          <div>
                            <strong>Issuing Country:</strong> {epcData.card.issuingCountry}
                          </div>
                          <div>
                            <strong>Status:</strong> {getStatusBadge(epcData.card.verificationStatus)}
                          </div>
                        </div>
                        {epcData.card.recognizedInCountries && (
                          <div>
                            <strong className="text-sm">Recognized in:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {epcData.card.recognizedInCountries.map((country: string) => (
                                <Badge key={country} variant="outline">{country}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No EU Professional Card</AlertTitle>
                  <AlertDescription>
                    This doctor does not have an EU Professional Card registered. 
                    An EPC facilitates temporary and permanent professional mobility across EU member states.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}