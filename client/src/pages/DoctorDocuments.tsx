import { useQuery } from '@tanstack/react-query';
import { DoctorDocumentUpload } from '@/components/doctor/DoctorDocumentUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DoctorDocument {
  id: string;
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

interface DocumentCompleteness {
  complete: boolean;
  missing: string[];
  pending: string[];
  rejected: string[];
}

export default function DoctorDocuments() {
  // Fetch all documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['doctor-documents'],
    queryFn: async () => {
      const response = await apiRequest<{ documents: DoctorDocument[] }>('/api/doctor-documents');
      return response.documents;
    }
  });

  // Fetch completeness status
  const { data: completeness } = useQuery({
    queryKey: ['doctor-documents-completeness'],
    queryFn: async () => {
      // TODO: Get actual doctor ID from auth context
      const response = await apiRequest<DocumentCompleteness>('/api/doctor-documents/completeness');
      return response;
    },
    enabled: !!documents
  });

  // Find existing documents by type
  const getExistingDocument = (type: string) => {
    return documents?.find(doc => doc.documentType === type);
  };

  const handleUploadSuccess = () => {
    // Refetch handled by React Query cache invalidation
  };

  if (documentsLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const requiredDocs = ['approbation', 'facharzturkunde'];
  const allRequiredUploaded = requiredDocs.every(type =>
    documents?.some(doc => doc.documentType === type)
  );
  const allRequiredVerified = requiredDocs.every(type =>
    documents?.some(doc => doc.documentType === type && doc.verificationStatus === 'verified')
  );
  const hasRejected = documents?.some(doc => doc.verificationStatus === 'rejected');

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Credential Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your medical credential documents for verification
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation Status</CardTitle>
          <CardDescription>
            Complete your profile by uploading all required documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allRequiredUploaded && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Please upload all required documents (Approbationsurkunde and Facharzturkunde) to activate your account.
                Your profile will not be visible to patients until all documents are verified.
              </AlertDescription>
            </Alert>
          )}

          {allRequiredUploaded && !allRequiredVerified && !hasRejected && (
            <Alert className="border-blue-500 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Under Review</AlertTitle>
              <AlertDescription className="text-blue-800">
                Your documents are pending verification by our admin team. You will be notified via email once the review is complete (typically within 2-3 business days).
              </AlertDescription>
            </Alert>
          )}

          {hasRejected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Document Rejected</AlertTitle>
              <AlertDescription>
                One or more of your documents have been rejected. Please review the rejection reasons below and upload corrected documents.
              </AlertDescription>
            </Alert>
          )}

          {allRequiredVerified && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Verified</AlertTitle>
              <AlertDescription className="text-green-800">
                All required documents have been verified. Your profile is now visible to patients and you can start accepting appointments.
              </AlertDescription>
            </Alert>
          )}

          {/* Document Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Documents</p>
                <p className="text-2xl font-bold">{documents?.length || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">Verified</p>
                <p className="text-2xl font-bold">
                  {documents?.filter(d => d.verificationStatus === 'verified').length || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold">
                  {documents?.filter(d => d.verificationStatus === 'pending').length || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Sections */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Required Documents</h2>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <DoctorDocumentUpload
              documentType="approbation"
              title="Approbationsurkunde"
              description="Medical license certificate (mandatory for all doctors)"
              required
              existingDocument={getExistingDocument('approbation')}
              onUploadSuccess={handleUploadSuccess}
            />

            <DoctorDocumentUpload
              documentType="facharzturkunde"
              title="Facharzturkunde"
              description="Specialist certification (mandatory to prove specialty qualification)"
              required
              existingDocument={getExistingDocument('facharzturkunde')}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Optional Documents</h2>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <DoctorDocumentUpload
              documentType="zusatzbezeichnung"
              title="Zusatzbezeichnung"
              description="Additional qualifications (optional, you can upload multiple)"
              existingDocument={getExistingDocument('zusatzbezeichnung')}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Document Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Accepted File Formats</h3>
            <div className="flex gap-2">
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">JPG</Badge>
              <Badge variant="outline">PNG</Badge>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">File Size Limit</h3>
            <p className="text-sm text-muted-foreground">Maximum 10MB per document</p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Document Quality</h3>
            <p className="text-sm text-muted-foreground">
              Please ensure your documents are clear, readable, and show all relevant information including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Full name matching your account</li>
              <li>Issue date and expiry date (if applicable)</li>
              <li>Issuing authority</li>
              <li>Document number/reference</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Verification Process</h3>
            <p className="text-sm text-muted-foreground">
              Our admin team will review your documents within 2-3 business days. You will receive an email notification once verification is complete. If any documents are rejected, you will be notified with specific reasons and can upload corrected versions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
