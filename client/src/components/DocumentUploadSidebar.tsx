import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, FileText, Image, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DocumentUploadSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  uploadedAt: string;
}

export function DocumentUploadSidebar({ isOpen, onClose, appointmentId }: DocumentUploadSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Fetch existing documents for this appointment
  const { data: documents = [], isLoading } = useQuery<UploadedDocument[]>({
    queryKey: ["/api/documents", appointmentId],
    enabled: !!appointmentId && isOpen,
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appointmentId', appointmentId.toString());
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", appointmentId] });
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
      setUploadProgress(0);
    },
    onError: (error: any) => {
      console.log('Upload mutation error:', error);
      // Only show toast if error has meaningful content
      if (error && (error.message || error.toString() !== '[object Object]')) {
        toast({
          title: "Upload Failed",
          description: error.message || error.toString() || "Failed to upload document",
          variant: "destructive",
        });
      }
      setUploadProgress(0);
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest('DELETE', `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", appointmentId] });
      toast({
        title: "Document Deleted",
        description: "Document has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = useCallback(async (files: FileList, documentType: string = 'other') => {
    if (!files.length) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Start progress simulation
    setUploadProgress(10);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 15;
      });
    }, 300);

    try {
      for (const file of Array.from(files)) {
        if (!validTypes.includes(file.type)) {
          clearInterval(progressInterval);
          setUploadProgress(0);
          toast({
            title: "Invalid File Type",
            description: "Please upload PDF, image, or text files only.",
            variant: "destructive",
          });
          continue;
        }

        if (file.size > maxSize) {
          clearInterval(progressInterval);
          setUploadProgress(0);
          toast({
            title: "File Too Large",
            description: "Please upload files smaller than 10MB.",
            variant: "destructive",
          });
          continue;
        }

        // Direct fetch approach to avoid React Query mutation issues
        const formData = new FormData();
        formData.append('file', file);
        formData.append('appointmentId', appointmentId.toString());
        formData.append('documentType', documentType);

        // Add comprehensive debugging and use XMLHttpRequest for better error handling
        console.log('Starting upload for file:', file.name, 'size:', file.size);
        
        const xhr = new XMLHttpRequest();
        
        xhr.onload = function() {
          console.log('XHR load event - status:', xhr.status, 'statusText:', xhr.statusText);
          console.log('Response headers:', xhr.getAllResponseHeaders());
          console.log('Response text:', xhr.responseText);
          console.log('Response type:', xhr.responseType);
          console.log('Ready state:', xhr.readyState);
          
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('Upload successful:', result);
              
              // Clear progress and show success
              clearInterval(progressInterval);
              setUploadProgress(100);
              
              // Refresh documents list (non-blocking)
              queryClient.invalidateQueries({ queryKey: ["/api/documents", appointmentId] }).catch(() => {});
              
              // Show success toast
              toast({
                title: "Document Uploaded",
                description: "Your document has been uploaded successfully.",
              });
              
              setTimeout(() => setUploadProgress(0), 1000);
            } catch (parseError) {
              console.log('JSON parse error:', parseError);
              clearInterval(progressInterval);
              setUploadProgress(0);
              toast({
                title: "Upload Error",
                description: "Server response could not be parsed",
                variant: "destructive",
              });
            }
          } else {
            console.log('Upload failed with status:', xhr.status);
            clearInterval(progressInterval);
            setUploadProgress(0);
            toast({
              title: "Upload Failed",
              description: `Server error: ${xhr.status}`,
              variant: "destructive",
            });
          }
        };
        
        xhr.onerror = function() {
          console.log('XHR error event occurred');
          console.log('Error status:', xhr.status, 'statusText:', xhr.statusText);
          console.log('Error response:', xhr.responseText);
          console.log('Error ready state:', xhr.readyState);
          console.log('Network error details:', xhr);
          
          clearInterval(progressInterval);
          setUploadProgress(0);
          toast({
            title: "Network Error",
            description: "Unable to upload document - please check your connection",
            variant: "destructive",
          });
        };
        
        xhr.onabort = function() {
          console.log('XHR abort event occurred');
          clearInterval(progressInterval);
          setUploadProgress(0);
        };
        
        xhr.ontimeout = function() {
          console.log('XHR timeout event occurred');
          clearInterval(progressInterval);
          setUploadProgress(0);
          toast({
            title: "Upload Timeout",
            description: "The upload took too long - please try again",
            variant: "destructive",
          });
        };
        
        // Set timeout
        xhr.timeout = 30000; // 30 seconds
        
        // Open and send request
        xhr.open('POST', '/api/documents/upload');
        xhr.send(formData);
      }
    } catch (error) {
      console.log('File processing error:', error);
      try {
        clearInterval(progressInterval);
        setUploadProgress(0);
      } catch (cleanupError) {
        console.log('Cleanup error (non-critical):', cleanupError);
      }
    }
  }, [appointmentId, queryClient, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      medical_report: 'Medical Report',
      prescription: 'Prescription',
      insurance: 'Insurance Card',
      lab_results: 'Lab Results',
      other: 'Other'
    };
    return types[type] || 'Other';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </SheetTitle>
          <SheetDescription>
            Upload medical documents, prescriptions, or insurance cards for your consultation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
              uploadDocumentMutation.isPending && "pointer-events-none opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">
              {dragOver ? "Drop files here" : "Upload Documents"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop files here, or click to select
            </p>
            
            <div className="space-y-3">
              <Button 
                type="button" 
                disabled={uploadDocumentMutation.isPending}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.jpg,.jpeg,.png,.gif,.txt';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFileUpload(files);
                  };
                  input.click();
                }}
              >
                Choose Files
              </Button>
              
              <p className="text-xs text-gray-500">
                Supported formats: PDF, JPG, PNG, GIF, TXT (max 10MB each)
              </p>
            </div>

            {(uploadDocumentMutation.isPending || uploadProgress > 0) && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Document Type Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.jpg,.jpeg,.png';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) handleFileUpload(files, 'medical_report');
                };
                input.click();
              }}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Medical Report</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.jpg,.jpeg,.png';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) handleFileUpload(files, 'prescription');
                };
                input.click();
              }}
            >
              <File className="h-6 w-6" />
              <span className="text-sm">Prescription</span>
            </Button>
          </div>

          {/* Uploaded Documents */}
          <div>
            <h3 className="text-lg font-medium mb-4">
              Uploaded Documents ({documents.length})
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getFileIcon(doc.fileType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.fileName}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Badge variant="secondary" className="text-xs">
                          {getDocumentTypeLabel(doc.documentType)}
                        </Badge>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocumentMutation.mutate(doc.id)}
                      disabled={deleteDocumentMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload documents to help your doctor prepare for the consultation</p>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Upload Guidelines</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload recent medical reports or test results</li>
                  <li>• Include current prescription medications</li>
                  <li>• Insurance cards help verify coverage</li>
                  <li>• All documents are encrypted and secure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}