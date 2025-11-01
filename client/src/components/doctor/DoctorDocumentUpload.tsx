import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';

type DocumentType = 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung';

interface DocumentUploadProps {
  documentType: DocumentType;
  title: string;
  description: string;
  required?: boolean;
  existingDocument?: {
    id: string;
    fileName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    uploadedAt: string;
    rejectionReason?: string;
  };
  onUploadSuccess?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

export function DoctorDocumentUpload({
  documentType,
  title,
  description,
  required = false,
  existingDocument,
  onUploadSuccess
}: DocumentUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      // Simulate upload progress
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      try {
        const response = await apiRequest<{
          message: string;
          document: {
            id: string;
            documentType: string;
            fileName: string;
            fileSize: number;
            uploadedAt: string;
            verificationStatus: string;
          };
        }>('/api/doctor-documents/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        return response;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload successful',
        description: `${selectedFile?.name} has been uploaded and is pending verification.`,
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);

      queryClient.invalidateQueries({ queryKey: ['doctor-documents'] });
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
      setUploadProgress(0);
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false,
    disabled: uploadMutation.isPending
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending Review</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {required && <Badge variant="outline" className="text-xs">Required</Badge>}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {existingDocument && getStatusBadge(existingDocument.verificationStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Document Info */}
        {existingDocument && (
          <Alert className={
            existingDocument.verificationStatus === 'verified' ? 'border-green-500 bg-green-50' :
            existingDocument.verificationStatus === 'rejected' ? 'border-red-500 bg-red-50' :
            'border-blue-500 bg-blue-50'
          }>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{existingDocument.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(existingDocument.uploadedAt).toLocaleDateString()}
                </p>
                {existingDocument.verificationStatus === 'rejected' && existingDocument.rejectionReason && (
                  <p className="text-sm text-red-600 mt-2">
                    <strong>Rejection reason:</strong> {existingDocument.rejectionReason}
                  </p>
                )}
                {existingDocument.verificationStatus === 'verified' && (
                  <p className="text-sm text-green-600 mt-2">
                    This document has been verified by our admin team.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        {!uploadMutation.isPending && !selectedFile && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${existingDocument ? 'mt-4' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm font-medium">Drop the file here...</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, JPG, PNG (max 10MB)
                </p>
              </>
            )}
          </div>
        )}

        {/* Selected File Preview */}
        {selectedFile && !uploadMutation.isPending && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-10 h-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-gray-50"
                />
              </div>
            )}

            {/* Upload Button */}
            <Button onClick={handleUpload} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {uploadMutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Uploading {selectedFile?.name}...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Replace Existing Document Info */}
        {existingDocument && !selectedFile && !uploadMutation.isPending && (
          <p className="text-xs text-muted-foreground text-center">
            Upload a new file to replace the existing document
          </p>
        )}
      </CardContent>
    </Card>
  );
}
