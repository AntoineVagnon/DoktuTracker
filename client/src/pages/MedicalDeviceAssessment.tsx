import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Shield, 
  Activity,
  Brain,
  Calculator,
  Eye,
  Pill
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Assessment {
  id: string;
  assessmentDate: string;
  assessmentVersion: string;
  assessmentType: string;
  softwareVersion: string;
  isSoftware: boolean;
  isAccessory: boolean;
  processesData: boolean;
  benefitIndividualPatients: boolean;
  medicalDeviceClass: string | null;
  riskLevel: string | null;
  assessmentRationale: string | null;
  ceMarkingRequired: boolean;
  notifiedBodyRequired: boolean;
  complianceStatus: string;
}

export default function MedicalDeviceAssessment() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [formData, setFormData] = useState({
    isSoftware: true,
    isAccessory: false,
    processesData: false,
    benefitIndividualPatients: false,
    diagnosticFeatures: [] as string[],
    treatmentFeatures: [] as string[],
    monitoringFeatures: [] as string[],
    calculationFeatures: [] as string[]
  });

  // Fetch current assessment
  const { data: currentAssessment, isLoading } = useQuery({
    queryKey: ['/api/mdr/current'],
    enabled: true
  });

  // Fetch all assessments
  const { data: assessments } = useQuery({
    queryKey: ['/api/mdr/assessments'],
    enabled: true
  });

  // Evaluate MDR classification
  const evaluateMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest('/api/mdr/evaluate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setIsEvaluating(false);
    }
  });

  // Create new assessment
  const createAssessmentMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('/api/mdr/assessments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mdr/assessments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mdr/current'] });
    }
  });

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    await evaluateMutation.mutateAsync(formData);
  };

  const handleSaveAssessment = async () => {
    if (!evaluateMutation.data) return;
    
    await createAssessmentMutation.mutateAsync({
      assessmentVersion: '1.0',
      assessmentType: 'MDCG 2019-11 Decision Tree',
      softwareVersion: '2.0.0',
      isSoftware: formData.isSoftware,
      isAccessory: formData.isAccessory,
      processesData: formData.processesData,
      benefitIndividualPatients: formData.benefitIndividualPatients,
      medicalDeviceClass: evaluateMutation.data.classification,
      riskLevel: evaluateMutation.data.riskLevel,
      assessmentRationale: evaluateMutation.data.rationale,
      ceMarkingRequired: evaluateMutation.data.ceMarkingRequired,
      notifiedBodyRequired: evaluateMutation.data.notifiedBodyRequired,
      diagnosticFeatures: formData.diagnosticFeatures,
      treatmentFeatures: formData.treatmentFeatures,
      monitoringFeatures: formData.monitoringFeatures,
      calculationFeatures: formData.calculationFeatures,
      complianceStatus: evaluateMutation.data.classification === 'not_md' ? 'compliant' : 'assessment_pending'
    });
  };

  const getClassificationBadge = (classification: string | null) => {
    if (!classification) return null;
    
    const badges: Record<string, { variant: any; label: string }> = {
      'not_md': { variant: 'default', label: 'Not a Medical Device' },
      'class_i': { variant: 'secondary', label: 'Class I MD' },
      'class_iia': { variant: 'destructive', label: 'Class IIa MD' },
      'class_iib': { variant: 'destructive', label: 'Class IIb MD' },
      'class_iii': { variant: 'destructive', label: 'Class III MD' }
    };
    
    const badge = badges[classification] || { variant: 'outline', label: classification };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Medical Device Compliance Assessment</h1>
        <p className="text-muted-foreground mt-2">
          Evaluate Doktu platform against MDR 2017/745 requirements
        </p>
      </div>

      {/* Current Status */}
      {currentAssessment?.hasAssessment && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Current Assessment Status</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <div>Classification: {getClassificationBadge(currentAssessment.assessment?.medicalDeviceClass)}</div>
              <div>CE Marking Required: {currentAssessment.requiresCeMark ? '✅ Yes' : '❌ No'}</div>
              <div>Notified Body Required: {currentAssessment.requiresNotifiedBody ? '✅ Yes' : '❌ No'}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="evaluate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evaluate">New Assessment</TabsTrigger>
          <TabsTrigger value="history">Assessment History</TabsTrigger>
          <TabsTrigger value="requirements">Compliance Requirements</TabsTrigger>
        </TabsList>

        {/* New Assessment Tab */}
        <TabsContent value="evaluate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MDCG 2019-11 Decision Tree Evaluation</CardTitle>
              <CardDescription>
                Answer the following questions to determine medical device classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question 1: Is it software? */}
              <div className="space-y-3">
                <Label>1. Is the Doktu platform software?</Label>
                <RadioGroup
                  value={formData.isSoftware ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData({ ...formData, isSoftware: value === 'yes' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="software-yes" />
                    <Label htmlFor="software-yes">Yes - It processes input data and creates output data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="software-no" />
                    <Label htmlFor="software-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 2: Is it an accessory? */}
              <div className="space-y-3">
                <Label>2. Is the software an accessory to a medical device?</Label>
                <RadioGroup
                  value={formData.isAccessory ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData({ ...formData, isAccessory: value === 'yes' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="accessory-yes" />
                    <Label htmlFor="accessory-yes">Yes - Drives or influences use of hardware medical devices</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="accessory-no" />
                    <Label htmlFor="accessory-no">No - Operates independently</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 3: Does it process data? */}
              <div className="space-y-3">
                <Label>3. Does the software process health data beyond storage/communication?</Label>
                <RadioGroup
                  value={formData.processesData ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData({ ...formData, processesData: value === 'yes' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="process-yes" />
                    <Label htmlFor="process-yes">Yes - Analyzes, interprets, or modifies health data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="process-no" />
                    <Label htmlFor="process-no">No - Only stores or transmits data</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 4: Individual patient benefit? */}
              <div className="space-y-3">
                <Label>4. Is the data processing for the benefit of individual patients?</Label>
                <RadioGroup
                  value={formData.benefitIndividualPatients ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData({ ...formData, benefitIndividualPatients: value === 'yes' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="benefit-yes" />
                    <Label htmlFor="benefit-yes">Yes - Directly benefits individual patient care</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="benefit-no" />
                    <Label htmlFor="benefit-no">No - General population or research purposes only</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Medical Functions */}
              <div className="space-y-4">
                <Label>5. Which medical functions does the platform perform?</Label>
                
                {/* Diagnostic Features */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4" />
                    <Label>Diagnostic Features</Label>
                  </div>
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="diag-1"
                        onCheckedChange={(checked) => {
                          const features = [...formData.diagnosticFeatures];
                          if (checked) features.push('symptom_analysis');
                          else features.splice(features.indexOf('symptom_analysis'), 1);
                          setFormData({ ...formData, diagnosticFeatures: features });
                        }}
                      />
                      <Label htmlFor="diag-1">Symptom analysis or triage</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="diag-2"
                        onCheckedChange={(checked) => {
                          const features = [...formData.diagnosticFeatures];
                          if (checked) features.push('diagnostic_algorithms');
                          else features.splice(features.indexOf('diagnostic_algorithms'), 1);
                          setFormData({ ...formData, diagnosticFeatures: features });
                        }}
                      />
                      <Label htmlFor="diag-2">Diagnostic algorithms or decision support</Label>
                    </div>
                  </div>
                </div>

                {/* Treatment Features */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Pill className="h-4 w-4" />
                    <Label>Treatment Features</Label>
                  </div>
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="treat-1"
                        onCheckedChange={(checked) => {
                          const features = [...formData.treatmentFeatures];
                          if (checked) features.push('treatment_recommendations');
                          else features.splice(features.indexOf('treatment_recommendations'), 1);
                          setFormData({ ...formData, treatmentFeatures: features });
                        }}
                      />
                      <Label htmlFor="treat-1">Treatment recommendations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="treat-2"
                        onCheckedChange={(checked) => {
                          const features = [...formData.treatmentFeatures];
                          if (checked) features.push('dosage_calculations');
                          else features.splice(features.indexOf('dosage_calculations'), 1);
                          setFormData({ ...formData, treatmentFeatures: features });
                        }}
                      />
                      <Label htmlFor="treat-2">Medication dosage calculations</Label>
                    </div>
                  </div>
                </div>

                {/* Monitoring Features */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <Label>Monitoring Features</Label>
                  </div>
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="monitor-1"
                        onCheckedChange={(checked) => {
                          const features = [...formData.monitoringFeatures];
                          if (checked) features.push('vital_signs_monitoring');
                          else features.splice(features.indexOf('vital_signs_monitoring'), 1);
                          setFormData({ ...formData, monitoringFeatures: features });
                        }}
                      />
                      <Label htmlFor="monitor-1">Vital signs monitoring</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="monitor-2"
                        onCheckedChange={(checked) => {
                          const features = [...formData.monitoringFeatures];
                          if (checked) features.push('alerts_warnings');
                          else features.splice(features.indexOf('alerts_warnings'), 1);
                          setFormData({ ...formData, monitoringFeatures: features });
                        }}
                      />
                      <Label htmlFor="monitor-2">Medical alerts or warnings</Label>
                    </div>
                  </div>
                </div>

                {/* Calculation Features */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <Label>Calculation Features</Label>
                  </div>
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="calc-1"
                        onCheckedChange={(checked) => {
                          const features = [...formData.calculationFeatures];
                          if (checked) features.push('risk_scores');
                          else features.splice(features.indexOf('risk_scores'), 1);
                          setFormData({ ...formData, calculationFeatures: features });
                        }}
                      />
                      <Label htmlFor="calc-1">Risk score calculations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="calc-2"
                        onCheckedChange={(checked) => {
                          const features = [...formData.calculationFeatures];
                          if (checked) features.push('clinical_indicators');
                          else features.splice(features.indexOf('clinical_indicators'), 1);
                          setFormData({ ...formData, calculationFeatures: features });
                        }}
                      />
                      <Label htmlFor="calc-2">Clinical indicator calculations</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleEvaluate} disabled={isEvaluating}>
                  <Shield className="mr-2 h-4 w-4" />
                  Evaluate Classification
                </Button>
              </div>

              {/* Evaluation Results */}
              {evaluateMutation.data && (
                <Alert className={evaluateMutation.data.classification === 'not_md' ? '' : 'border-orange-200'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Classification Result</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <div>
                      <strong>Classification:</strong> {getClassificationBadge(evaluateMutation.data.classification)}
                    </div>
                    <div>
                      <strong>Risk Level:</strong> {evaluateMutation.data.riskLevel}
                    </div>
                    <div>
                      <strong>CE Marking Required:</strong> {evaluateMutation.data.ceMarkingRequired ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                      <strong>Notified Body Required:</strong> {evaluateMutation.data.notifiedBodyRequired ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                      <strong>Rationale:</strong> {evaluateMutation.data.rationale}
                    </div>
                    <div>
                      <strong>Recommendation:</strong> {evaluateMutation.data.recommendation}
                    </div>
                    <Button 
                      onClick={handleSaveAssessment} 
                      className="mt-4"
                      disabled={createAssessmentMutation.isPending}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Save Assessment
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
              <CardDescription>
                Previous MDR compliance assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessments?.length > 0 ? (
                <div className="space-y-4">
                  {assessments.map((assessment: Assessment) => (
                    <div key={assessment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <strong>Date:</strong> {new Date(assessment.assessmentDate).toLocaleDateString()}
                            {getClassificationBadge(assessment.medicalDeviceClass)}
                          </div>
                          <div><strong>Version:</strong> {assessment.assessmentVersion}</div>
                          <div><strong>Status:</strong> {assessment.complianceStatus}</div>
                          {assessment.assessmentRationale && (
                            <div className="text-sm text-muted-foreground mt-2">
                              {assessment.assessmentRationale}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {assessment.ceMarkingRequired && (
                            <Badge variant="outline">CE Mark Required</Badge>
                          )}
                          {assessment.notifiedBodyRequired && (
                            <Badge variant="outline">Notified Body Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No assessments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MDR Compliance Requirements</CardTitle>
              <CardDescription>
                Requirements based on current classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentAssessment?.hasAssessment ? (
                <div className="space-y-6">
                  {currentAssessment.assessment?.medicalDeviceClass === 'not_md' ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>No MDR Requirements</AlertTitle>
                      <AlertDescription>
                        The platform is not classified as a medical device and therefore not subject to MDR requirements.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-semibold">General Requirements</h3>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                            <span>Technical documentation per MDR Annex II</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                            <span>Risk management per ISO 14971</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                            <span>Clinical evaluation per MDR Article 61</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                            <span>Post-market surveillance plan</span>
                          </li>
                        </ul>
                      </div>

                      {currentAssessment.requiresCeMark && (
                        <div className="space-y-3">
                          <h3 className="font-semibold">CE Marking Requirements</h3>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                              <span>Declaration of Conformity</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                              <span>CE marking affixed to product</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                              <span>Registration in EUDAMED database</span>
                            </li>
                          </ul>
                        </div>
                      )}

                      {currentAssessment.requiresNotifiedBody && (
                        <div className="space-y-3">
                          <h3 className="font-semibold">Notified Body Requirements</h3>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 text-red-500" />
                              <span>Notified Body assessment required</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 text-red-500" />
                              <span>Quality Management System audit</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 text-red-500" />
                              <span>Technical documentation review</span>
                            </li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Assessment Available</AlertTitle>
                  <AlertDescription>
                    Please complete an assessment to view compliance requirements.
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