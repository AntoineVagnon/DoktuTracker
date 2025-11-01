import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Clock,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface DoctorDocument {
  id: string;
  doctorId: number;
  doctorName?: string;
  doctorEmail?: string;
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: number;
  verifiedAt?: string;
  rejectionReason?: string;
}

export function DocumentVerification() {
  const [selectedDocument, setSelectedDocument] = useState<DoctorDocument | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all documents
  const { data: allDocuments, isLoading } = useQuery({
    queryKey: ['admin-doctor-documents'],
    queryFn: async () => {
      // TODO: Create admin endpoint to list all documents with doctor info
      const response = await apiRequest<{ documents: DoctorDocument[] }>('/api/admin/doctor-documents');
      return response.documents;
    }
  });

  const pendingDocuments = allDocuments?.filter(d => d.verificationStatus === 'pending') || [];
  const verifiedDocuments = allDocuments?.filter(d => d.verificationStatus === 'verified') || [];
  const rejectedDocuments = allDocuments?.filter(d => d.verificationStatus === 'rejected') || [];

  // Verify document mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ documentId, verified, reason }: { documentId: string; verified: boolean; reason?: string }) => {
      return await apiRequest(`/api/doctor-documents/${documentId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified, rejectionReason: reason })
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.verified ? 'Document approved' : 'Document rejected',
        description: variables.verified
          ? 'The document has been verified successfully.'
          : 'The document has been rejected with the provided reason.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-doctor-documents'] });
      setSelectedDocument(null);
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Verification failed',
        description: error.message || 'Failed to update document status',
        variant: 'destructive',
      });
    }
  });

  const handleViewDocument = async (document: DoctorDocument) => {
    setSelectedDocument(document);
    setViewDialogOpen(true);

    // Fetch signed URL
    try {
      const response = await apiRequest<{ url: string; expiresIn: number }>(
        `/api/doctor-documents/${document.id}/download`
      );
      setDocumentUrl(response.url);
    } catch (error: any) {
      toast({
        title: 'Failed to load document',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleApprove = (document: DoctorDocument) => {
    verifyMutation.mutate({
      documentId: document.id,
      verified: true
    });
  };

  const handleReject = () => {
    if (!selectedDocument) return;
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejecting this document',
        variant: 'destructive',
      });
      return;
    }

    verifyMutation.mutate({
      documentId: selectedDocument.id,
      verified: false,
      reason: rejectionReason
    });
  };

  const openRejectDialog = (document: DoctorDocument) => {
    setSelectedDocument(document);
    setRejectDialogOpen(true);
    setRejectionReason('');
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getDocumentTypeName = (type: string) => {
    const names: Record<string, string> = {
      approbation: 'Approbationsurkunde',
      facharzturkunde: 'Facharzturkunde',
      zusatzbezeichnung: 'Zusatzbezeichnung'
    };
    return names[type] || type;
  };

  const DocumentCard = ({ document }: { document: DoctorDocument }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{getDocumentTypeName(document.documentType)}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <User className="w-3 h-3" />
              {document.doctorName || `Doctor ID: ${document.doctorId}`}
              {document.doctorEmail && ` (${document.doctorEmail})`}
            </CardDescription>
          </div>
          <Badge
            variant={
              document.verificationStatus === 'verified' ? 'default' :
              document.verificationStatus === 'rejected' ? 'destructive' :
              'secondary'
            }
          >
            {document.verificationStatus === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
            {document.verificationStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {document.verificationStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {document.verificationStatus.charAt(0).toUpperCase() + document.verificationStatus.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{document.fileName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Uploaded {new Date(document.uploadedAt).toLocaleString()}</span>
          </div>
          <div className="text-muted-foreground">
            Size: {formatFileSize(document.fileSize)}
          </div>
        </div>

        {document.verificationStatus === 'rejected' && document.rejectionReason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejection reason:</strong> {document.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {document.verificationStatus === 'verified' && document.verifiedAt && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Verified on {new Date(document.verifiedAt).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDocument(document)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>

          {document.verificationStatus === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApprove(document)}
                disabled={verifyMutation.isPending}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openRejectDialog(document)}
                disabled={verifyMutation.isPending}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Document Verification</h2>
        <p className="text-muted-foreground">Review and verify doctor credential documents</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingDocuments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{verifiedDocuments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{rejectedDocuments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingDocuments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No pending documents to review</AlertDescription>
            </Alert>
          ) : (
            pendingDocuments.map(doc => <DocumentCard key={doc.id} document={doc} />)
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4 mt-4">
          {verifiedDocuments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No verified documents</AlertDescription>
            </Alert>
          ) : (
            verifiedDocuments.map(doc => <DocumentCard key={doc.id} document={doc} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejectedDocuments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No rejected documents</AlertDescription>
            </Alert>
          ) : (
            rejectedDocuments.map(doc => <DocumentCard key={doc.id} document={doc} />)
          )}
        </TabsContent>
      </Tabs>

      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument && getDocumentTypeName(selectedDocument.documentType)}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument?.fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {documentUrl ? (
              <iframe
                src={documentUrl}
                className="w-full h-[600px] border rounded-lg"
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted">
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {documentUrl && (
              <Button asChild>
                <a href={documentUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The doctor will see this message.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Enter rejection reason (e.g., Document is blurry, Missing information, Expired document)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={verifyMutation.isPending || !rejectionReason.trim()}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
