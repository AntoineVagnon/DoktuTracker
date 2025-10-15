import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { 
  Shield, 
  FileText, 
  Users, 
  Clock, 
  Lock,
  Database,
  AlertCircle,
  Download,
  Eye,
  Archive,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface ProcessingRecord {
  id: string;
  userId: number;
  processingPurpose: string;
  legalBasis: string;
  dataCategories: {
    special?: string[];
    personal?: string[];
  };
  retentionPeriod: string;
  recipients: {
    internal?: string[];
    external?: string[];
  };
  securityMeasures: {
    technical?: string[];
    organizational?: string[];
  };
  dataSource?: string;
  transferMechanism?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DataSubjectRequest {
  id: string;
  userId: number;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  description: string;
  response?: string;
  completedAt?: string;
  createdAt: string;
}

export default function DataProcessingRecords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('records');
  const [selectedRecord, setSelectedRecord] = useState<ProcessingRecord | null>(null);

  // Fetch processing records
  const { data: records, isLoading: recordsLoading } = useQuery<ProcessingRecord[]>({
    queryKey: ['/api/gdpr/processing-records', user?.id],
    enabled: !!user?.id
  });

  // Fetch data subject requests
  const { data: requests, isLoading: requestsLoading } = useQuery<DataSubjectRequest[]>({
    queryKey: ['/api/gdpr/subject-requests', user?.id],
    enabled: !!user?.id
  });

  // Create data subject request
  const createRequestMutation = useMutation({
    mutationFn: async (request: Partial<DataSubjectRequest>) => {
      return apiRequest('POST', '/api/gdpr/subject-requests', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/subject-requests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/processing-records', user?.id] });
      toast({
        title: "Request Submitted",
        description: "Your data request has been submitted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Export data
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/gdpr/export');
      return response.json();
    },
    onSuccess: (data) => {
      // Convert to CSV format
      const csvContent = convertToCSV(data);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-data-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: "Your data has been exported in CSV format for easy reading."
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getLegalBasisLabel = (basis: string) => {
    const labels: Record<string, string> = {
      'article_6_1_a': 'Consent',
      'article_6_1_b': 'Contract',
      'article_6_1_c': 'Legal Obligation',
      'article_6_1_d': 'Vital Interests',
      'article_6_1_e': 'Public Task',
      'article_6_1_f': 'Legitimate Interests',
      'article_9_2_a': 'Explicit Consent (Special)',
      'article_9_2_h': 'Healthcare Provision'
    };
    return labels[basis] || basis;
  };

  // Convert export data to human-readable CSV format
  const convertToCSV = (data: any) => {
    const csvSections: string[] = [];
    
    // Header with export info
    csvSections.push('PERSONAL DATA EXPORT');
    csvSections.push(`Export Date,${new Date(data.exportDate).toLocaleString()}`);
    csvSections.push('');
    
    // Personal Information Section
    csvSections.push('=== PERSONAL INFORMATION ===');
    csvSections.push('Field,Value');
    csvSections.push(`User ID,${data.dataSubject.id || 'N/A'}`);
    csvSections.push(`Email,${data.dataSubject.email || 'N/A'}`);
    csvSections.push(`Name,"${((data.dataSubject.title || '') + ' ' + (data.dataSubject.firstName || '') + ' ' + (data.dataSubject.lastName || '')).trim()}"`);
    csvSections.push(`Role,${data.dataSubject.role || 'N/A'}`);
    csvSections.push(`Account Created,${data.dataSubject.createdAt ? new Date(data.dataSubject.createdAt).toLocaleString() : 'N/A'}`);
    csvSections.push('');
    
    // Consents Section
    csvSections.push('=== CONSENT RECORDS ===');
    if (data.consents && data.consents.length > 0) {
      csvSections.push('Consent Type,Status,Date Given,Legal Basis,Date Withdrawn');
      data.consents.forEach((consent: any) => {
        const dateGiven = consent.date ? new Date(consent.date).toLocaleString() : 'N/A';
        const dateWithdrawn = consent.withdrawnDate ? new Date(consent.withdrawnDate).toLocaleString() : 'Not Withdrawn';
        csvSections.push(`${consent.type},${consent.given ? 'Given' : 'Not Given'},${dateGiven},${consent.legalBasis || 'N/A'},${dateWithdrawn}`);
      });
    } else {
      csvSections.push('No consent records found');
    }
    csvSections.push('');
    
    // Appointments Section
    csvSections.push('=== APPOINTMENTS ===');
    if (data.appointments && data.appointments.length > 0) {
      csvSections.push('Appointment ID,Doctor ID,Date,Status,Price,Created At');
      data.appointments.forEach((appointment: any) => {
        const appointmentDate = appointment.date ? new Date(appointment.date).toLocaleString() : 'N/A';
        const createdAt = appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : 'N/A';
        csvSections.push(`${appointment.id},${appointment.doctorId},${appointmentDate},${appointment.status},${appointment.price ? '€' + appointment.price : 'N/A'},${createdAt}`);
      });
    } else {
      csvSections.push('No appointments found');
    }
    csvSections.push('');
    
    // Health Profile Section
    csvSections.push('=== HEALTH PROFILE ===');
    if (data.healthProfile && data.healthProfile.length > 0) {
      const profile = data.healthProfile[0]; // Usually one profile per user
      csvSections.push('Field,Value');
      csvSections.push(`Blood Type,${profile.bloodType || 'N/A'}`);
      csvSections.push(`Allergies,"${profile.allergies ? profile.allergies.join('; ') : 'None listed'}"`);
      csvSections.push(`Medications,"${profile.medications ? profile.medications.join('; ') : 'None listed'}"`);
      csvSections.push(`Medical History,"${profile.medicalHistory || 'None provided'}"`);
      csvSections.push(`Emergency Contact,${profile.emergencyContact || 'N/A'}`);
      csvSections.push(`Last Updated,${profile.lastUpdated ? new Date(profile.lastUpdated).toLocaleString() : 'N/A'}`);
    } else {
      csvSections.push('No health profile information found');
    }
    csvSections.push('');
    
    // Processing Activities Section
    csvSections.push('=== DATA PROCESSING ACTIVITIES ===');
    if (data.processingActivities && data.processingActivities.length > 0) {
      csvSections.push('Purpose,Legal Basis,Data Categories,Retention Period,Recipients,Created Date');
      data.processingActivities.forEach((activity: any) => {
        const categories = activity.categories ? JSON.stringify(activity.categories).replace(/"/g, "'") : 'N/A';
        const recipients = activity.recipients ? JSON.stringify(activity.recipients).replace(/"/g, "'") : 'N/A';
        const createdAt = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A';
        csvSections.push(`"${activity.purpose}",${getLegalBasisLabel(activity.legalBasis)},"${categories}",${activity.retention},"${recipients}",${createdAt}`);
      });
    } else {
      csvSections.push('No processing activities found');
    }
    csvSections.push('');
    
    // Data Requests Section
    csvSections.push('=== DATA REQUESTS ===');
    if (data.dataRequests && data.dataRequests.length > 0) {
      csvSections.push('Request Type,Status,Description,Response,Submitted Date,Completed Date');
      data.dataRequests.forEach((request: any) => {
        const submittedAt = request.submittedAt ? new Date(request.submittedAt).toLocaleString() : 'N/A';
        const completedAt = request.completedAt ? new Date(request.completedAt).toLocaleString() : 'Not Completed';
        csvSections.push(`${request.type},${request.status},"${request.description || 'N/A'}","${request.response || 'No response yet'}",${submittedAt},${completedAt}`);
      });
    } else {
      csvSections.push('No data requests found');
    }
    
    return csvSections.join('\n');
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'access': 'Access Request',
      'rectification': 'Rectification',
      'erasure': 'Right to Erasure',
      'portability': 'Data Portability',
      'restriction': 'Restriction of Processing',
      'objection': 'Objection to Processing'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      'pending': 'secondary',
      'in_progress': 'default',
      'completed': 'outline',
      'rejected': 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          {t('data_processing.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('data_processing.subtitle')}
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('data_processing.gdpr_notice')}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records">{t('data_processing.tabs.processing_records')}</TabsTrigger>
          <TabsTrigger value="requests">{t('data_processing.tabs.my_requests')}</TabsTrigger>
          <TabsTrigger value="rights">{t('data_processing.tabs.my_rights')}</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-6">
          {recordsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading processing records...
              </CardContent>
            </Card>
          ) : records && records.length > 0 ? (
            records.map((record) => (
              <Card key={record.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRecord(record)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{record.processingPurpose}</CardTitle>
                      <CardDescription>
                        Legal Basis: {getLegalBasisLabel(record.legalBasis)}
                      </CardDescription>
                    </div>
                    <Badge variant={record.isActive ? "default" : "secondary"}>
                      {record.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1">Data Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {record.dataCategories.special?.map((cat, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {record.dataCategories.personal?.map((cat, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Retention Period:</p>
                      <p className="text-muted-foreground">{record.retentionPeriod}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No processing records found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => exportDataMutation.mutate()}>
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
          </div>

          {requestsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading requests...
              </CardContent>
            </Card>
          ) : requests && requests.length > 0 ? (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {getRequestTypeLabel(request.requestType)}
                      </CardTitle>
                      <CardDescription>
                        Submitted: {format(new Date(request.createdAt), 'PPP')}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{request.description}</p>
                  {request.response && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Response:</p>
                      <p className="text-sm">{request.response}</p>
                      {request.completedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed: {format(new Date(request.completedAt), 'PPP')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No requests submitted yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rights" className="space-y-4 mt-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t('data_processing.rights.access.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('data_processing.rights.access.description')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => createRequestMutation.mutate({
                    requestType: 'access',
                    description: 'I request access to all my personal data you are processing.'
                  })}
                >
                  {t('data_processing.rights.access.button')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {t('data_processing.rights.rectification.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('data_processing.rights.rectification.description')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => createRequestMutation.mutate({
                    requestType: 'rectification',
                    description: 'I request rectification of my personal data.'
                  })}
                >
                  {t('data_processing.rights.rectification.button')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  {t('data_processing.rights.erasure.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('data_processing.rights.erasure.description')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => createRequestMutation.mutate({
                    requestType: 'erasure',
                    description: 'I request complete erasure of my personal data.'
                  })}
                >
                  {t('data_processing.rights.erasure.button')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Right to Data Portability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  You have the right to receive your personal data in a structured,
                  commonly used, and machine-readable format.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => exportDataMutation.mutate()}
                >
                  Download My Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setSelectedRecord(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Processing Record Details</CardTitle>
              <CardDescription>{selectedRecord.processingPurpose}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Legal Basis</h4>
                <p className="text-sm text-muted-foreground">
                  {getLegalBasisLabel(selectedRecord.legalBasis)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data Categories</h4>
                <div className="space-y-2">
                  {selectedRecord.dataCategories.special && (
                    <div>
                      <p className="text-sm font-medium">Special Categories:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedRecord.dataCategories.special.map((cat, i) => (
                          <Badge key={i} variant="destructive">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedRecord.dataCategories.personal && (
                    <div>
                      <p className="text-sm font-medium">Personal Data:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedRecord.dataCategories.personal.map((cat, i) => (
                          <Badge key={i} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recipients</h4>
                <div className="space-y-2">
                  {selectedRecord.recipients.internal && (
                    <div>
                      <p className="text-sm font-medium">Internal:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRecord.recipients.internal.join(', ')}
                      </p>
                    </div>
                  )}
                  {selectedRecord.recipients.external && (
                    <div>
                      <p className="text-sm font-medium">External:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRecord.recipients.external.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Security Measures</h4>
                <div className="space-y-2">
                  {selectedRecord.securityMeasures.technical && (
                    <div>
                      <p className="text-sm font-medium">Technical:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRecord.securityMeasures.technical.join(', ')}
                      </p>
                    </div>
                  )}
                  {selectedRecord.securityMeasures.organizational && (
                    <div>
                      <p className="text-sm font-medium">Organizational:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRecord.securityMeasures.organizational.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Retention Period</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.retentionPeriod}
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}